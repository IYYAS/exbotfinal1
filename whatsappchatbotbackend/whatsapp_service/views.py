import json
import logging
import os
import io
import requests
import subprocess
from urllib.parse import quote
from django.shortcuts import redirect
from django.http import HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from django.utils import timezone
from django.utils.text import get_valid_filename
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import (
    Contact, WhatsAppMessageLog, WhatsAppTemplate,
    VendorSettings, ChatbotFlow,
)
from users.models import Vendor
from .serializers import (
    ContactSerializer, WhatsAppMessageLogSerializer,
    WhatsAppTemplateSerializer, VendorSettingsSerializer
)
from .client import WhatsAppClient
from .flow_engine.engine import FlowEngine
from .flow_engine.bot_flow_processor import BotFlowProcessor
from .flow_engine.message_handler import MessageHandler

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
                    top_level_contacts = value.get('contacts', [])
                    # Incoming messages
                    messages = value.get('messages', [])
                    if messages:
                        print(f"📨 Processing {len(messages)} message(s)")
                    for msg in messages:
                        self.handle_whatsapp_message(msg, vendor, top_level_contacts)
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

    # ── Shared engine instances (one per process) ───────────────────────────
    _flow_engine     = FlowEngine()
    _bot_processor   = BotFlowProcessor(_flow_engine)
    _msg_handler     = MessageHandler(_bot_processor)

    def handle_whatsapp_message(self, msg, vendor, contacts=None):
        """Delegate to MessageHandler. Kept for backward compatibility."""
        self._msg_handler.handle(msg, vendor, contacts)

    def process_bot_flow(self, wa_id, msg, vendor, contact):
        """Delegate to BotFlowProcessor. Kept for backward compatibility."""
        self._bot_processor.process(wa_id, msg, vendor, contact)

    def execute_flow_node(self, client, wa_id, node, vendor, nodes=None, flow=None):
        """Delegate to FlowEngine. Kept for backward compatibility."""
        self._flow_engine.execute_node(client, wa_id, node, vendor, nodes, flow)


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

class ContactListAPIView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContactSerializer

    def get_queryset(self):
        search_query = self.request.query_params.get('search', '').strip()
        unread_filter = self.request.query_params.get('unread', '').strip().lower()
        blocked_filter = self.request.query_params.get('blocked', '').strip().lower()
        queryset = Contact.objects.filter(vendor=self.request.user.vendor)

        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(wa_id__icontains=search_query) |
                Q(labels__name__icontains=search_query)
            ).distinct()

        if unread_filter in ('1', 'true', 'yes'):
            queryset = queryset.filter(unread_messages_count__gt=0)

        if blocked_filter in ('1', 'true', 'yes'):
            client = WhatsAppClient(vendor=self.request.user.vendor)
            result = client.get_blocked_users()
            blocked_ids = []
            if 'error' in result:
                logger.warning('Unable to fetch blocked users for contact filter: %s', result.get('error'))
            else:
                blocked_ids = [str(item.get('user')) for item in result.get('data', []) if item.get('user')]
            queryset = queryset.filter(wa_id__in=blocked_ids)

        return queryset.order_by('-last_messaged_at', '-created_at')

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

class ContactDetailAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContactSerializer

    def get_queryset(self):
        return Contact.objects.filter(vendor=self.request.user.vendor)

class MessageListAPIView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WhatsAppMessageLogSerializer

    def get_queryset(self):
        wa_id = self.request.query_params.get('contact')
        queryset = WhatsAppMessageLog.objects.filter(vendor=self.request.user.vendor).order_by('-messaged_at')
        if wa_id:
            queryset = queryset.filter(contact_wa_id=wa_id)
        return queryset

    def list(self, request, *args, **kwargs):
        wa_id = request.query_params.get('contact')
        if wa_id:
            Contact.objects.filter(vendor=request.user.vendor, wa_id=wa_id).update(unread_messages_count=0)
        queryset = self.filter_queryset(self.get_queryset())[:100]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

class MessageDetailAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WhatsAppMessageLogSerializer

    def get_queryset(self):
        return WhatsAppMessageLog.objects.filter(vendor=self.request.user.vendor)

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
        safe_filename = get_valid_filename(file_obj.name)
        safe_filename = safe_filename.replace(' ', '_')
        filename = f"{timestamp}_{safe_filename}"
        rel_path = os.path.join('whatsapp', 'uploads', filename)
        save_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        base_url = getattr(settings, 'NGROK_URL', request.build_absolute_uri('/'))
        base_url = base_url.rstrip('/')
        local_url = f"{base_url}{settings.MEDIA_URL}{quote(rel_path.replace(os.sep, '/'))}"
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
                        local_url = f"{base_url}{settings.MEDIA_URL}{quote(ogg_rel_path.replace(os.sep, '/'))}"
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

class TemplateMediaUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)
            
        try:
            client = WhatsAppClient(vendor=request.user.vendor)
            
            # Read file directly into memory for resumable upload
            file_content = file_obj.read()
            mime_type = file_obj.content_type
            
            meta_result = client.upload_resumable_media(file_content, mime_type)
            
            if 'error' in meta_result:
                return Response(meta_result, status=400)
                
            handle = meta_result.get('h')
            if not handle:
                return Response({'error': 'No header_handle returned from Meta', 'details': meta_result}, status=400)
                
            return Response({
                'success': True,
                'header_handle': handle
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

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
        print(f"SendMessageAPIView: user={request.user} vendor={vendor} to={request.data.get('to_number')} type={request.data.get('type', 'text')} body={request.data.get('body', '')!r}")

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
                normalized_local_url = local_url.strip()
                # Preserve full URLs and avoid accidental path trimming.
                if normalized_local_url.startswith('http'):
                    attachment_val = normalized_local_url
                else:
                    attachment_val = normalized_local_url.replace(settings.MEDIA_URL, '')
            elif media_url:
                attachment_val = media_url

        if msg_type != 'text':
            message_body = body.strip() if isinstance(body, str) else ''
        else:
            message_body = body

        log = WhatsAppMessageLog.objects.create(
            vendor=vendor,
            contact=contact,
            contact_wa_id=to_id,
            is_incoming=False,
            status='pending',
            message_body=message_body,
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
                'error': 'to_number is required'
            }, status=400)

        if not template_data:
            return Response({
                'success': False,
                'error': 'template object is required'
            }, status=400)

        template_name = template_data.get('name')
        if not template_name:
            return Response({
                'success': False,
                'error': 'template.name is required'
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
        components = template_data.get('components') or []
        
        # If no components are provided but the local template expects an IMAGE header,
        # require an image_url or let the caller explicitly provide the header component.
        if not components and local_template:
            template_meta = local_template.data if isinstance(local_template.data, dict) else {}
            template_components = template_meta.get('components', []) if isinstance(template_meta.get('components', []), list) else []
            
            print("\n" + "="*80)
            print("🔍 TEMPLATE AUTO-DETECTION DEBUG")
            print("="*80)
            print(f"Template Name: {template_name}")
            print(f"Local Template Found: {local_template is not None}")
            print(f"Local Template Data Type: {type(local_template.data)}")
            print(f"Local Template Data: {local_template.data}")
            print(f"Template Components: {template_components}")
            print("="*80 + "\n")
            
            has_image_header = False
            for comp in template_components:
                if not isinstance(comp, dict):
                    continue
                comp_type = str(comp.get('type', '')).upper()
                comp_format = str(comp.get('format', '')).upper()
                print(f"Checking component: {comp}")
                if comp_type == 'HEADER' and comp_format == 'IMAGE':
                    has_image_header = True
                    break
                if comp_type == 'HEADER' and isinstance(comp.get('example'), dict) and comp['example'].get('header_handle'):
                    has_image_header = True
                    break
            
            print(f"✅ Has IMAGE Header: {has_image_header}\n")
            
            if has_image_header:
                image_url = request.data.get('image_url')
                if image_url:
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
                    print(f"✅ Added IMAGE header component with URL: {image_url}\n")
                else:
                    return Response({
                        'success': False,
                        'error': 'Template requires an IMAGE header. Please provide image_url or include header image parameters in components.',
                        'template_info': {
                            'name': template_name,
                            'requires_image_header': True,
                        }
                    }, status=400)

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

            is_success = 'error' not in result
            wamid = result.get('messages', [{}])[0].get('id') if (is_success and isinstance(result, dict)) else None

            # Log message in a single database create call
            log = WhatsAppMessageLog.objects.create(
                vendor=vendor,
                contact=contact,
                contact_wa_id=to_number,
                is_incoming=False,
                status='sent' if is_success else 'failed',
                wamid=wamid,
                message_body=f"Template: {template_name}",
                message_type='template',
                platform='whatsapp',
                data=result if isinstance(result, dict) else {}
            )

            if is_success:
                contact.last_messaged_at = timezone.now()
                contact.save(update_fields=['last_messaged_at'])

                return Response({
                    'success': True,
                    'log_id': log.id,
                    'wamid': log.wamid,
                    'meta_response': result
                })
            else:
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


class BlockUsersAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'success': False, 'error': 'No vendor account associated.'}, status=403)

        client = WhatsAppClient(vendor=vendor)
        result = client.get_blocked_users()
        if 'error' in result:
            return Response({'success': False, 'error': result.get('error'), 'meta_response': result}, status=400)
        return Response({'success': True, 'data': result.get('data', [])})

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'success': False, 'error': 'No vendor account associated.'}, status=403)

        block_users = request.data.get('block_users')
        wa_id = request.data.get('wa_id') or request.data.get('user')
        wa_ids = []

        if isinstance(block_users, list):
            wa_ids = [str(item.get('user')) for item in block_users if item.get('user')]
        elif wa_id:
            wa_ids = [str(wa_id)]

        if not wa_ids:
            return Response({'success': False, 'error': 'wa_id or block_users payload is required.'}, status=400)

        client = WhatsAppClient(vendor=vendor)
        result = client.block_users(wa_ids)
        if 'error' in result:
            return Response({'success': False, 'error': result.get('error'), 'meta_response': result}, status=400)
        return Response({'success': True, 'meta_response': result})

    def delete(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'success': False, 'error': 'No vendor account associated.'}, status=403)

        block_users = request.data.get('block_users')
        wa_id = request.data.get('wa_id') or request.data.get('user')
        wa_ids = []

        if isinstance(block_users, list):
            wa_ids = [str(item.get('user')) for item in block_users if item.get('user')]
        elif wa_id:
            wa_ids = [str(wa_id)]

        if not wa_ids:
            return Response({'success': False, 'error': 'wa_id or block_users payload is required.'}, status=400)

        client = WhatsAppClient(vendor=vendor)
        result = client.unblock_users(wa_ids)
        if 'error' in result:
            return Response({'success': False, 'error': result.get('error'), 'meta_response': result}, status=400)
        return Response({'success': True, 'meta_response': result})


