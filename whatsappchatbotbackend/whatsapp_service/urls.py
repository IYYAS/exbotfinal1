from django.urls import path
from .views import (
    SettingsAPIView, TestConnectionAPIView, AccountStatusAPIView, WhatsAppWebhookView,
    ContactListAPIView, ContactDetailAPIView, MessageListAPIView, MessageDetailAPIView, TemplateListAPIView,
    TemplateSyncAPIView, MediaUploadAPIView, SendMessageAPIView, SendTemplateAPIView, SendReactionAPIView,
    SendLocationMessageView, BlockUsersAPIView, TemplateCreateAPIView, TemplateDeleteAPIView,
    SendInteractiveButtonAPIView, TemplateMediaUploadAPIView,
) 

from .views import ChatbotFlowListCreateAPIView, ChatbotFlowDetailAPIView
from .views import TemplateVariableListCreateAPIView, TemplateVariableDetailAPIView
from .views import SequenceListCreateAPIView, SequenceDetailAPIView
from .views import SystemFieldListAPIView, CustomFieldListCreateAPIView, CustomFieldDetailAPIView
from .views import ContactLabelListCreateAPIView, ContactLabelDetailAPIView

urlpatterns = [
    path('settings/', SettingsAPIView.as_view(), name='whatsapp-settings'),
    path('test-connection/', TestConnectionAPIView.as_view(), name='whatsapp-test-connection'),
    path('account-status/', AccountStatusAPIView.as_view(), name='whatsapp-account-status'),
    path('api/webhook/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
    
    path('contacts/', ContactListAPIView.as_view(), name='whatsapp-contacts'),
    path('contacts/<int:pk>/', ContactDetailAPIView.as_view(), name='whatsapp-contact-detail'),
    path('messages/', MessageListAPIView.as_view(), name='whatsapp-messages'),
    path('messages/<int:pk>/', MessageDetailAPIView.as_view(), name='whatsapp-message-detail'),
    path('templates/', TemplateListAPIView.as_view(), name='whatsapp-templates'),
    path('templates/sync/', TemplateSyncAPIView.as_view(), name='whatsapp-templates-sync'),
    path('templates/create/', TemplateCreateAPIView.as_view(), name='whatsapp-templates-create'),
    path('templates/<str:template_name>/delete/', TemplateDeleteAPIView.as_view(), name='whatsapp-templates-delete'),
    path('templates/media/upload/', TemplateMediaUploadAPIView.as_view(), name='whatsapp-template-media-upload'),
    path('media/upload/', MediaUploadAPIView.as_view(), name='whatsapp-media-upload'),
    path('send/', SendMessageAPIView.as_view(), name='whatsapp-send'),
    path('send-template/', SendTemplateAPIView.as_view(), name='whatsapp-send-template'),
    path('send-reaction/', SendReactionAPIView.as_view(), name='whatsapp-send-reaction'),
    path('send-location/', SendLocationMessageView.as_view(), name='whatsapp-send-location'),
    path('blocked-users/', BlockUsersAPIView.as_view(), name='whatsapp-blocked-users'),
    path('send-interactive-buttons/', SendInteractiveButtonAPIView.as_view(), name='whatsapp-send-interactive-buttons'),

    # Chatbot Flow APIs
    path('flows/', ChatbotFlowListCreateAPIView.as_view(), name='chatbot-flow-list-create'),
    path('flows/<int:pk>/', ChatbotFlowDetailAPIView.as_view(), name='chatbot-flow-detail'),

    # Template Variable APIs
    path('template-variables/', TemplateVariableListCreateAPIView.as_view(), name='template-variable-list-create'),
    path('template-variables/<int:pk>/', TemplateVariableDetailAPIView.as_view(), name='template-variable-detail'),
    path('sequences/', SequenceListCreateAPIView.as_view()),
    path('sequences/<int:pk>/', SequenceDetailAPIView.as_view()),
    
    # Fields APIs
    path('system-fields/', SystemFieldListAPIView.as_view(), name='system-field-list'),
    path('custom-fields/', CustomFieldListCreateAPIView.as_view(), name='custom-field-list-create'),
    path('custom-fields/<int:pk>/', CustomFieldDetailAPIView.as_view(), name='custom-field-detail'),
    
    # Label APIs
    path('labels/', ContactLabelListCreateAPIView.as_view(), name='contact-label-list-create'),
    path('labels/<int:pk>/', ContactLabelDetailAPIView.as_view(), name='contact-label-detail'),
]