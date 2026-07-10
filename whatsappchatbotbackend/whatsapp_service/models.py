from django.db import models
from django.utils import timezone
from users.models import Vendor
import uuid

class Contact(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='contacts', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    wa_id = models.CharField(max_length=50, null=True, blank=True)
    platform = models.CharField(max_length=20, default='whatsapp') # whatsapp, instagram, facebook
    platform_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    email = models.EmailField(blank=True, null=True)
    label = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    unread_messages_count = models.IntegerField(default=0)
    last_messaged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vendor', 'wa_id')

    def __str__(self):
        return f"{self.first_name or ''} {self.last_name or ''} ({self.wa_id})".strip()

class WhatsAppMessageLog(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='message_logs', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='messages', null=True)
    contact_wa_id = models.CharField(max_length=50)
    wamid = models.CharField(max_length=200, unique=True, null=True, blank=True)
    is_incoming = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='sent') # sent, delivered, read, failed
    message_body = models.TextField(null=True, blank=True)
    attachment = models.CharField(max_length=500, null=True, blank=True)
    platform = models.CharField(max_length=20, default='whatsapp')
    platform_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    message_type = models.CharField(max_length=50, default='text') # text, image, video, etc.
    messaged_at = models.DateTimeField(default=timezone.now, db_index=True)
    data = models.JSONField(default=dict) # To store raw webhook data and other metadata

    class Meta:
        ordering = ['-messaged_at']

    def __str__(self):
        return f"{self.contact_wa_id} - {self.message_type} ({self.status})"

class WhatsAppTemplate(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='templates', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=50)
    category = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    data = models.JSONField(default=dict) # Stores the template structure/components

    def __str__(self):
        return f"{self.name} ({self.language})"

class VendorSettings(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='settings', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    whatsapp_access_token = models.TextField(blank=True, null=True)
    whatsapp_phone_number_id = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_business_account_id = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_app_id = models.CharField(max_length=100, blank=True, null=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for Vendor {self.uid}"


from django.conf import settings

class ChatbotFlow(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='bot_flows', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    label = models.CharField(max_length=255, blank=True, null=True, help_text='Optional audience label for flow targeting.')
    
    # Store the entire custom node graph JSON exactly as sent
    flow_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.vendor})"


class TemplateVariable(models.Model):
    """Stores reusable variable names for WhatsApp message templates."""
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='template_variables', null=True, blank=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vendor', 'name')
        ordering = ['-created_at']

    def __str__(self):
        return f"{{{{ {self.name} }}}} ({self.vendor})"


class Sequence(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='sequences', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vendor', 'name')

    def __str__(self):
        return f"{self.name} ({self.vendor})"

class SequenceStep(models.Model):
    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name='steps')
    order = models.PositiveIntegerField()
    delay_minutes = models.PositiveIntegerField(default=0)
    message_type = models.CharField(max_length=50, default='text')
    message_body = models.TextField(blank=True, null=True)
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order']
        unique_together = ('sequence', 'order')        


class SequenceSubscription(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('completed', 'Completed'), ('unsubscribed', 'Unsubscribed')]
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='sequence_subscriptions')
    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name='subscriptions')
    current_step = models.ForeignKey(SequenceStep, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    next_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('contact', 'sequence')        


class ContactLabel(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='contact_labels')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('vendor', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.vendor})"



class CustomField(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='custom_fields')
    name = models.CharField(max_length=100)
    field_key = models.CharField(max_length=100)
    field_type = models.CharField(max_length=30, default='text')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vendor', 'field_key')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.vendor})"

class ContactCustomField(models.Model):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='custom_fields')
    custom_field = models.ForeignKey(CustomField, on_delete=models.CASCADE, related_name='contact_values')
    value = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('contact', 'custom_field')

    def __str__(self):
        return f"{self.contact} - {self.custom_field.name}: {self.value}"