# ─────────────────────────────────────────────────────────────
# SEND INTERACTIVE BUTTON MESSAGE
# POST /whatsapp/send-interactive-buttons/
# Body: {
#   to_number, body_text, footer_text (optional),
#   header_image_url OR header_image_id (optional),
#   buttons: [{"id": "btn_1", "title": "Yes"}, ...]  (max 3)
# }
# ─────────────────────────────────────────────────────────────
class SendInteractiveButtonAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = getattr(request.user, 'vendor', None)
        if not vendor:
            return Response({'error': 'No vendor account associated.'}, status=403)

        to_number = request.data.get('to_number')
        body_text = request.data.get('body_text', '')
        footer_text = request.data.get('footer_text', '')
        header_image_url = request.data.get('header_image_url', '')
        header_image_id = request.data.get('header_image_id', '')
        buttons_raw = request.data.get('buttons', [])  # [{"id":"btn_1","title":"Yes"},...]
        reply_to = request.data.get('reply_to')

        if not to_number:
            return Response({'error': 'to_number is required.'}, status=400)
        if not body_text:
            return Response({'error': 'body_text is required.'}, status=400)
        if not buttons_raw or len(buttons_raw) == 0:
            return Response({'error': 'At least one button is required.'}, status=400)
        if len(buttons_raw) > 3:
            return Response({'error': 'Maximum 3 buttons allowed.'}, status=400)

        # Build buttons array in Meta format
        buttons = []
        for btn in buttons_raw:
            btn_id = str(btn.get('id', '')).strip()
            btn_title = str(btn.get('title', '')).strip()
            if not btn_id or not btn_title:
                return Response({'error': 'Each button must have an id and title.'}, status=400)
            if len(btn_title) > 20:
                return Response({'error': f'Button title "{btn_title}" exceeds 20 characters.'}, status=400)
            buttons.append({
                "type": "reply",
                "reply": {"id": btn_id, "title": btn_title}
            })

        # Build interactive payload
        interactive_data = {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": buttons}
        }

        # Optional header (image)
        if header_image_url or header_image_id:
            image_obj = {}
            if header_image_id:
                image_obj["id"] = header_image_id
            else:
                image_obj["link"] = header_image_url
            interactive_data["header"] = {
                "type": "image",
                "image": image_obj
            }

        # Optional footer
        if footer_text:
            interactive_data["footer"] = {"text": footer_text}

        client = WhatsAppClient(vendor=vendor)
        result = client.send_interactive_message(
            to_number=to_number,
            interactive_data=interactive_data,
            reply_to_message_id=reply_to
        )

        if 'error' not in result:
            return Response({'success': True, 'meta_response': result})
        else:
            return Response(
                {'success': False, 'error': result.get('error'), 'meta_response': result},
                status=400
            )


