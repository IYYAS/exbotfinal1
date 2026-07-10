"""
Django Management Command: run_sequence_scheduler

Runs a background loop that:
1. Checks for pending sequence deliveries that are due
2. For each delivery, checks the contact's last interaction time
3. If within 24h → sends text OR template
4. If outside 24h → sends fallback_template only (WhatsApp rule)
5. If outside 24h and no fallback template → marks as failed

Usage:
    python manage.py run_sequence_scheduler

Keep this running alongside the Django dev server.
"""
import time
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from whatsapp_service.tasks import process_due_sequence_steps

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 30  # Check every 30 seconds
WINDOW_24H_SECONDS = 86400  # 24 hours


class Command(BaseCommand):
    help = 'Run the sequence scheduler — polls for pending sequence subscriptions and sends due messages.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(
            f'🚀 Sequence Scheduler started. Polling every {POLL_INTERVAL_SECONDS}s...'
        ))
        while True:
            try:
                process_due_sequence_steps.run()
            except Exception as e:
                logger.error(f'Scheduler error: {e}', exc_info=True)
                self.stdout.write(self.style.ERROR(f'❌ Scheduler error: {e}'))
            time.sleep(POLL_INTERVAL_SECONDS)

    def _send_delivery(self, delivery):
        from whatsapp_service.models import VendorSettings
        from whatsapp_service.client import WhatsAppClient

        enrollment = delivery.enrollment
        contact = enrollment.contact
        vendor = enrollment.vendor
        flow = enrollment.flow
        node_id = delivery.node_id
        wa_id = contact.wa_id

        # ── Read the send_message_after node data from the Flow JSON ──────────
        flow_data = flow.flow_data or {}
        nodes_list = flow_data.get('nodes', []) if isinstance(flow_data.get('nodes'), list) else []
        nodes_dict = flow_data.get('nodes', {}) if isinstance(flow_data.get('nodes'), dict) else {}

        msg = None
        for n in nodes_list:
            if str(n.get('id')) == str(node_id):
                msg = n.get('data', {})
                break
        if not msg and node_id in nodes_dict:
            nd = nodes_dict[node_id]
            msg = nd.get('data', nd) if isinstance(nd, dict) else {}

        if not msg:
            delivery.status = 'failed'
            delivery.error_message = f'Node {node_id} not found in flow {flow.id}'
            delivery.save()
            self.stdout.write(self.style.ERROR(f'  ❌ Node {node_id} not found'))
            return

        # ── Load vendor credentials ────────────────────────────────────────────
        try:
            settings_obj = VendorSettings.objects.get(vendor=vendor)
            token = settings_obj.whatsapp_access_token
            phone_number_id = settings_obj.whatsapp_phone_number_id
        except VendorSettings.DoesNotExist:
            delivery.status = 'failed'
            delivery.error_message = 'Vendor WhatsApp settings not found.'
            delivery.save()
            return

        client = WhatsAppClient(token=token, phone_number_id=phone_number_id)

        # ── 24-Hour Window Check ───────────────────────────────────────────────
        now = timezone.now()
        last_interaction = contact.last_messaged_at  # set whenever contact sends a message
        within_24h = (
            last_interaction is not None
            and (now - last_interaction).total_seconds() < WINDOW_24H_SECONDS
        )

        message_type = msg.get('message_type', 'text')
        text_body = msg.get('text_body', '')
        template_name = msg.get('template_name', '')
        template_lang = msg.get('template_language', 'en_US')
        fallback_template = msg.get('fallback_template_name', '')

        try:
            if within_24h:
                # ✅ Within 24h — send as configured (text or template)
                if message_type == 'text' and text_body:
                    client.send_message(wa_id, text_body)
                    self.stdout.write(f'  ✅ [24h] Sent text to {wa_id}: {text_body[:50]}')
                elif message_type == 'template' and template_name:
                    client.send_template_message(wa_id, template_name, template_lang)
                    self.stdout.write(f'  ✅ [24h] Sent template "{template_name}" to {wa_id}')
                else:
                    delivery.status = 'failed'
                    delivery.error_message = 'No message content configured.'
                    delivery.save()
                    self.stdout.write(self.style.WARNING(f'  ⚠️  No content for node {node_id}'))
                    return

            else:
                # ⛔ Outside 24h — MUST use a template
                # Prefer fallback_template, then fall back to template_name if it's a template type
                tpl = fallback_template or (template_name if message_type == 'template' else '')

                if tpl:
                    client.send_template_message(wa_id, tpl, template_lang)
                    self.stdout.write(f'  ✅ [OUTSIDE 24h] Sent fallback template "{tpl}" to {wa_id}')
                else:
                    delivery.status = 'failed'
                    delivery.error_message = (
                        'Contact is outside 24h window and no fallback template is configured. '
                        'Cannot send non-template messages outside the 24h window.'
                    )
                    delivery.save()
                    self.stdout.write(self.style.WARNING(
                        f'  ⚠️  [OUTSIDE 24h] No fallback template for node {node_id} — skipped'
                    ))
                    return

            # ── Mark as sent ────────────────────────────────────────────────────
            delivery.status = 'sent'
            delivery.sent_at = timezone.now()
            delivery.save()

            pending_remaining = enrollment.deliveries.filter(status='pending').count()
            if pending_remaining == 0:
                enrollment.status = 'completed'
                enrollment.save()
                self.stdout.write(f'  🎉 Enrollment completed for {wa_id}')

        except Exception as e:
            delivery.status = 'failed'
            delivery.error_message = str(e)
            delivery.save()
            self.stdout.write(self.style.ERROR(f'  ❌ Failed to send to {wa_id}: {e}'))
