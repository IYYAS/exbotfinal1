import os
import logging
import mimetypes
import requests
from django.conf import settings
from django.utils import timezone
from .bot_flow_processor import BotFlowProcessor
from ..models import Contact, WhatsAppMessageLog
from ..client import WhatsAppClient

logger = logging.getLogger(__name__)


class MessageHandler:
    """
    Handles a single incoming WhatsApp webhook message:
      1. Resolves / creates the Contact record
      2. Extracts message body (text, interactive, media, location, contacts)
      3. Downloads and saves media attachments
      4. Logs the message to WhatsAppMessageLog
      5. Delegates to BotFlowProcessor if the message can trigger a flow

    Replaces WhatsAppWebhookView.handle_whatsapp_message().
    """

    def __init__(self, processor: BotFlowProcessor = None):
        self._processor = processor or BotFlowProcessor()

    def handle(self, msg: dict, vendor, contacts: list[dict] | None = None):
        """Entry point — called once per incoming message dict."""
        wa_id    = msg.get('from', '')
        msg_type = msg.get('type', 'text')
        msg_id   = msg.get('id', '')
        print(f"\n🔄 Message from {wa_id}, type={msg_type}, id={msg_id}, vendor={vendor.name if vendor else 'NONE'}")

        contact = self._resolve_contact(msg, vendor, wa_id, contacts)
        msg_body, attachment_path = self._extract_body_and_attachment(msg, msg_type, vendor)

        # Save the incoming message for the primary vendor
        is_new = self._log_message(msg, vendor, contact, wa_id, msg_type, msg_body, attachment_path)
        print(f"📌 Primary log saved: vendor={vendor.name if vendor else 'NONE'}, contact={contact}, wa_id={wa_id!r}, msg_id={msg_id!r}")
        # Also save the same incoming message for other vendors sharing this phone number
        self._log_message_to_shared_vendors(msg, vendor, wa_id, msg_type, msg_body, attachment_path)
        if not is_new:
            print(f"\u26a0️  Duplicate wamid={msg_id!r} — already logged, skipping bot flow")
            return

        self._update_contact_activity(contact)

        # Trigger bot flow for text and interactive messages only
        if vendor and msg_type in ('text', 'interactive'):
            try:
                self._processor.process(wa_id, msg, vendor, contact)
            except Exception as flow_err:
                print(f"⚠️  Bot flow error: {flow_err}")
                logger.error(f"Bot flow processing error: {flow_err}")

    # ── Private helpers ──────────────────────────────────────────────────────

    def _resolve_contact(self, msg: dict, vendor, wa_id: str, contacts: list[dict] | None = None):
        """Get or create a Contact, updating name if needed from webhook profile data.
        Also ensures the contact is created for ALL vendors sharing the same phone_number_id."""
        print(f"🧩 _resolve_contact payload msg.contacts={msg.get('contacts')} top_contacts={contacts}")
        display_name = self._get_webhook_contact_name(msg, contacts)
        print(f"🧩 extracted display_name={display_name!r}")
        first_name, last_name = self._split_contact_name(display_name or "WhatsApp User")

        # ── 1. Resolve/create contact for the PRIMARY vendor ─────────────────
        contact, created = Contact.objects.get_or_create(
            vendor=vendor,
            wa_id=wa_id,
            defaults={
                'platform': 'whatsapp',
                'first_name': first_name,
                'last_name': last_name,
            }
        )

        if created:
            print(f"✅ Created contact {wa_id} with first_name={first_name!r}, last_name={last_name!r}")
        else:
            print(f"🔄 Resolved existing contact {wa_id} current_name={contact.first_name!r} {contact.last_name!r} webhook_name={display_name!r}")
            if display_name and display_name != "WhatsApp User":
                should_update = (
                    contact.first_name != first_name or
                    contact.last_name != last_name or
                    not contact.first_name or
                    contact.first_name == "WhatsApp User"
                )
                if should_update:
                    contact.first_name = first_name
                    contact.last_name = last_name
                    contact.save(update_fields=['first_name', 'last_name'])
                    print(f"🔄 Updated contact {wa_id} to first_name={first_name!r}, last_name={last_name!r}")

        # ── 2. Sync contact to ALL OTHER vendors sharing the same phone_number_id ──
        try:
            from ..models import VendorSettings, Vendor
            vendor_settings = VendorSettings.objects.filter(vendor=vendor).first()
            if vendor_settings and vendor_settings.whatsapp_phone_number_id:
                sharing_vendors = Vendor.objects.filter(
                    settings__whatsapp_phone_number_id=vendor_settings.whatsapp_phone_number_id
                ).exclude(id=vendor.id)

                for shared_vendor in sharing_vendors:
                    sv_contact, sv_created = Contact.objects.get_or_create(
                        vendor=shared_vendor,
                        wa_id=wa_id,
                        defaults={
                            'platform': 'whatsapp',
                            'first_name': first_name,
                            'last_name': last_name,
                        }
                    )
                    if sv_created:
                        print(f"✅ Created contact {wa_id} for shared vendor '{shared_vendor.name}'")
                    else:
                        # Update name if needed
                        if display_name and display_name != "WhatsApp User":
                            needs_update = (
                                sv_contact.first_name != first_name or
                                sv_contact.last_name != last_name or
                                not sv_contact.first_name or
                                sv_contact.first_name == "WhatsApp User"
                            )
                            if needs_update:
                                sv_contact.first_name = first_name
                                sv_contact.last_name = last_name
                                sv_contact.save(update_fields=['first_name', 'last_name'])
                                print(f"🔄 Synced contact {wa_id} name for shared vendor '{shared_vendor.name}'")
        except Exception as sync_err:
            print(f"⚠️ Shared vendor contact sync error: {sync_err}")

        return contact

    def _get_webhook_contact_name(self, msg: dict, contacts: list[dict] | None = None) -> str | None:
        """Return the display name from webhook message contacts or top-level contacts."""
        try:
            msg_contacts = msg.get('contacts') or []
            if isinstance(msg_contacts, list) and msg_contacts:
                contact_info = msg_contacts[0]
                profile = contact_info.get('profile') or {}
                if isinstance(profile, dict):
                    name = profile.get('name') or profile.get('display_name')
                    if name:
                        return name
                return contact_info.get('name')

            if contacts:
                contact_info = contacts[0]
                profile = contact_info.get('profile') or {}
                if isinstance(profile, dict):
                    name = profile.get('name') or profile.get('display_name')
                    if name:
                        return name
                return contact_info.get('name')
        except Exception as ex:
            print(f"⚠️ _get_webhook_contact_name error: {ex}")
        return None

    def _split_contact_name(self, display_name: str):
        display_name = str(display_name or '').strip()
        if not display_name:
            return "WhatsApp User", None
        parts = display_name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else None
        return first_name, last_name

    def _extract_body_and_attachment(self, msg: dict, msg_type: str, vendor):
        """
        Return (msg_body, attachment_path) for any message type.
        Downloads and saves media files locally when present.
        """
        msg_body = ''
        attachment_path = None

        if msg_type == 'text':
            msg_body = msg.get('text', {}).get('body', '')

        elif msg_type == 'interactive':
            interactive = msg.get('interactive', {})
            int_type = interactive.get('type')
            if int_type == 'button_reply':
                msg_body = interactive.get('button_reply', {}).get('title', '')
            elif int_type == 'list_reply':
                msg_body = interactive.get('list_reply', {}).get('title', '')

        elif msg_type == 'contacts':
            contacts_list = msg.get('contacts', [])
            names = [c.get('name', {}).get('formatted_name', '') for c in contacts_list]
            names_str = ', '.join([n for n in names if n])
            msg_body = f"📇 Contact Card: {names_str}" if names_str else "📇 Contact Card"

        elif msg_type == 'location':
            msg_body = self._format_location(msg.get('location', {}))

        elif msg_type in ('image', 'video', 'document', 'audio', 'voice', 'sticker'):
            media_obj = msg.get(msg_type, {})
            media_id  = media_obj.get('id')
            msg_body  = media_obj.get('caption', f"[{msg_type.upper()} ATTACHMENT]")
            if media_id and vendor:
                attachment_path = self._download_media(media_id, msg_type, vendor)

        return msg_body, attachment_path

    def _format_location(self, loc: dict) -> str:
        """Build a human-readable location string."""
        latitude  = loc.get('latitude')
        longitude = loc.get('longitude')
        name      = loc.get('name', '')
        address   = loc.get('address', '')

        if name and address:
            return f"📍 {name} — {address}"
        if name:
            return f"📍 {name}"
        if latitude and longitude:
            return f"📍 Location ({latitude}, {longitude})"
        return "📍 Location shared"

    def _download_media(self, media_id: str, msg_type: str, vendor) -> str | None:
        """
        Download a media file from Meta, save it locally, and return the
        relative path (or None on failure).
        """
        try:
            client     = WhatsAppClient(vendor=vendor)
            media_meta = client.get_media_url(media_id)
            media_url  = media_meta.get('url')
            if not media_url:
                return None

            headers = {"Authorization": f"Bearer {client.access_token}"}
            dl_res  = requests.get(media_url, headers=headers)
            if not dl_res.ok:
                return None

            ext = self._resolve_extension(dl_res.headers.get('Content-Type', ''), msg_type)
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            filename  = f"incoming_{timestamp}_{media_id}.{ext}"
            rel_path  = os.path.join('whatsapp', 'uploads', filename)
            save_path = os.path.join(settings.MEDIA_ROOT, rel_path)

            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'wb') as f:
                f.write(dl_res.content)

            return rel_path.replace('\\', '/')
        except Exception as ex:
            logger.error(f"Error downloading media: {ex}")
            return None

    def _resolve_extension(self, content_type: str, msg_type: str) -> str:
        """Determine the correct file extension from Content-Type header."""
        raw_ct = content_type.split(';')[0].strip()
        ext    = mimetypes.guess_extension(raw_ct)
        if ext:
            ext = ext.lstrip('.')
        if not ext or ext == 'bin':
            if 'image' in raw_ct:
                ext = 'jpg'
            elif 'video' in raw_ct:
                ext = 'mp4'
            elif 'audio' in raw_ct or 'ogg' in raw_ct:
                ext = 'ogg'
            elif 'webp' in raw_ct or msg_type == 'sticker':
                ext = 'webp'
            else:
                ext = 'pdf'
        return ext

    def _log_message(self, msg: dict, vendor, contact, wa_id: str,
                     msg_type: str, msg_body: str, attachment_path: str | None) -> bool:
        """Persist the incoming message to WhatsAppMessageLog.
        Returns True if a new record was created, False if it was a duplicate."""
        message_id = msg.get('id') or msg.get('message_id')

        if not message_id:
            # Some webhook payloads may omit the message id. In that case,
            # create the log record without deduplication by wamid.
            new_log = WhatsAppMessageLog.objects.create(
                vendor=vendor,
                contact=contact,
                contact_wa_id=wa_id,
                is_incoming=True,
                status='received',
                message_body=msg_body,
                message_type=msg_type,
                platform='whatsapp',
                attachment=attachment_path,
                data={**msg, 'debug_reason': 'missing_message_id'}
            )
            print(
                f"✅ poda Message logged without wamid: vendor={vendor}, contact={contact}, "
                f"wa_id={wa_id!r}, type={msg_type}, body={msg_body!r}, "
                f"log_id={new_log.id}, messaged_at={new_log.messaged_at}"
            )
            return True

        log, created = WhatsAppMessageLog.objects.get_or_create(
            vendor=vendor,
            wamid=message_id,
            defaults=dict(
                contact=contact,
                contact_wa_id=wa_id,
                is_incoming=True,
                status='received',
                message_body=msg_body,
                message_type=msg_type,
                platform='whatsapp',
                attachment=attachment_path,
                data=msg
            )
        )
        if created:
            print(
                f"✅ poda Message logged: vendor={vendor}, contact={contact}, "
                f"wa_id={wa_id!r}, msg_id={message_id!r}, type={msg_type}, "
                f"body={msg_body!r}, payload_ts={msg.get('timestamp')!r}, "
                f"log_id={log.id}, messaged_at={log.messaged_at}"
            )
        else:
            print(
                f"⚠️  Duplicate message skipped: wamid={message_id!r}, "
                f"existing_log_id={log.id}, messaged_at={log.messaged_at}"
            )
        return created

    def _log_message_to_shared_vendors(self, msg: dict, vendor, wa_id: str,
                                       msg_type: str, msg_body: str, attachment_path: str | None):
        """Also save the incoming message for all vendors sharing this phone number."""
        try:
            from ..models import VendorSettings, Vendor
            vendor_settings = VendorSettings.objects.filter(vendor=vendor).first()
            if not vendor_settings or not vendor_settings.whatsapp_phone_number_id:
                return

            shared_vendors = Vendor.objects.filter(
                settings__whatsapp_phone_number_id=vendor_settings.whatsapp_phone_number_id
            ).exclude(id=vendor.id)

            message_id = msg.get('id') or msg.get('message_id')
            for shared_vendor in shared_vendors:
                shared_contact = Contact.objects.filter(vendor=shared_vendor, wa_id=wa_id).first()
                if not shared_contact:
                    continue

                if message_id:
                    shared_log, created = WhatsAppMessageLog.objects.get_or_create(
                        vendor=shared_vendor,
                        wamid=message_id,
                        defaults=dict(
                            contact=shared_contact,
                            contact_wa_id=wa_id,
                            is_incoming=True,
                            status='received',
                            message_body=msg_body,
                            message_type=msg_type,
                            platform='whatsapp',
                            attachment=attachment_path,
                            data=msg
                        )
                    )
                else:
                    shared_log = WhatsAppMessageLog.objects.create(
                        vendor=shared_vendor,
                        contact=shared_contact,
                        contact_wa_id=wa_id,
                        is_incoming=True,
                        status='received',
                        message_body=msg_body,
                        message_type=msg_type,
                        platform='whatsapp',
                        attachment=attachment_path,
                        data={**msg, 'debug_reason': 'missing_message_id_shared_vendor'}
                    )
                    created = True

                if created:
                    print(
                        f"✅ Shared vendor message logged: vendor={shared_vendor}, "
                        f"contact={shared_contact}, wa_id={wa_id!r}, msg_id={message_id!r}, "
                        f"shared_log_id={shared_log.id}"
                    )
        except Exception as ex:
            print(f"⚠️ Shared vendor log error: {ex}")

    def _update_contact_activity(self, contact):
        """Increment unread count and update last activity timestamp."""
        contact.unread_messages_count += 1
        contact.last_messaged_at = timezone.now()
        contact.save()