from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from .models import ChatbotFlow, Sequence, SequenceStep
from .serializers import ChatbotFlowSerializer

def sync_sequences_from_flow(flow):
    flow_data = flow.flow_data or {}
    
    # flow_data structure: {'id': '...', 'nodes': { 'node_id': { ... }, ... }}
    nodes_dict = flow_data.get('nodes', {})
    
    # if nodes is somehow a list, convert to dict
    if isinstance(nodes_dict, list):
        nodes_dict = {str(n.get('id')): n for n in nodes_dict}
        
    nodes = list(nodes_dict.values())
        
    sequence_nodes = []
    for n in nodes:
        t = n.get('type', '')
        if t == 'new_sequence_campaign' or t.startswith('New_sequence_campaign'):
            sequence_nodes.append(n)
            
    vendor = flow.vendor
    
    for seq_node in sequence_nodes:
        seq_name = seq_node.get('data', {}).get('sequence_name', '').strip()
        if not seq_name:
            continue
            
        sequence, _ = Sequence.objects.get_or_create(vendor=vendor, name=seq_name)
        
        current_node_id = str(seq_node.get('id'))
        order = 1
        valid_step_ids = []
        
        while True:
            # find the next send_message_after node in the chain. The chain can be:
            #  - seq_node -> send_message_after -> (Text) -> send_message_after -> ...
            #  - or direct: seq_node -> send_message_after -> send_message_after -> ...
            current_node = nodes_dict.get(current_node_id)
            if not current_node:
                break

            # Determine which node is the send node to process in this iteration.
            ctype = current_node.get('type', '')
            if ctype == 'send_message_after' or ctype.startswith('Send_message_after'):
                # current node itself is a send node
                target_node = current_node
                target_id = current_node_id
            else:
                outputs = current_node.get('outputs', {})
                next_output = outputs.get('next', {})
                conns = next_output.get('connections', [])
                if not conns:
                    break
                target_id = str(conns[0].get('node'))
                target_node = nodes_dict.get(target_id)

            # The frontend converts the type 'send_message_after' to 'Send_message_after Node'
            # Let's check both possibilities.
            target_type = target_node.get('type', '') if target_node else ''
            is_valid_type = target_type == 'send_message_after' or target_type.startswith('Send_message_after')

            if not target_node or not is_valid_type:
                break

            node_data = target_node.get('data', {})
            seq_schedule = node_data.get('seq_schedule', '5 mins').lower()
            delay_minutes = 0
            delay_seconds = None
            try:
                parts = seq_schedule.split()
                if len(parts) >= 2:
                    amount = int(parts[0])
                    unit = parts[1]
                    if 'sec' in unit:
                        delay_seconds = amount
                    elif 'min' in unit:
                        delay_minutes = amount
                    elif 'hour' in unit:
                        delay_minutes = amount * 60
                    elif 'day' in unit:
                        delay_minutes = amount * 60 * 24
            except Exception:
                pass
                
            if delay_seconds is not None:
                node_data['delay_seconds'] = delay_seconds
            msg_type = node_data.get('seq_message_type', 'regular')
            
            # Use the node's name as the message body if they renamed it (e.g. 'hi')
            msg_body = target_node.get('name', 'Sequence Message')
            if msg_body.lower() == 'send message after':
                msg_body = 'Sequence Message'
                
            # If there's a connected text node, grab its text. Also support the
            # pattern: send_message_after -> Text Node -> send_message_after (chained).
            child_outputs = target_node.get('outputs', {})
            child_next = child_outputs.get('next', {})
            child_conns = child_next.get('connections', [])
            next_chain_target = None
            if child_conns:
                child_id = str(child_conns[0].get('node'))
                child_node = nodes_dict.get(child_id)
                if child_node and 'text' in child_node.get('type', '').lower():
                    child_text = child_node.get('data', {}).get('textMessage') or child_node.get('data', {}).get('text')
                    if child_text:
                        msg_body = child_text

                    # Check if the text node then points to another send_message_after
                    grand_next = child_node.get('outputs', {}).get('next', {}).get('connections', [])
                    if grand_next:
                        grand_target_id = str(grand_next[0].get('node'))
                        grand_target_node = nodes_dict.get(grand_target_id)
                        if grand_target_node:
                            gt_type = grand_target_node.get('type', '')
                            if gt_type == 'send_message_after' or gt_type.startswith('Send_message_after'):
                                next_chain_target = grand_target_id

            # Save a reference to the flow and connected child node so the scheduler can
            # execute the connected live-flow nodes immediately after sending the
            # scheduled sequence message. We augment node_data with metadata keys
            # used by the task runner.
            if child_conns:
                node_data = dict(node_data or {})
                node_data['_flow_pk'] = flow.pk
                node_data['_sequence_send_node_id'] = target_id
                node_data['_child_next_node_id'] = child_id

            step, _ = SequenceStep.objects.update_or_create(
                sequence=sequence,
                order=order,
                defaults={
                    'delay_minutes': delay_minutes,
                    'message_type': msg_type,
                    'message_body': msg_body,
                    'data': node_data
                }
            )
            valid_step_ids.append(step.id)
            # Determine the next node to continue from:
            # 1) If the text node pointed to a next send node, follow that.
            # 2) Else, if the current target send_node's outputs.next points
            #    directly to another send node, follow that.
            # 3) Otherwise stop.
            if next_chain_target:
                current_node_id = next_chain_target
            else:
                # check direct next from target_node
                t_next = target_node.get('outputs', {}).get('next', {}).get('connections', [])
                if t_next:
                    dir_next_id = str(t_next[0].get('node'))
                    dir_next_node = nodes_dict.get(dir_next_id)
                    if dir_next_node:
                        d_type = dir_next_node.get('type', '')
                        if d_type == 'send_message_after' or d_type.startswith('Send_message_after'):
                            current_node_id = dir_next_id
                        else:
                            break
                    else:
                        break
                else:
                    break
            order += 1
            
        SequenceStep.objects.filter(sequence=sequence).exclude(id__in=valid_step_ids).delete()

