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
