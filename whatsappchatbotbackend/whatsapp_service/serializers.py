from rest_framework import serializers
from .models import WhatsAppMessageLog, WhatsAppTemplate, Contact, VendorSettings

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'wa_id', 'first_name', 'last_name', 'email', 
            'platform', 'unread_messages_count', 'last_messaged_at', 'created_at', 'updated_at'
        ]

class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = ['id', 'name', 'language', 'category', 'status', 'data']

class WhatsAppMessageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppMessageLog
        fields = '__all__'

class VendorSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorSettings
        fields = [
            'uid', 
            'whatsapp_access_token', 
            'whatsapp_phone_number_id', 
            'whatsapp_business_account_id', 
            'whatsapp_app_id', 
            'updated_at'
        ]
        read_only_fields = ['uid', 'updated_at']