class ChatbotFlowListCreateAPIView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotFlowSerializer

    def get_queryset(self):
        queryset = ChatbotFlow.objects.filter(vendor=self.request.user.vendor).order_by('-created_at')
        has_sequence = self.request.query_params.get('has_sequence')
        search = self.request.query_params.get('search')

        if search:
            queryset = queryset.filter(name__icontains=search)

        if has_sequence and str(has_sequence).lower() in ('1', 'true', 'yes', 'on'):
            # Filter flows that contain at least one sequence campaign node.
            return [flow for flow in queryset if self._flow_contains_sequence(flow)]

        return queryset

    def _flow_contains_sequence(self, flow):
        flow_data = flow.flow_data or {}
        nodes = flow_data.get('nodes', {}) if isinstance(flow_data, dict) else {}
        if isinstance(nodes, list):
            nodes = {str(node.get('id', '')): node for node in nodes}

        for node in nodes.values():
            node_type = str(node.get('type', '')).lower()
            if node_type == 'new_sequence_campaign' or node_type.startswith('new_sequence_campaign') or 'sequence campaign' in node_type:
                return True
        return False

    def perform_create(self, serializer):
        flow = serializer.save(vendor=self.request.user.vendor)
        sync_sequences_from_flow(flow)

class ChatbotFlowDetailAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotFlowSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return ChatbotFlow.objects.filter(vendor=self.request.user.vendor)

    def perform_update(self, serializer):
        flow = serializer.save()
        sync_sequences_from_flow(flow)


