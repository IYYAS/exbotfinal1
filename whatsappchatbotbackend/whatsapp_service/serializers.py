from rest_framework import serializers
from .models import WhatsAppMessageLog, WhatsAppTemplate, Contact, VendorSettings

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'wa_id', 'first_name', 'last_name', 'email', 'label',
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


from .models import ChatbotFlow

class ChatbotFlowSerializer(serializers.ModelSerializer):
    sequence_nodes = serializers.SerializerMethodField()
    sequence_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatbotFlow
        fields = ['id', 'uid', 'name', 'is_active', 'label', 'flow_data', 'sequence_count', 'sequence_nodes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uid', 'created_at', 'updated_at']

    def get_sequence_nodes(self, obj):
        nodes = obj.flow_data.get('nodes', {}) if isinstance(obj.flow_data, dict) else {}
        if isinstance(nodes, list):
            node_items = nodes
        else:
            node_items = list(nodes.values())

        sequence_nodes = []
        for node in node_items:
            node_type = str(node.get('type', '')).lower()
            if node_type == 'new_sequence_campaign' or node_type.startswith('new_sequence_campaign') or 'sequence campaign' in node_type:
                sequence_nodes.append({
                    'id': str(node.get('id', '')),
                    'name': node.get('name') or node.get('data', {}).get('sequence_name') or 'Sequence Campaign',
                    'sequence_name': node.get('data', {}).get('sequence_name'),
                    'data': node.get('data', {}),
                    'type': node.get('type'),
                })
        return sequence_nodes

    def get_sequence_count(self, obj):
        return len(self.get_sequence_nodes(obj))


from .models import TemplateVariable

class TemplateVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVariable
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']



from .models import Sequence, SequenceStep

class SequenceStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceStep
        fields = ['id', 'order', 'delay_minutes', 'message_type', 'message_body', 'data']

class SequenceSerializer(serializers.ModelSerializer):
    steps = SequenceStepSerializer(many=True, required=False)

    class Meta:
        model = Sequence
        fields = ['id', 'uid', 'name', 'is_active', 'steps', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uid', 'created_at', 'updated_at']

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        sequence = Sequence.objects.create(**validated_data)
        for s in steps_data:
            SequenceStep.objects.create(sequence=sequence, **s)
        return sequence

from .models import CustomField, ContactCustomField

class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = ['id', 'name', 'field_key', 'field_type', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ContactCustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactCustomField
        fields = ['id', 'contact', 'custom_field', 'value', 'updated_at']
        read_only_fields = ['id', 'updated_at']

from .models import ContactLabel

class ContactLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactLabel
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']