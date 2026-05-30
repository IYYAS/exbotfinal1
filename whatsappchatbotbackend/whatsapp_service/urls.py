from django.urls import path
from .views import (
    SettingsAPIView, TestConnectionAPIView, AccountStatusAPIView, WhatsAppWebhookView,
    ContactListAPIView, ContactDetailAPIView, MessageListAPIView, TemplateListAPIView,
    TemplateSyncAPIView, MediaUploadAPIView, SendMessageAPIView, SendTemplateAPIView, SendReactionAPIView,
    SendLocationMessageView, TemplateCreateAPIView, TemplateDeleteAPIView,
    #   SendDocumentMessageAPIView, SendAudioMessageAPIView, SendVideoMessageAPIView,
    # SendImageMessageAPIView,SendTextMessageAPIView,
) 


urlpatterns = [
    path('settings/', SettingsAPIView.as_view(), name='whatsapp-settings'),
    path('test-connection/', TestConnectionAPIView.as_view(), name='whatsapp-test-connection'),
    path('account-status/', AccountStatusAPIView.as_view(), name='whatsapp-account-status'),
    path('api/webhook/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
    
    path('contacts/', ContactListAPIView.as_view(), name='whatsapp-contacts'),
    path('contacts/<int:pk>/', ContactDetailAPIView.as_view(), name='whatsapp-contact-detail'),
    path('messages/', MessageListAPIView.as_view(), name='whatsapp-messages'),
    path('templates/', TemplateListAPIView.as_view(), name='whatsapp-templates'),
    path('templates/sync/', TemplateSyncAPIView.as_view(), name='whatsapp-templates-sync'),
    path('templates/create/', TemplateCreateAPIView.as_view(), name='whatsapp-templates-create'),
    path('templates/<str:template_name>/delete/', TemplateDeleteAPIView.as_view(), name='whatsapp-templates-delete'),
    path('media/upload/', MediaUploadAPIView.as_view(), name='whatsapp-media-upload'),
    path('send/', SendMessageAPIView.as_view(), name='whatsapp-send'),
    path('send-template/', SendTemplateAPIView.as_view(), name='whatsapp-send-template'),
    path('send-reaction/', SendReactionAPIView.as_view(), name='whatsapp-send-reaction'),
    path('send-location/', SendLocationMessageView.as_view(), name='whatsapp-send-location'),
    # path('send-document/', SendDocumentMessageAPIView.as_view(), name='whatsapp-send-document'),
    # path('send-audio/', SendAudioMessageAPIView.as_view(), name='whatsapp-send-audio'),
    # path('send-video/', SendVideoMessageAPIView.as_view(), name='whatsapp-send-video'),
    # path('send-image/', SendImageMessageAPIView.as_view(), name='whatsapp-send-image'),
    # path('send-text/', SendTextMessageAPIView.as_view(), name='whatsapp-send-text')

]