# ─────────────────────────────────────────────────────────────
# TEMPLATE VARIABLES — list/create/delete
# ─────────────────────────────────────────────────────────────
from .models import TemplateVariable
from .serializers import TemplateVariableSerializer

class TemplateVariableListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        variables = TemplateVariable.objects.filter(vendor=request.user.vendor)
        serializer = TemplateVariableSerializer(variables, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Variable name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if TemplateVariable.objects.filter(vendor=request.user.vendor, name=name).exists():
            return Response({'error': f'Variable "{name}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        variable = TemplateVariable.objects.create(vendor=request.user.vendor, name=name)
        serializer = TemplateVariableSerializer(variable)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TemplateVariableDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            variable = TemplateVariable.objects.get(pk=pk, vendor=request.user.vendor)
            variable.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except TemplateVariable.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)



from .models import Sequence
from .serializers import SequenceSerializer

class SequenceListCreateAPIView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SequenceSerializer

    def get_queryset(self):
        return Sequence.objects.filter(vendor=self.request.user.vendor).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

class SequenceDetailAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SequenceSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Sequence.objects.filter(vendor=self.request.user.vendor)

# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------

from .models import CustomField
from .serializers import CustomFieldSerializer
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class SystemFieldListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        system_fields = [
            {"label": "Phone Number (wa_id)", "value": "phone"},
            {"label": "Name", "value": "full_name"},
            {"label": "Email", "value": "email"},
            {"label": "Label", "value": "label"},
            {"label": "Last Messaged At", "value": "last_messaged_at"},
            {"label": "Unread Messages Count", "value": "unread_messages_count"}
        ]
        return Response(system_fields)

class CustomFieldListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CustomFieldSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomField.objects.filter(vendor=self.request.user.vendor)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor)

class CustomFieldDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomFieldSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomField.objects.filter(vendor=self.request.user.vendor)

from .models import ContactLabel
from .serializers import ContactLabelSerializer

class ContactLabelListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = request.user.vendor
        contact_labels = set(ContactLabel.objects.filter(vendor=vendor).values_list('name', flat=True))
        data = [{'id': label, 'name': label} for label in sorted(contact_labels)]
        return Response(data)

    def post(self, request):
        name = request.data.get('name')
        if name:
            obj, created = ContactLabel.objects.get_or_create(vendor=request.user.vendor, name=name)
            return Response({'id': obj.name, 'name': obj.name}, status=201)
        return Response({'error': 'Name is required'}, status=400)

class ContactLabelDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContactLabelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ContactLabel.objects.filter(vendor=self.request.user.vendor)
