from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100) # Free, Pro, Enterprise
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Limits
    limit_messages_monthly = models.IntegerField(default=1000)
    limit_contacts = models.IntegerField(default=500)
    limit_agents = models.IntegerField(default=2)
    
    features = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Vendor(models.Model):
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Current subscription
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    subscription_ends_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# class GlobalSetting(models.Model):
#     uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
#     key = models.CharField(max_length=255, unique=True)
#     value = models.TextField()
#     is_secret = models.BooleanField(default=False)
    
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return self.key

class User(AbstractUser):
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=50, default='agent') # admin, agent, staff
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.email or self.username
