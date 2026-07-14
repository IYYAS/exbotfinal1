import httpx
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class WhatsAppClient:
    """
    A client to interact with the Meta WhatsApp Cloud API.
    Ported from the Laravel WhatsAppApiService.
    """

    def __init__(self, vendor=None, access_token=None, phone_number_id=None, waba_id=None, app_id=None):
        # 1. Initialize with passed-in values or None
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.waba_id = waba_id
        self.app_id = app_id
        
        # 2. If any are missing and vendor is provided, load from VendorSettings
        if vendor and (not self.access_token or not self.phone_number_id or not self.waba_id):
            from .models import VendorSettings
            v_settings = VendorSettings.objects.filter(vendor=vendor).first()
            if v_settings:
                self.access_token = self.access_token or v_settings.whatsapp_access_token
                self.phone_number_id = self.phone_number_id or v_settings.whatsapp_phone_number_id
                self.waba_id = self.waba_id or v_settings.whatsapp_business_account_id
                self.app_id = self.app_id or v_settings.whatsapp_app_id
                print(f"\n{'='*60}")
                print(f"[WhatsAppClient] ✅ Credentials loaded from DB (VendorSettings)")
                print(f"  Vendor         : {vendor}")
                print(f"  WABA ID        : {self.waba_id}")
                print(f"  Phone Number ID: {self.phone_number_id}")
                print(f"  Access Token   : {str(self.access_token)[:30]}... (truncated)")
                print(f"{'='*60}")
            else:
                print(f"\n[WhatsAppClient] ⚠️  No VendorSettings found in DB for vendor: {vendor}")
        
        # 3. Final fallback to global settings
        self.access_token = self.access_token or getattr(settings, 'WHATSAPP_ACCESS_TOKEN', None)
        self.phone_number_id = self.phone_number_id or getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', None)
        self.waba_id = self.waba_id or getattr(settings, 'WHATSAPP_BUSINESS_ACCOUNT_ID', None)
        self.app_id = self.app_id or getattr(settings, 'WHATSAPP_APP_ID', None)

        if not vendor or not v_settings if 'v_settings' in dir() else True:
            print(f"\n{'='*60}")
            print(f"[WhatsAppClient] 🔁 Credentials (after .env fallback)")
            print(f"  WABA ID        : {self.waba_id}")
            print(f"  Phone Number ID: {self.phone_number_id}")
            print(f"  Access Token   : {str(self.access_token)[:30] if self.access_token else 'MISSING ❌'}... ")
            print(f"{'='*60}")

        self.base_url = getattr(settings, 'WHATSAPP_BASE_URL', "https://graph.facebook.com/v20.0/")
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def get_templates(self):
        """Fetch all message templates from Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("GET", f"{self.waba_id}/message_templates", params={"fields": "name,language,status,category,components,rejected_reason"})

    def create_template(self, template_data):
        """Create a new message template in Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("POST", f"{self.waba_id}/message_templates", payload=template_data)

    def delete_template(self, template_name):
        """Delete a message template from Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("DELETE", f"{self.waba_id}/message_templates", params={"name": template_name})


    def get_phone_numbers(self):
        """Fetch all phone numbers attached to the Meta WABA with full metadata."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        fields = "id,display_phone_number,verified_name,quality_rating,status,webhook_configuration"
        return self._make_request("GET", f"{self.waba_id}/phone_numbers", params={"fields": fields})

    def get_waba_details(self):
        """Fetch WABA profile details (name, timezone, etc)."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("GET", f"{self.waba_id}?fields=id,name,currency,timezone_id,message_template_namespace")

    def get_subscribed_apps(self):
        """Fetch apps subscribed to the WABA (Webhooks)."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("GET", f"{self.waba_id}/subscribed_apps")

    def get_permissions(self):
        """Fetch granted permissions for the current access token."""
        return self._make_request("GET", "me/permissions")

    def get_flows(self):
        """Fetch all native WhatsApp flows from Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("GET", f"{self.waba_id}/flows")

    def get_flow_preview(self, flow_id):
        """Fetch preview token for draft flows."""
        return self._make_request("GET", f"{flow_id}", params={"fields": "preview.invalidate(true)"})

    def get_blocked_users(self):
        """Fetch blocked WhatsApp users for this phone number."""
        return self._make_request("GET", f"{self.phone_number_id}/block_users")

    def block_users(self, wa_ids):
        """Block one or more WhatsApp users."""
        payload = {
            "messaging_product": "whatsapp",
            "block_users": [
                {"user": str(wa_id)} for wa_id in wa_ids if wa_id
            ]
        }
        return self._make_request("POST", f"{self.phone_number_id}/block_users", payload=payload)

    def unblock_users(self, wa_ids):
        """Unblock one or more WhatsApp users."""
        payload = {
            "messaging_product": "whatsapp",
            "block_users": [
                {"user": str(wa_id)} for wa_id in wa_ids if wa_id
            ]
        }
        return self._make_request("DELETE", f"{self.phone_number_id}/block_users", payload=payload)

    def upload_media(self, file_content, file_name, file_type):
        """Upload a file to Meta and get a media_id."""
        files = {
            "file": (file_name, file_content, file_type),
            "messaging_product": (None, "whatsapp")
        }
        return self._make_request("POST", f"{self.phone_number_id}/media", files=files)

    def upload_resumable_media(self, file_content, file_type):
        """Upload media using Resumable Upload API for templates (returns header_handle)."""
        if not self.app_id:
            return {"error": "WHATSAPP_APP_ID not configured"}
        
        # Step 1: Create session
        session_url = f"{self.base_url}{self.app_id}/uploads"
        params = {
            "file_length": len(file_content),
            "file_type": file_type
        }
        headers = self.headers.copy()
        
        try:
            res = httpx.post(session_url, headers=headers, params=params)
            res.raise_for_status()
            session_data = res.json()
            session_id = session_data.get('id')
            if not session_id:
                return {"error": f"Failed to get upload session id. Response: {session_data}"}
            
            # Step 2: Upload bytes
            upload_url = f"{self.base_url}{session_id}"
            upload_headers = {
                "Authorization": f"OAuth {self.access_token}",
                "file_offset": "0"
            }
            res_upload = httpx.post(upload_url, headers=upload_headers, content=file_content)
            res_upload.raise_for_status()
            return res_upload.json()
        except httpx.HTTPError as e:
            logger.error(f"Resumable media upload error: {str(e)}")
            return {"error": str(e), "details": getattr(e, 'response', None) and e.response.text}

    def get_media_url(self, media_id):
        """Get the temporary URL to download a media file."""
        return self._make_request("GET", f"{media_id}")

    def send_message(self, to_number, body, reply_to_message_id=None, preview_url=False):
        """Send a simple text message with optional preview_url link preview."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "text",
            "text": {
                "body": body,
                "preview_url": preview_url
            }
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def send_reaction(self, to_number, message_id, emoji):
        """Send an emoji reaction to a specific message."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "reaction",
            "reaction": {
                "message_id": message_id,
                "emoji": emoji
            }
        }
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def send_template_message(self, to_number, template_name, language_code="en_US", components=None, reply_to_message_id=None):
        """Send a template message."""
        template_data = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if components:
            template_data["components"] = components
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "template",
            "template": template_data
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        
        print("\n" + "="*80)
        print("🔥 META WHATSAPP CLOUD API - TEMPLATE PAYLOAD")
        print("="*80)
        print(f"Phone Number ID: {self.phone_number_id}")
        print(f"To Number: {to_number}")
        print(f"Full Payload Being Sent to Meta:")
        import json
        print(json.dumps(payload, indent=2))
        print("="*80 + "\n")
        
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def send_interactive_message(self, to_number, interactive_data, reply_to_message_id=None):
        """Send an interactive message (buttons, lists, etc)."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "interactive",
            "interactive": interactive_data
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def send_cta_url_button(self, to_number, body_text, button_text, button_url, header_text=None, footer_text=None, reply_to_message_id=None):
        """Send a Call-To-Action (CTA) URL button."""
        interactive_data = {
            "type": "cta_url",
            "body": {"text": body_text},
            "action": {
                "name": "cta_url",
                "parameters": {
                    "display_text": button_text,
                    "url": button_url
                }
            }
        }
        if header_text:
            interactive_data["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive_data["footer"] = {"text": footer_text}
            
        return self.send_interactive_message(to_number, interactive_data, reply_to_message_id)

    def send_media_message(self, to_number, media_type, media_url=None, media_id=None, caption=None, reply_to_message_id=None, voice=False, filename=None):
        """Send media (image, video, document, audio) using either a URL or a media_id."""
        media_payload = {"caption": caption} if (caption and media_type != 'audio') else {}
        if media_id:
            media_payload["id"] = media_id
        else:
            media_payload["link"] = media_url

        if media_type == 'sticker':
            media_payload = {"id": media_id} if media_id else {"link": media_url}

        if media_type == 'document' and filename:
            media_payload["filename"] = filename

        if media_type == 'audio' and voice:
            media_payload["voice"] = True

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": media_type,
            media_type: media_payload
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def send_contacts(self, to_number, contacts_data, reply_to_message_id=None):
        """Send one or more contact cards."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "contacts",
            "contacts": contacts_data
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def mark_as_read(self, message_id):
        """Mark a message as read."""
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)

    def _make_request(self, method, endpoint, payload=None, params=None, files=None):
        url = f"{self.base_url}{endpoint}"
        import json

        print(f"\n{'─'*60}")
        print(f"[Meta API Request] {method} → {url}")
        if params:
            print(f"[Query Params] {json.dumps(params, indent=2)}")
        if payload:
            print(f"[Body Payload] {json.dumps(payload, indent=2)}")
        print(f"{'─'*60}")

        headers = self.headers.copy()
        if files:
            headers.pop("Content-Type", None)

        try:
            with httpx.Client() as client:
                response = client.request(
                    method, 
                    url, 
                    json=payload, 
                    params=params, 
                    files=files,
                    headers=headers,
                    timeout=60.0
                )
                print(f"[Meta API Response] Status: {response.status_code}")
                result = response.json()
                print(f"[Meta API Response Data] {json.dumps(result, indent=2)}")
                response.raise_for_status()
                return result
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp API Error: {e.response.text}")
            error_data = e.response.json()
            # Extract inner 'error' to avoid double-nesting (Meta returns {"error": {...}})
            return {"error": error_data.get("error", error_data), "status_code": e.response.status_code}
        except Exception as e:
            logger.error(f"WhatsApp Client Exception: {str(e)}")
            return {"error": str(e)}
