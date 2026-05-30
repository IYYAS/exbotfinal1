import json
import logging
import os
import io
import requests
import subprocess
from django.shortcuts import redirect
from django.http import HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import (
    Contact, WhatsAppMessageLog, WhatsAppTemplate, 
    VendorSettings
)
from .serializers import (
    ContactSerializer, WhatsAppMessageLogSerializer, 
    WhatsAppTemplateSerializer, VendorSettingsSerializer
)
from .client import WhatsAppClient

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# WEBHOOK (GET = verify, POST = receive events)
# ─────────────────────────────────────────────────────────────
@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    def get(self, request, *args, **kwargs):
        mode      = request.GET.get('hub.mode')
        token     = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')
        verify_token = getattr(settings, 'WHATSAPP_VERIFY_TOKEN', 'service-whatsapp-token')

        print(f"\n🔐 WEBHOOK VERIFY: mode={mode}, token_received={token}, token_expected={verify_token}, match={token == verify_token}")

        if mode == 'subscribe' and token == verify_token:
            logger.info("Webhook verified successfully! ✔")
            return HttpResponse(challenge)
        return HttpResponse('Forbidden', status=403)

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            print("\n" + "="*80)
            print("📬 [WEBHOOK EVENT RECEIVED FROM META]")
            print(json.dumps(data, indent=2))
            print("="*80 + "\n")
            logger.info(f"Unified Webhook POST: {json.dumps(data, indent=2)}")

            # Try to identify vendor from phone_number_id in metadata
            vendor = None
            try:
                metadata = data.get('entry', [{}])[0].get('changes', [{}])[0].get('value', {}).get('metadata', {})
                phone_id = metadata.get('phone_number_id')
                print(f"📌 Looking for vendor with phone_id={phone_id}")
                if phone_id:
                    v_settings = VendorSettings.objects.filter(whatsapp_phone_number_id=phone_id).first()
                    if v_settings:
                        vendor = v_settings.vendor
                        print(f"✅ Found vendor: {vendor.name}")
                    else:
                        available = list(VendorSettings.objects.values_list('whatsapp_phone_number_id', flat=True))
                        print(f"❌ Vendor NOT found. Available phone_ids: {available}")
            except Exception as e:
                print(f"❌ Error identifying vendor: {e}")
                logger.warning(f"Could not identify vendor from webhook: {e}")

            entries = data.get('entry', [])
            for entry in entries:
                for change in entry.get('changes', []):
                    value = change.get('value', {})
                    # Incoming messages
                    messages = value.get('messages', [])
                    if messages:
                        print(f"📨 Processing {len(messages)} message(s)")
                    for msg in messages:
                        self.handle_whatsapp_message(msg, vendor)
                    # Status updates
                    statuses = value.get('statuses', [])
                    if statuses:
                        print(f"📊 Processing {len(statuses)} status update(s)")
                    for st in statuses:
                        WhatsAppMessageLog.objects.filter(wamid=st.get('id')).update(status=st.get('status', 'unknown'))

            return HttpResponse('EVENT_RECEIVED', status=200)
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return HttpResponse('Error', status=500)

    def handle_whatsapp_message(self, msg, vendor):
        wa_id = msg.get('from', '')
        msg_type = msg.get('type', 'text')
        msg_id = msg.get('id', '')
        print(f"\n🔄 Message from {wa_id}, type={msg_type}, id={msg_id}, vendor={vendor.name if vendor else 'NONE'}")
        
        # Determine sender name if present
        first_name = "WhatsApp User"
        try:
            profile = msg.get('contacts', [{}])[0].get('profile', {})
            first_name = profile.get('name', 'WhatsApp User')
        except Exception:
            pass

        contact, created = Contact.objects.get_or_create(
            vendor=vendor, 
            wa_id=wa_id, 
            defaults={'platform': 'whatsapp', 'first_name': first_name}
        )
        if not created and first_name != "WhatsApp User" and contact.first_name != first_name:
            contact.first_name = first_name
            contact.save()
            
        msg_type = msg.get('type', 'text')
        
        # Extract message body based on type
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
            loc = msg.get('location', {})
            latitude  = loc.get('latitude')
            longitude = loc.get('longitude')
            name      = loc.get('name', '')
            address   = loc.get('address', '')

            if name and address:
                msg_body = f"📍 {name} — {address}"
            elif name:
                msg_body = f"📍 {name}"
            elif latitude and longitude:
                msg_body = f"📍 Location ({latitude}, {longitude})"
            else:
                msg_body = "📍 Location shared"
        elif msg_type in ['image', 'video', 'document', 'audio', 'voice', 'sticker']:
            media_obj = msg.get(msg_type, {})
            media_id = media_obj.get('id')
            msg_body = media_obj.get('caption', f"[{msg_type.upper()} ATTACHMENT]")
            
            # Download file from Meta if credentials configured
            if media_id and vendor:
                try:
                    client = WhatsAppClient(vendor=vendor)
                    media_meta = client.get_media_url(media_id)
                    media_url = media_meta.get('url')
                    if media_url:
                        import requests
                        headers = {"Authorization": f"Bearer {client.access_token}"}
                        dl_res = requests.get(media_url, headers=headers)
                        if dl_res.ok:
                            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
                            
                            import mimetypes
                            content_type = dl_res.headers.get('Content-Type', '').split(';')[0].strip()
                            ext = mimetypes.guess_extension(content_type)
                            if ext:
                                ext = ext.lstrip('.')
                            if not ext or ext == 'bin':
                                if 'image' in content_type:
                                    ext = 'jpg'
                                elif 'video' in content_type:
                                    ext = 'mp4'
                                elif 'audio' in content_type or 'ogg' in content_type:
                                    ext = 'ogg'
                                elif 'webp' in content_type or msg_type == 'sticker':
                                    ext = 'webp'
                                else:
                                    ext = 'pdf'
                                    
                            filename = f"incoming_{timestamp}_{media_id}.{ext}"
                            rel_path = os.path.join('whatsapp', 'uploads', filename)
                            save_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                            os.makedirs(os.path.dirname(save_path), exist_ok=True)
                            with open(save_path, 'wb') as f:
                                f.write(dl_res.content)
                            attachment_path = rel_path.replace('\\', '/')
                except Exception as ex:
                    logger.error(f"Error downloading media: {ex}")

        WhatsAppMessageLog.objects.create(
            vendor=vendor, 
            contact=contact, 
            contact_wa_id=wa_id,
            wamid=msg.get('id'), 
            is_incoming=True, 
            status='received',
            message_body=msg_body, 
            message_type=msg_type, 
            platform='whatsapp',
            attachment=attachment_path,
            data=msg
        )
        
        # Update contact last activity
        contact.unread_messages_count += 1
        contact.last_messaged_at = timezone.now()
        contact.save()

# ─────────────────────────────────────────────────────────────
# CRM VIEWS (Contacts, Messages, Sending, Settings)
# ─────────────────────────────────────────────────────────────
class SettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = getattr(request.user, 'vendor', None)
        obj = VendorSettings.objects.filter(vendor=vendor).first() if vendor else None
        
        if not obj:
            return Response({
                'whatsapp_access_token': '',
                'whatsapp_phone_number_id': '',
                'whatsapp_business_account_id': '',
                'whatsapp_app_id': '',
            })
        data = VendorSettingsSerializer(obj).data
        return Response(data)
        
    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
            
        obj = VendorSettings.objects.filter(vendor=vendor).first()
        if not obj:
            obj = VendorSettings.objects.create(vendor=vendor)
        
        serializer = VendorSettingsSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class TestConnectionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
        
        access_token = request.data.get('whatsapp_access_token')
        phone_id = request.data.get('whatsapp_phone_number_id')
        waba_id = request.data.get('whatsapp_business_account_id')

        if access_token and phone_id and waba_id:
            client = WhatsAppClient(
                access_token=access_token,
                phone_number_id=phone_id,
                waba_id=waba_id
            )
        else:
            client = WhatsAppClient(vendor=vendor)
        
        result = client.get_permissions()
        
        if "error" in result:
            return Response({
                "success": False,
                "error": result.get("error")
            }, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({
            "success": True,
            "message": "Connection verified successfully!"
        })

class AccountStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({"error": "No vendor associated"}, status=400)
            
        client = WhatsAppClient(vendor=vendor)
        if not client.waba_id:
            return Response({"error": "Account not configured"}, status=400)
            
        phone_result = client.get_phone_numbers()
        if "error" in phone_result:
            return Response({"success": False, "error": phone_result.get("error")}, status=400)
            
        # Dynamically auto-save first verified/approved phone number ID into VendorSettings
        phone_list = phone_result.get("data", [])
        if phone_list:
            first_phone_id = phone_list[0].get("id")
            settings_obj = VendorSettings.objects.filter(vendor=vendor).first()
            if settings_obj and settings_obj.whatsapp_phone_number_id != first_phone_id:
                settings_obj.whatsapp_phone_number_id = first_phone_id
                settings_obj.save()
                logger.info(f"Auto-saved first active WhatsApp Phone ID {first_phone_id} to settings database.")

        waba_details = client.get_waba_details()
        if "error" in waba_details:
            waba_details = {}
            
        subscribed_apps = client.get_subscribed_apps().get("data", [])
        webhooks_subscribed = any(app.get('whatsapp_business_api_data') for app in subscribed_apps) if subscribed_apps else False

        permissions_data = client.get_permissions().get("data", [])
        permissions = [p.get("permission") for p in permissions_data if p.get("status") == "granted"]

        return Response({
            "success": True,
            "business_account_id": client.waba_id,
            "account_name": waba_details.get("name", "Unknown Business"),
            "timezone": waba_details.get("timezone_id", ""),
            "currency": waba_details.get("currency", ""),
            "webhooks_subscribed": webhooks_subscribed,
            "phone_numbers": phone_list,
            "permissions": permissions
        })

class ContactListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        contacts = Contact.objects.filter(vendor=request.user.vendor).order_by('-last_messaged_at', '-created_at')
        return Response(ContactSerializer(contacts, many=True).data)

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vendor=request.user.vendor)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class ContactDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, vendor):
        try:
            return Contact.objects.get(pk=pk, vendor=vendor)
        except Contact.DoesNotExist:
            return None

    def put(self, request, pk):
        contact = self.get_object(pk, request.user.vendor)
        if not contact: 
            return Response(status=404)
        serializer = ContactSerializer(contact, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        contact = self.get_object(pk, request.user.vendor)
        if not contact: 
            return Response(status=404)
        contact.delete()
        return Response(status=204)

class MessageListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wa_id = request.query_params.get('contact')
        qs = WhatsAppMessageLog.objects.filter(vendor=request.user.vendor).order_by('-messaged_at')
        if wa_id: 
            qs = qs.filter(contact_wa_id=wa_id)
            Contact.objects.filter(vendor=request.user.vendor, wa_id=wa_id).update(unread_messages_count=0)
        return Response(WhatsAppMessageLogSerializer(qs[:100], many=True).data)

class TemplateSyncAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = request.user.vendor
        client = WhatsAppClient(vendor=vendor)
        result = client.get_templates()
        if "error" in result: 
            return Response(result, status=status.HTTP_502_BAD_GATEWAY)
        
        synced_count = 0
        for t_data in result.get('data', []):
            WhatsAppTemplate.objects.update_or_create(
                vendor=vendor,
                name=t_data.get('name'),
                defaults={
                    'language': t_data.get('language'), 
                    'category': t_data.get('category'),
                    'status': t_data.get('status'), 
                    'data': t_data,
                }
            )
            synced_count += 1
        return Response({"success": True, "count": synced_count})


class TemplateCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = request.user.vendor
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
            
        client = WhatsAppClient(vendor=vendor)
        result = client.create_template(request.data)

        
        if "error" in result:
            return Response({
                "success": False, 
                "error": result.get("error")
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Automatically cache/save locally in DB on successful creation
        try:
            WhatsAppTemplate.objects.update_or_create(
                vendor=vendor,
                name=request.data.get('name'),
                defaults={
                    'language': request.data.get('language'), 
                    'category': request.data.get('category'),
                    'status': result.get('status', 'PENDING'), 
                    'data': request.data,
                }
            )
        except Exception as e:
            logger.warning(f"Could not auto-save created template to DB: {e}")

        return Response({
            "success": True, 
            "data": result,
            "request_data": request.data,
            
        }, status=status.HTTP_201_CREATED)






class TemplateDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, template_name):
        print("request.data:",request.data)
        print("template_name:",template_name)
        vendor = request.user.vendor
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
            
        client = WhatsAppClient(vendor=vendor)
        result = client.delete_template(template_name)
        
        if "error" in result:
            return Response({
                "success": False, 
                "error": result.get("error")
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            WhatsAppTemplate.objects.filter(vendor=vendor, name=template_name).delete()
        except Exception as e:
            logger.warning(f"Could not auto-delete template from DB: {e}")

        return Response({
            "success": True, 
            "data": result
        }, status=status.HTTP_200_OK)

class MediaUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)

        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        filename = f"{timestamp}_{file_obj.name}"
        rel_path = os.path.join('whatsapp', 'uploads', filename)
        save_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        local_url = f"{settings.MEDIA_URL}{rel_path.replace(os.sep, '/')}"
        client = WhatsAppClient(vendor=request.user.vendor)

        try:
            upload_path = save_path
            upload_filename = filename
            upload_mime = file_obj.content_type

            # ✅ Always convert voice recordings to real ogg/opus for Meta
            if 'audio' in file_obj.content_type or 'video/webm' in file_obj.content_type:
                ogg_filename = filename.rsplit('.', 1)[0] + '.ogg'
                ogg_rel_path = os.path.join('whatsapp', 'uploads', ogg_filename)
                ogg_save_path = os.path.join(settings.MEDIA_ROOT, ogg_rel_path)

                try:
                    result = subprocess.run([
                        'ffmpeg', '-y',
                        '-i', save_path,
                        '-c:a', 'libopus',
                        '-b:a', '64k',
                        '-vn',  # no video
                        ogg_save_path
                    ], capture_output=True, timeout=30)

                    if result.returncode == 0:
                        upload_path = ogg_save_path
                        upload_filename = ogg_filename
                        upload_mime = 'audio/ogg'
                        local_url = f"{settings.MEDIA_URL}{ogg_rel_path.replace(os.sep, '/')}"
                    else:
                        print(f'ffmpeg error: {result.stderr.decode()}')

                except Exception as conv_err:
                    print(f'Conversion failed: {conv_err}')

            with open(upload_path, 'rb') as f:
                meta_result = client.upload_media(f.read(), upload_filename, upload_mime)

            media_id = meta_result.get('id')
            return Response({
                'success': True,
                'media_id': media_id,
                'local_url': local_url,
                'mime_type': upload_mime,
                'meta_error': meta_result if not media_id else None
            })

        except Exception as e:
            return Response({
                'success': True,
                'media_id': None,
                'local_url': local_url,
                'mime_type': file_obj.content_type,
                'meta_error': str(e)
            })

class TemplateListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = WhatsAppTemplate.objects.filter(vendor=request.user.vendor).order_by('name')
        return Response(WhatsAppTemplateSerializer(templates, many=True).data)

class SendMessageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'error': 'No vendor account associated with this user.'}, status=403)
        print("SendMessageAPIView request data:", request.data)

        to_id = request.data.get('to_number')
        body = request.data.get('body', '')
        platform = request.data.get('platform', 'whatsapp')
        reply_to_message_id = request.data.get('reply_to_message_id')
        preview_url = request.data.get('preview_url', False)
        
        if not to_id:
            return Response({'error': 'recipient ID is required'}, status=400)

        msg_type = request.data.get('type', 'text')
        
        client = WhatsAppClient(vendor=vendor)
        
        # Check if template or regular or media message
        template_name = request.data.get('template_name')
        media_id = request.data.get('media_id')
        media_url = request.data.get('media_url')
        voice = request.data.get('voice', False)
        filename = request.data.get('filename')
        
        if template_name:
            language_code = request.data.get('language_code', 'en_US')
            components = request.data.get('components')
            
            # Pre-check: warn if template is not APPROVED locally
            local_template = WhatsAppTemplate.objects.filter(
                vendor=vendor, name=template_name
            ).first()
            if local_template and local_template.status and local_template.status.upper() != 'APPROVED':
                return Response({
                    'success': False,
                    'error': f'Template "{template_name}" has status "{local_template.status}" — only APPROVED templates can be sent. Please wait for Meta approval or sync templates.',
                }, status=400)
            
            result = client.send_template_message(to_id, template_name, language_code, components=components, reply_to_message_id=reply_to_message_id)
            msg_type = 'template'
            body = f"Template: {template_name}"
        elif msg_type == 'contacts':
            contacts_data = request.data.get('contacts', [])
            result = client.send_contacts(to_id, contacts_data, reply_to_message_id=reply_to_message_id)
            msg_type = 'contacts'
            names = [c.get('name', {}).get('formatted_name', '') for c in contacts_data]
            names_str = ', '.join([n for n in names if n])
            body = f"📇 Contact Card: {names_str}" if names_str else "📇 Contact Card"
        elif media_id or media_url:
            result = client.send_media_message(to_id, msg_type, media_id=media_id, media_url=media_url, caption=body, reply_to_message_id=reply_to_message_id, voice=voice, filename=filename)
        else:
            result = client.send_message(to_id, body, reply_to_message_id=reply_to_message_id, preview_url=preview_url)
            
        contact, _ = Contact.objects.get_or_create(
            vendor=vendor, 
            wa_id=to_id, 
            defaults={'platform': 'whatsapp', 'first_name': 'New Contact'}
        )
        
        # Logging message log
        log_data = result.copy() if isinstance(result, dict) else {}
        if reply_to_message_id:
            log_data['reply_to_message_id'] = reply_to_message_id

        # Determine attachment value
        local_url = request.data.get('local_url', '')
        attachment_val = None
        if msg_type != 'text':
            if local_url:
                attachment_val = local_url.replace(settings.MEDIA_URL, '')
            elif media_url:
                attachment_val = media_url

        log = WhatsAppMessageLog.objects.create(
            vendor=vendor,
            contact=contact,
            contact_wa_id=to_id,
            is_incoming=False,
            status='pending',
            message_body=body or f"[{msg_type.upper()} ATTACHMENT]",
            message_type=msg_type,
            platform=platform,
            attachment=attachment_val,
            data=log_data
        )

        if 'error' not in result:
            log.status = 'sent'
            messages = result.get('messages', [])
            if messages:
                log.wamid = messages[0].get('id')
            log.save()
            
            contact.last_messaged_at = timezone.now()
            contact.save()
            
            return Response({'success': True, 'log_id': log.id, 'wamid': log.wamid, 'meta_response': result})
        else:
            log.status = 'failed'
            log.save()
            return Response({'success': False, 'error': result.get('error'), 'meta_response': result}, status=400)


class SendTemplateAPIView(APIView):
    """
    Send WhatsApp template messages using correct Meta Cloud API format.
    
    Expected payload:
    {
      "to_number": "919999999999",
      "template": {
        "name": "order_confirmation",
        "language": {
          "code": "en_US"
        },
        "components": []  // Optional: for templates with variables
      }
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'error': 'No vendor account associated with this user.'}, status=403)

        to_number = request.data.get('to_number')
        template_data = request.data.get('template')

        print("\n" + "="*80)
        print("📤 SENDING TEMPLATE - DEBUG INFO")
        print("="*80)
        print(f"To Number: {to_number}")
        print(f"Template Data: {template_data}")
        print(f"Full Request Data: {request.data}")
        print("="*80 + "\n")

        # ✅ COMPREHENSIVE FIELD VALIDATION WITH ERROR MESSAGES
        if not to_number:
            return Response({
                'success': False,
                'error': 'to_number is required',
                'message': 'Missing required field: to_number',
                'details': 'to_number must be a WhatsApp number with country code (e.g., "919876543210")',
                'all_fields': {
                    'to_number': {
                        'type': 'String',
                        'required': True,
                        'description': 'Recipient WhatsApp number with country code',
                        'example': '919876543210',
                        'format': 'Country code + mobile number (no + or spaces)'
                    },
                    'template': {
                        'type': 'Object',
                        'required': True,
                        'description': 'Template configuration',
                        'fields': {
                            'name': {
                                'type': 'String',
                                'required': True,
                                'description': 'Template name',
                                'example': 'hello_world'
                            },
                            'language': {
                                'type': 'Object',
                                'required': False,
                                'default': '{"code": "en_US"}',
                                'description': 'Language configuration',
                                'fields': {
                                    'code': {
                                        'type': 'String',
                                        'description': 'Language code',
                                        'examples': ['en_US', 'hi_IN', 'ar_AR', 'es_ES']
                                    }
                                }
                            },
                            'components': {
                                'type': 'Array',
                                'required': False,
                                'description': 'Template variables and headers',
                                'default': '[] (auto-generated if not provided)',
                                'structure': [
                                    {
                                        'type': 'body',
                                        'parameters': [
                                            {'type': 'text', 'text': 'value1'},
                                            {'type': 'text', 'text': 'value2'}
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                },
                'example': {
                    'to_number': '919876543210',
                    'template': {
                        'name': 'hello_world',
                        'language': {'code': 'en_US'},
                        'components': []
                    }
                }
            }, status=400)

        if not template_data:
            return Response({
                'success': False,
                'error': 'template object is required',
                'message': 'Missing required field: template',
                'details': 'template must be an object with at least "name" field',
                'all_fields': {
                    'to_number': f'String (provided: {to_number})',
                    'template': {
                        'type': 'Object',
                        'required': True,
                        'status': 'MISSING',
                        'required_subfields': {
                            'name': {
                                'type': 'String',
                                'required': True,
                                'description': 'Template name (e.g., "order_confirmation")'
                            },
                            'language': {
                                'type': 'Object',
                                'required': False,
                                'default': '{"code": "en_US"}',
                                'fields': {
                                    'code': 'String (e.g., "en_US", "hi_IN", "ar_AR")'
                                }
                            },
                            'components': {
                                'type': 'Array',
                                'required': False,
                                'default': '[] (auto-generated if not provided)',
                                'description': 'Template variables for body and header',
                                'example_body_params': {
                                    'type': 'body',
                                    'parameters': [
                                        {'type': 'text', 'text': 'John Doe'},
                                        {'type': 'text', 'text': 'Order #12345'},
                                        {'type': 'text', 'text': '$99.99'}
                                    ]
                                },
                                'example_image_header': {
                                    'type': 'header',
                                    'parameters': [
                                        {'type': 'image', 'image': {'link': 'https://example.com/image.jpg'}}
                                    ]
                                }
                            }
                        }
                    }
                },
                'example': {
                    'to_number': to_number,
                    'template': {
                        'name': 'hello_world',
                        'language': {'code': 'en_US'},
                        'components': []
                    }
                }
            }, status=400)

        template_name = template_data.get('name')
        if not template_name:
            return Response({
                'success': False,
                'error': 'template.name is required',
                'message': 'Missing required field: template.name',
                'details': 'template.name must contain the name of your WhatsApp template',
                'received_template_data': template_data,
                'all_fields': {
                    'to_number': f'String (provided: {to_number})',
                    'template': {
                        'type': 'Object',
                        'name': {
                            'type': 'String',
                            'required': True,
                            'status': 'MISSING',
                            'description': 'Template name (e.g., "order_confirmation")',
                            'example': 'order_confirmation'
                        },
                        'language': {
                            'type': 'Object',
                            'required': False,
                            'default': '{"code": "en_US"}',
                            'fields': {
                                'code': {
                                    'type': 'String',
                                    'description': 'Language code',
                                    'examples': ['en_US', 'hi_IN', 'ar_AR', 'es_ES', 'pt_BR', 'fr_FR']
                                }
                            }
                        },
                        'components': {
                            'type': 'Array',
                            'required': False,
                            'default': '[] (auto-generated)',
                            'description': 'Template parameters for variables and headers',
                            'example_with_body_variables': {
                                'type': 'object',
                                'structure': [
                                    {
                                        'type': 'body',
                                        'parameters': [
                                            {'type': 'text', 'text': 'John Doe'},
                                            {'type': 'text', 'text': 'Order #12345'}
                                        ]
                                    }
                                ]
                            },
                            'example_with_image': {
                                'type': 'object',
                                'structure': [
                                    {
                                        'type': 'header',
                                        'parameters': [
                                            {
                                                'type': 'image',
                                                'image': {
                                                    'link': 'https://example.com/image.jpg'
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            'parameter_types': ['text', 'image', 'document', 'video']
                        }
                    }
                },
                'example_minimal': {
                    'to_number': to_number,
                    'template': {
                        'name': 'order_confirmation',
                        'language': {'code': 'en_US'},
                        'components': []
                    }
                },
                'example_with_variables': {
                    'to_number': to_number,
                    'template': {
                        'name': 'order_confirmation',
                        'language': {'code': 'en_US'},
                        'components': [
                            {
                                'type': 'body',
                                'parameters': [
                                    {'type': 'text', 'text': 'John Doe'},
                                    {'type': 'text', 'text': 'Order #12345'},
                                    {'type': 'text', 'text': '$99.99'}
                                ]
                            }
                        ]
                    }
                }
            }, status=400)

        # Pre-check: warn if template is not APPROVED locally
        local_template = WhatsAppTemplate.objects.filter(
            vendor=vendor, name=template_name
        ).first()
        if local_template and local_template.status and local_template.status.upper() != 'APPROVED':
            return Response({
                'success': False,
                'error': f'Template "{template_name}" status is {local_template.status}',
                'message': 'Template is not APPROVED',
                'details': f'Template "{template_name}" has status "{local_template.status}". Only APPROVED templates can be sent.',
                'template_info': {
                    'name': template_name,
                    'current_status': local_template.status,
                    'required_status': 'APPROVED'
                },
                'action': 'Please wait for Meta approval or sync templates using /api/whatsapp/templates/sync/'
            }, status=400)

        # Auto-build components if not provided
        components = template_data.get('components', [])
        
        # If no components provided but template has IMAGE header, add default image
        if not components and local_template:
            template_meta = local_template.data if isinstance(local_template.data, dict) else {}
            template_components = template_meta.get('components', [])
            
            print("\n" + "="*80)
            print("🔍 TEMPLATE AUTO-DETECTION DEBUG")
            print("="*80)
            print(f"Template Name: {template_name}")
            print(f"Local Template Found: {local_template is not None}")
            print(f"Local Template Data Type: {type(local_template.data)}")
            print(f"Local Template Data: {local_template.data}")
            print(f"Template Components: {template_components}")
            print("="*80 + "\n")
            
            # Check if template has IMAGE header (check both 'format' and check structure)
            has_image_header = False
            for comp in template_components:
                print(f"Checking component: {comp}")
                if comp.get('type') == 'header':
                    if comp.get('format') == 'IMAGE' or comp.get('image'):
                        has_image_header = True
                        break
            
            print(f"✅ Has IMAGE Header: {has_image_header}\n")
            
            if has_image_header or 'image' in template_name.lower():
                # Use provided image URL or default
                image_url = request.data.get('image_url', 
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3kstLm9gMpqyvD8xQvozVcovOT3_HhpVSAg&s')
                components = [
                    {
                        "type": "header",
                        "parameters": [
                            {
                                "type": "image",
                                "image": {
                                    "link": image_url
                                }
                            }
                        ]
                    }
                ]
                print(f"✅ Auto-added IMAGE header component with URL: {image_url}\n")

        # Update template_data with components
        template_data['components'] = components

        try:
            client = WhatsAppClient(vendor=vendor)
            
            print("\n" + "="*80)
            print("📤 CALLING CLIENT.SEND_TEMPLATE_MESSAGE")
            print("="*80)
            print(f"Template Name: {template_name}")
            print(f"Language: {template_data.get('language', {}).get('code', 'en_US')}")
            print(f"Components Being Sent: {template_data.get('components')}")
            print(f"Final template_data object: {template_data}")
            print("="*80 + "\n")
            
            result = client.send_template_message(
                to_number, 
                template_name, 
                template_data.get('language', {}).get('code', 'en_US'),
                components=template_data.get('components')  # Now includes auto-built components
            )

            print("\n" + "="*80)
            print("✅ TEMPLATE SEND RESULT")
            print("="*80)
            print(f"Result: {result}")
            print("="*80 + "\n")

            # Get or create contact
            contact, _ = Contact.objects.get_or_create(
                vendor=vendor,
                wa_id=to_number,
                defaults={'platform': 'whatsapp', 'first_name': 'New Contact'}
            )

            # Log message
            log_data = result.copy() if isinstance(result, dict) else {}
            log = WhatsAppMessageLog.objects.create(
                vendor=vendor,
                contact=contact,
                contact_wa_id=to_number,
                is_incoming=False,
                status='pending',
                message_body=f"Template: {template_name}",
                message_type='template',
                platform='whatsapp',
                data=log_data
            )

            if 'error' not in result:
                log.status = 'sent'
                messages = result.get('messages', [])
                if messages:
                    log.wamid = messages[0].get('id')
                log.save()

                contact.last_messaged_at = timezone.now()
                contact.save()

                return Response({
                    'success': True,
                    'log_id': log.id,
                    'wamid': log.wamid,
                    'meta_response': result
                })
            else:
                log.status = 'failed'
                log.save()
                
                error_msg = result.get('error', 'Unknown error from Meta API')
                error_code = result.get('error', {}).get('code') if isinstance(result.get('error'), dict) else 'N/A'
                
                return Response({
                    'success': False,
                    'error': error_msg,
                    'message': 'Failed to send template',
                    'details': f'Meta WhatsApp API returned an error while sending template "{template_name}" to {to_number}',
                    'template_info': {
                        'name': template_name,
                        'recipient': to_number,
                        'language': template_data.get('language', {}).get('code', 'en_US')
                    },
                    'error_details': {
                        'api_error': error_msg,
                        'error_code': error_code
                    },
                    'common_issues': [
                        'Invalid recipient phone number format',
                        'Template does not exist on Meta',
                        'Template has not been approved yet',
                        'Recipient has blocked the business',
                        'Invalid template variables/components provided'
                    ],
                    'meta_response': result
                }, status=400)

        except Exception as e:
            logger.error(f'Template send error: {str(e)}')
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)


class SendReactionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'error': 'No vendor account associated.'}, status=403)

        to_number = request.data.get('to_number')
        message_id = request.data.get('message_id')
        emoji = request.data.get('emoji', '')

        if not to_number or not message_id:
            return Response({'error': 'to_number and message_id are required.'}, status=400)

        client = WhatsAppClient(vendor=vendor)
        result = client.send_reaction(to_number, message_id, emoji)

        if 'error' not in result:
            return Response({'success': True, 'meta_response': result})
        else:
            return Response({'success': False, 'error': result.get('error'), 'meta_response': result}, status=400)

class SendLocationMessageView(APIView):

    def post(self, request):

        to = request.data.get("to")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        name = request.data.get("name")
        address = request.data.get("address")
        reply_to = request.data.get("reply_to")

        vendor = request.user.vendor

        settings_obj = VendorSettings.objects.get(vendor=vendor)

        url = f"https://graph.facebook.com/v23.0/{settings_obj.whatsapp_phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "location",
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "name": name,
                "address": address
            }
        }

        # Reply logic
        if reply_to:
            payload["context"] = {
                "message_id": reply_to
            }

        headers = {
            "Authorization": f"Bearer {settings_obj.whatsapp_access_token}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            url,
            headers=headers,
            json=payload
        )

        return Response(response.json())


