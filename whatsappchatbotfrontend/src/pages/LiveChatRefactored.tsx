import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  ContactList,
  MessageList,
  MessageInput,
  ContextMenu,
  JSONInspector,
  ChatHeader,
  ActiveReplyBanner,
  EmptyState,
  AddContactModal,
} from '../components';
import {
  Menu,
  Settings,
  X,
  LayoutDashboard,
  Zap,
  Bot,
  Users,
  Radio,
  Activity,
  CreditCard,
  MessageCircle,
  Bookmark,
  Box,
  EyeOff,
  CircleSlash,
  CheckCircle2,
} from 'lucide-react';
import type { ContactInfo, MessageLog, WhatsAppTemplate } from '../types';
import { whatsappAPI } from '../api';
import { useRecording } from '../hooks/useRecording';

const LiveChat: React.FC = () => {
  // ============ State Management ============
  const { isDarkMode } = useTheme();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [blockedWaIds, setBlockedWaIds] = useState<string[]>([]);

  // Loading states
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [blockActionInProgress, setBlockActionInProgress] = useState(false);

  // UI states
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'unread' | 'blocked'>('all');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templatePanelTab, setTemplatePanelTab] = useState<'bot_flow' | 'message' | 'whatsapp_flow'>('message');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateBodyParams, setTemplateBodyParams] = useState<string[]>([]);
  // const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [templateHeaderUploadError, setTemplateHeaderUploadError] = useState<string | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string;
    name: string;
    type: string;
  } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const sidebarMenu = [
    { name: 'Contacts', icon: <Users size={18} />, action: () => setContactFilter('all') },
    { name: 'Unread', icon: <MessageCircle size={18} />, action: () => setContactFilter('unread') },
    { name: 'Blocked', icon: <EyeOff size={18} />, action: () => setContactFilter('blocked') },
    { name: 'Mention', icon: <CircleSlash size={18} />, action: () => setContactFilter('all') },
    { name: 'Resolved', icon: <CheckCircle2 size={18} />, action: () => setContactFilter('all') },
    { name: 'Settings', icon: <Settings size={18} />, path: '/settings' },
  ];

  const dashboardMenu = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' },
    { name: 'Shared Inbox', icon: <MessageCircle size={18} />, path: '/shared-inbox' },
    { name: 'Connect Account', icon: <Zap size={18} />, path: '/whatsapp/connect' },
    { name: 'Chatbot Manager', icon: <Bot size={18} />, path: '/bot-reply' },
    { name: 'Subscriber Manager', icon: <Users size={18} />, path: '/contacts' },
    { name: 'Broadcasting', icon: <Radio size={18} />, path: '/campaigns' },
    { name: 'Live Chat', icon: <MessageCircle size={18} />, path: '/chat' },
    { name: 'WhatsApp Automation', icon: <Activity size={18} />, path: '/flows' },
    { name: 'Comment Automation', icon: <Box size={18} />, path: '/comment-automation' },
    { name: 'Social Posting', icon: <Bookmark size={18} />, path: '/social-posting' },
    { name: 'Integrations', icon: <Bot size={18} />, path: '/integrations' },
    { name: 'Control Panel', icon: <Settings size={18} />, path: '/control-panel' },
    { name: 'WhatsApp', icon: <CreditCard size={18} />, path: '/whatsapp' },
  ];

  // Message interaction states
  const [inspectorMessage, setInspectorMessage] = useState<MessageLog | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageLog | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: MessageLog; x: number; y: number } | null>(null);
  const [sentReactions, setSentReactions] = useState<Record<string, string>>({});

  // New contact form
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');

  // UI toggles
  const [previewUrl, setPreviewUrl] = useState(false);

  // Recording hook
  const recording = useRecording();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const templateHeaderFileInputRef = useRef<HTMLInputElement | null>(null);

  // ============ Effects ============
  useEffect(() => {
    fetchContacts();
    fetchTemplates();
    fetchBlockedUsers();
  }, []);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.wa_id);
      setReplyToMessage(null);
      setSentReactions({});
    }
  }, [activeContact]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeContact) {
        pollMessages(activeContact.wa_id);
      }
      pollContacts();
    }, 900000);
    return () => clearInterval(timer);
  }, [activeContact]);

  useEffect(() => {
    fetchContacts(searchTerm, contactFilter);
  }, [searchTerm, contactFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============ API Methods ============
  const fetchContacts = async (search: string = '', filter: 'all' | 'unread' | 'blocked' = 'all') => {
    setLoadingContacts(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filter === 'unread') params.unread = true;
      if (filter === 'blocked') params.blocked = true;

      const res = await whatsappAPI.fetchContacts(params);
      setContacts(res.data);
      if (res.data.length > 0 && (!activeContact || !res.data.some((c: any) => c.wa_id === activeContact.wa_id))) {
        setActiveContact(res.data[0]);
      }
      if (res.data.length === 0 && activeContact && filter !== 'all') {
        setActiveContact(null);
      }
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const pollContacts = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (contactFilter === 'unread') params.unread = true;
      if (contactFilter === 'blocked') params.blocked = true;

      const res = await whatsappAPI.fetchContacts(params);
      if (JSON.stringify(res.data) !== JSON.stringify(contacts)) {
        setContacts(res.data);
      }
    } catch (err) {
      console.error('Polled contacts failed', err);
    }
  };

  const fetchMessages = async (waId: string) => {
    setLoadingMessages(true);
    try {
      const res = await whatsappAPI.fetchMessages(waId);
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const pollMessages = async (waId: string) => {
    try {
      const res = await whatsappAPI.fetchMessages(waId);
      const reversed = res.data.reverse();
      if (JSON.stringify(reversed) !== JSON.stringify(messages)) {
        setMessages(reversed);
      }
    } catch (err) {
      console.error('Polled messages failed', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await whatsappAPI.fetchTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await whatsappAPI.getBlockedUsers();
      const blocked = Array.isArray(res.data?.data)
        ? res.data.data.map((item: any) => item.wa_id).filter(Boolean)
        : [];
      setBlockedWaIds(blocked);
    } catch (err) {
      console.error('Failed to load blocked users', err);
    }
  };

  const handleBlockToggle = async () => {
    if (!activeContact) return;

    setBlockActionInProgress(true);
    try {
      if (isBlockedContact) {
        await whatsappAPI.unblockUser(activeContact.wa_id);
      } else {
        await whatsappAPI.blockUser(activeContact.wa_id);
      }
      await fetchBlockedUsers();
      alert(`${isBlockedContact ? 'Unblocked' : 'Blocked'} ${activeContact.first_name || 'contact'} successfully.`);
    } catch (err) {
      console.error('Failed to toggle block', err);
      alert('Could not update block status.');
    } finally {
      setBlockActionInProgress(false);
    }
  };

  const isBlockedContact = Boolean(activeContact && blockedWaIds.includes(activeContact.wa_id));

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateBodyParams([]);
      setTemplateImageUrl('');
      setTemplateHeaderUploadError(null);
      return;
    }

    const bodyComponent = selectedTemplate.data?.components?.find((component: any) => component.type === 'BODY');
    const bodyText: string = bodyComponent?.text || '';
    const placeholders = Array.from(new Set(bodyText.match(/{{(\d+)}}/g) || [])).map((match) => Number(match.replace(/[{}]/g, '')));
    const maxIndex = placeholders.length ? Math.max(...placeholders) : 0;
    setTemplateBodyParams(Array.from({ length: maxIndex }, () => ''));

    setTemplateHeaderUploadError(null);
  }, [selectedTemplate]);

  // ============ Message Methods ============
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !pendingAttachment) || !activeContact || sending || isBlockedContact) {
      if (isBlockedContact) {
        alert('This chat is blocked. Unblock the user from Contacts before sending messages.');
      }
      return;
    }

    setSending(true);
    let text = messageInput.trim();

    try {
      if (pendingAttachment) {
        setUploadingFile(true);
        const file = pendingAttachment.file;
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await whatsappAPI.uploadMedia(formData);

        if (!uploadRes.data.success || !uploadRes.data.media_id) {
          throw new Error(uploadRes.data.error || 'Upload failed');
        }

        const mime = uploadRes.data.mime_type || '';
        let msgType = 'document';
        if (mime.startsWith('image/')) msgType = 'image';
        else if (mime.startsWith('video/')) msgType = 'video';
        else if (mime.startsWith('audio/')) msgType = 'audio';

        const sendRes = await whatsappAPI.sendMessage(activeContact.wa_id, text, {
          type: msgType,
          media_id: uploadRes.data.media_id,
          local_url: uploadRes.data.local_url,
          reply_to_message_id: replyToMessage?.wamid,
          filename: msgType === 'document' ? file.name : undefined,
          voice: msgType === 'audio' ? true : undefined,
        });

        if (sendRes.data.success) {
          setReplyToMessage(null);
          fetchMessages(activeContact.wa_id);
          const newLog: MessageLog = {
            id: sendRes.data.log_id,
            contact_wa_id: activeContact.wa_id,
            wamid: sendRes.data.wamid,
            is_incoming: false,
            status: 'sent',
            message_body: text || file.name,
            message_type: msgType,
            attachment: uploadRes.data.local_url,
            messaged_at: new Date().toISOString(),
            data: sendRes.data.meta_response,
          };
          setInspectorMessage(newLog);
          setMessageInput('');
          setPendingAttachment(null);
        }
      } else {
        const extraData = {
          ...(replyToMessage ? { reply_to_message_id: replyToMessage.wamid } : {}),
          ...(previewUrl ? { preview_url: true } : {}),
        };
        const res = await whatsappAPI.sendMessage(activeContact.wa_id, text, extraData);
        if (res.data.success) {
          setReplyToMessage(null);
          fetchMessages(activeContact.wa_id);
          const newLog: MessageLog = {
            id: res.data.log_id,
            contact_wa_id: activeContact.wa_id,
            wamid: res.data.wamid,
            is_incoming: false,
            status: 'sent',
            message_body: text,
            message_type: 'text',
            messaged_at: new Date().toISOString(),
            data: res.data.meta_response,
          };
          setInspectorMessage(newLog);
          setMessageInput('');
        }
      }
    } catch (err: any) {
      console.error('Send message failed', err);
      const errRes = err.response?.data?.meta_response || { error: err.message || 'Meta endpoint rejected message dispatch' };
      const errorLog: MessageLog = {
        id: Date.now(),
        contact_wa_id: activeContact.wa_id,
        is_incoming: false,
        status: 'failed',
        message_body: pendingAttachment ? messageInput.trim() : text,
        message_type: pendingAttachment ? 'image' : 'text',
        messaged_at: new Date().toISOString(),
        data: errRes,
      };
      setInspectorMessage(errorLog);
      alert('Failed to send WhatsApp message. View Inspector for raw Meta error.');
    } finally {
      setUploadingFile(false);
      setSending(false);
    }
  };

  const handleSendReaction = async (message: MessageLog, emoji: string) => {
    if (!message.wamid || !activeContact) return;
    try {
      await whatsappAPI.sendReaction(activeContact.wa_id, message.wamid, emoji);
      setSentReactions((prev) => ({ ...prev, [message.wamid!]: emoji }));
    } catch (err) {
      console.error('Reaction failed', err);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contact and all their chat messages?'))
      return;
    try {
      await whatsappAPI.deleteContact(id);
      setContacts((prev) => prev.filter((contact) => contact.id !== id));
      if (activeContact?.id === id) {
        setActiveContact(null);
        setMessages([]);
      }
      setSearchTerm('');
      await fetchContacts();
      alert('Contact deleted successfully!');
    } catch (err) {
      console.error('Failed to delete contact', err);
      alert('Failed to delete contact.');
    }
  };

  const handleAddManualContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim() || !newContactName.trim()) return;

    try {
      const waId = newContactPhone.replace(/\D/g, '');
      const res = await whatsappAPI.addContact({
        wa_id: waId,
        first_name: newContactName,
        platform: 'whatsapp',
      });
      if (res.data) {
        setNewContactPhone('');
        setNewContactName('');
        setShowAddContact(false);
        fetchContacts();
        setActiveContact(res.data);
      }
    } catch (err) {
      console.error('Add contact failed', err);
      alert('Could not add contact. This WhatsApp phone number is already in your chat list.');
    }
  };

  const handleSendTemplate = async (templateName: string, language: string) => {
    if (!activeContact || !selectedTemplate) return;
    setShowTemplates(false);
    setSending(true);

    try {
      const templatePayload: any = {
        name: templateName,
        language: {
          code: language,
        },
        components: [],
      };

      const headerComponent = selectedTemplate.data?.components?.find((component: any) => component.type === 'HEADER');
      const headerLink = templateImageUrl.trim();

      if (headerComponent?.format === 'IMAGE' && headerLink) {
        templatePayload.components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: headerLink,
              },
            },
          ],
        });
      }

      if (templateBodyParams.length > 0) {
        const bodyValues = templateBodyParams.map((value) => ({ type: 'text', text: value || '' }));
        templatePayload.components.push({
          type: 'body',
          parameters: bodyValues,
        });
      }

      const res = await whatsappAPI.sendTemplate(activeContact.wa_id, templatePayload);

      if (res.data.success) {
        fetchMessages(activeContact.wa_id);
        setTemplateImageUrl(''); // Reset image URL after send
        const newLog: MessageLog = {
          id: res.data.log_id,
          contact_wa_id: activeContact.wa_id,
          is_incoming: false,
          status: 'sent',
          message_body: `Template: ${templateName}`,
          message_type: 'template',
          messaged_at: new Date().toISOString(),
          data: res.data.meta_response,
        };
        setInspectorMessage(newLog);
      }
    } catch (err: any) {
      console.error('Template send failed', err);
      const errMsg = err.response?.data?.error || 'Template send failed (check Meta approval or parameters)';
      const errorLog: MessageLog = {
        id: Date.now(),
        contact_wa_id: activeContact.wa_id,
        is_incoming: false,
        status: 'failed',
        message_body: `Template: ${templateName}`,
        message_type: 'template',
        messaged_at: new Date().toISOString(),
        data: { error: errMsg },
      };
      setInspectorMessage(errorLog);
      alert(errMsg);
    } finally {
      setSending(false);
    }
  };

  const syncTemplates = async () => {
    try {
      const res = await whatsappAPI.syncTemplates();
      if (res.data.success) {
        fetchTemplates();
        alert(`Successfully synchronized ${res.data.count} Meta templates to the database!`);
      }
    } catch (err) {
      console.error('Templates synchronization failed', err);
      alert('Could not synchronize templates. Ensure WABA is correctly linked.');
    }
  };

  const handleFileSelect = (file: File) => {
    if (!activeContact) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingAttachment({ file, previewUrl, name: file.name, type: file.type });
  };

  const handleRemoveAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const handleTemplateHeaderFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setTemplateHeaderUploadError(null);
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await whatsappAPI.uploadMedia(formData);
      if (uploadRes.data.success && uploadRes.data.local_url) {
        setTemplateImageUrl(uploadRes.data.local_url);
      } else {
        throw new Error(uploadRes.data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Template header upload failed', err);
      setTemplateHeaderUploadError(err?.response?.data?.error || err?.message || 'Image upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  // ============ UI Handlers ============
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContextMenu = (message: MessageLog, x: number, y: number) => {
    setContextMenu({ message, x, y });
  };

  const handleShowCaption = (message: MessageLog) => {
    const captionText = message.message_body || message.data?.caption || '';
    setMessageInput(captionText);
    setContextMenu(null);
  };

  const handleDeleteMessage = async (message: MessageLog) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await whatsappAPI.deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to delete message', err);
      alert('Failed to delete message. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  const handleQuotedClick = (quotedId: string) => {
    const element = document.getElementById(`msg-${quotedId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prevBg = (element as HTMLDivElement).style.background;
      (element as HTMLDivElement).style.background = 'var(--accent-bg-light)';
      setTimeout(() => {
        (element as HTMLDivElement).style.background = prevBg;
      }, 1200);
    }
  };

  const selectedHeaderComponent = selectedTemplate?.data?.components?.find((component: any) => String(component.type).toUpperCase() === 'HEADER');
  const hasImageHeader = String(selectedHeaderComponent?.format || '').toUpperCase() === 'IMAGE';
  const headerExampleImage = selectedHeaderComponent?.example?.header_handle;
  const headerExampleImageUrl = Array.isArray(headerExampleImage)
    ? String(headerExampleImage[0] || '')
    : String(headerExampleImage || '');
  const isHeaderImageRequired = hasImageHeader && !templateImageUrl.trim();

  // ============ Render ============
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--surface-color)',
        borderRadius: '0',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        fontFamily: 'var(--font-family)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '80px',
          background: 'var(--surface-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          paddingTop: '18px',
          borderRight: '1px solid var(--border-color)',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setIsSidebarExpanded(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            border: 'none',
            background: 'var(--surface-muted)',
            boxShadow: isDarkMode ? '0 10px 24px rgba(0, 0, 0, 0.3)' : '0 10px 24px rgba(15, 23, 42, 0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={20} color="var(--text-secondary)" />
        </button>
        {sidebarMenu.map((item) => {
          const isActive = item.path === location.pathname;
          return (
            <button
              key={item.name}
              type="button"
              title={item.name}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                border: 'none',
                background: isActive ? 'var(--accent-bg)' : 'var(--surface-muted)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isDarkMode ? '0 4px 14px rgba(0, 0, 0, 0.3)' : '0 4px 14px rgba(15, 23, 42, 0.06)',
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {isSidebarExpanded && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '280px',
            background: 'var(--surface-color)',
            zIndex: 1001,
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="var(--primary-color)" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>exbot</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarExpanded(false)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--surface-color)',
                boxShadow: isDarkMode ? '0 4px 10px rgba(0, 0, 0, 0.3)' : '0 4px 10px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {dashboardMenu.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarExpanded(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px' }}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact List Sidebar */}
      <ContactList
        contacts={contacts}
        activeContact={activeContact}
        blockedWaIds={blockedWaIds}
        currentFilter={contactFilter}
        searchTerm={searchTerm}
        loadingContacts={loadingContacts}
        onSearchChange={setSearchTerm}
        onLabelClick={(label) => setSearchTerm(label)}
        onSelectContact={(contact) => {
          setActiveContact(contact);
          setInspectorMessage(null);
        }}
        onAddContact={() => setShowAddContact(true)}
      />

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-color)',
          position: 'relative',
        }}
      >
        {activeContact ? (
          <>
            <div style={{ position: 'relative' }}>
              <ChatHeader
                activeContact={activeContact}
                onDeleteChat={() => handleDeleteContact(activeContact.id)}
                onBlockToggle={handleBlockToggle}
                isBlocked={isBlockedContact}
                isBlocking={blockActionInProgress}
              />
            </div>

            <MessageList
              messages={messages}
              activeContact={activeContact}
              loadingMessages={loadingMessages}
              inspectorMessage={inspectorMessage}
              sentReactions={sentReactions}
              onContextMenu={handleContextMenu}
              onQuotedClick={handleQuotedClick}
              messagesEndRef={messagesEndRef}
            />

            {/* Context Menu */}
            {contextMenu && (
              <ContextMenu
                message={contextMenu.message}
                x={contextMenu.x}
                y={contextMenu.y}
                onReaction={(emoji) => handleSendReaction(contextMenu.message, emoji)}
                onReply={() => {
                  const captionText = contextMenu.message.message_body || contextMenu.message.data?.caption || '';
                  setMessageInput(captionText);
                  setReplyToMessage(contextMenu.message);
                  setContextMenu(null);
                }}
                onShowCaption={() => handleShowCaption(contextMenu.message)}
                onCopy={() => {
                  navigator.clipboard.writeText(contextMenu.message.message_body || '');
                  setContextMenu(null);
                }}
                onViewPayload={() => {
                  setInspectorMessage(contextMenu.message);
                  setContextMenu(null);
                }}
                onDelete={() => handleDeleteMessage(contextMenu.message)}
                onClose={() => setContextMenu(null)}
              />
            )}

            <ActiveReplyBanner
              replyToMessage={replyToMessage}
              activeContact={activeContact}
              onClear={() => setReplyToMessage(null)}
            />

            <MessageInput
              messageInput={messageInput}
              onMessageChange={setMessageInput}
              onSendMessage={handleSendMessage}
              isRecording={recording.isRecording}
              recordingTime={recording.recordingTime}
              uploadingFile={uploadingFile}
              sending={sending}
              previewUrl={previewUrl}
              onPreviewUrlToggle={() => setPreviewUrl((v) => !v)}
              onFileSelect={handleFileSelect}
              onRemoveAttachment={handleRemoveAttachment}
              pendingAttachment={pendingAttachment}
              onStartRecording={recording.startRecording}
              onStopRecording={recording.stopRecording}
              onCancelRecording={recording.cancelRecording}
              onShowTemplates={() => {
                setShowTemplates(true);
                setTemplatePanelTab('message');
              }}
              onShowCannedResponse={() => {
                alert('Canned response feature coming soon.');
              }}
              activeContact={activeContact}
              isBlocked={isBlockedContact}
              micError={recording.error}
              onMicErrorClose={recording.clearError}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* JSON Inspector */}
      {inspectorMessage && <JSONInspector message={inspectorMessage} onClose={() => setInspectorMessage(null)} />}

      {/* Templates Modal */}
      {showTemplates && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '440px',
            background: 'var(--modal-bg)',
            borderLeft: '1px solid var(--border-color)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Send Flow or Message Template
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Choose a template and preview it before sending.
              </div>
            </div>
            <button
              onClick={() => {
                setShowTemplates(false);
                setSelectedTemplate(null);
                setTemplateImageUrl('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '16px 22px',
              borderBottom: '1px solid var(--border-soft)',
              overflowX: 'auto',
            }}
          >
            {[
              { key: 'bot_flow', label: 'Bot Flow' },
              { key: 'message', label: 'Message Template' },
              { key: 'whatsapp_flow', label: 'Whatsapp Flow' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTemplatePanelTab(tab.key as typeof templatePanelTab)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: templatePanelTab === tab.key ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: templatePanelTab === tab.key ? 'var(--accent-bg)' : 'transparent',
                  color: templatePanelTab === tab.key ? 'var(--surface-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {selectedTemplate ? (
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  ← Back to templates
                </button>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {templatePanelTab === 'message' && `${templates.length} template${templates.length === 1 ? '' : 's'} available`}
                  {templatePanelTab !== 'message' && 'Select a content type to begin'}
                </div>
              )}
              <button
                onClick={syncTemplates}
                style={{
                  background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                🔄 Sync Templates
              </button>
            </div>

            {!selectedTemplate && templatePanelTab === 'message' ? (
              templates.length === 0 ? (
                <div
                  style={{
                    borderRadius: '18px',
                    border: '1px dashed var(--border-color)',
                    padding: '28px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    minHeight: '260px',
                  }}
                >
                  <div>No templates available yet.</div>
                  <div style={{ fontSize: '12px' }}>Sync from Meta to load message templates.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {(templates as unknown as WhatsAppTemplate[]).map((template: any) => {
                    const typedTemplate = template as WhatsAppTemplate;
                    const currentSelectedTemplate = selectedTemplate as unknown as WhatsAppTemplate | null;
                    const isSelected = currentSelectedTemplate?.id === typedTemplate.id;
                    const templateComponents = typedTemplate.data?.components || [];
                    const headerComponent = templateComponents.find((component: any) => component.type === 'HEADER');
                    const bodyComponent = templateComponents.find((component: any) => component.type === 'BODY');
                    const footerComponent = templateComponents.find((component: any) => component.type === 'FOOTER');
                    const buttonComponents = templateComponents.filter((component: any) => ['BUTTON', 'BUTTONS'].includes(component.type));
                    const cardHasImageHeader = headerComponent?.format === 'IMAGE';
                    const headerText = headerComponent?.format === 'TEXT' ? headerComponent?.text || '' : '';
                    const bodyText = bodyComponent?.text || '';
                    const variableMatches = Array.from(new Set(bodyText.match(/{{(\d+)}}/g) || []));
                    const variableCount = variableMatches.length;
                    const bodyPreview = bodyText.length > 90 ? `${bodyText.slice(0, 90)}...` : bodyText;
                    const footerText = footerComponent?.text || '';
                    const buttonLabels = buttonComponents.flatMap((button: any) => {
                      if (button.type === 'BUTTONS' && Array.isArray(button.buttons)) {
                        return button.buttons.map((btn: any) => {
                          if (btn.text) return btn.text;
                          if (btn.title) return btn.title;
                          if (btn.type === 'PHONE_NUMBER' && btn.phone_number) return `Call ${btn.phone_number}`;
                          return btn.type || 'Button';
                        });
                      }
                      if (button.text) return [button.text];
                      if (button.title) return [button.title];
                      if (Array.isArray(button.parameters)) {
                        const paramText = button.parameters.find((param: any) => param.type === 'text')?.text;
                        if (paramText) return [paramText];
                      }
                      return [button.sub_type ? `${button.sub_type}` : 'Button'];
                    });

                    return (
                      <button
                        key={typedTemplate.id}
                        onClick={() => setSelectedTemplate(typedTemplate)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '18px',
                          border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--accent-bg)' : isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)',
                          padding: '18px',
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: '12px',
                          alignItems: 'start',
                        }}
                      >
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{typedTemplate.name}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                              <span>Language: {typedTemplate.language}</span>
                              <span>Status: {typedTemplate.status || 'PENDING'}</span>
                              <span>Type: {typedTemplate.category || 'Template'}</span>
                              {cardHasImageHeader && <span style={{ background: 'var(--success-bg)', color: 'var(--success-color)', padding: '4px 8px', borderRadius: '999px', fontSize: '11px' }}>IMAGE HEADER</span>}
                              {variableCount > 0 && <span style={{ background: 'var(--accent-bg)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '999px', fontSize: '11px' }}>{variableCount} variable{variableCount === 1 ? '' : 's'}</span>}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: '10px', padding: '14px', borderRadius: '16px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)' }}>
                            {cardHasImageHeader ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '74px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--success-bg) 0%, rgba(16,185,129,0.75) 100%)' }}>
                                <span style={{ color: 'var(--surface-color)', fontSize: '12px', fontWeight: 700 }}>media Header</span>
                              </div>
                            ) : headerText ? (
                              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, borderRadius: '12px', padding: '10px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg)' }}>
                                Header: {headerText}
                              </div>
                            ) : null}

                            {bodyPreview ? (
                              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{bodyPreview}</div>
                            ) : (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No body preview available.</div>
                            )}

                            {footerText && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                                Footer: {footerText}
                              </div>
                            )}

                            {buttonLabels.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {buttonLabels.map((label: string, idx: number) => (
                                  <span key={idx} style={{ background: 'var(--accent-bg)', color: 'var(--text-secondary)', borderRadius: '999px', padding: '4px 8px', fontSize: '11px' }}>
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--info-color)' }}>&gt;</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : templatePanelTab === 'bot_flow' ? (
              <div
                style={{
                  borderRadius: '18px',
                  border: '1px dashed var(--border-color)',
                  padding: '28px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: '260px',
                }}
              >
                Bot Flow cards can be added here once the flow list is available.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: '18px',
                  border: '1px dashed var(--border-color)',
                  padding: '28px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: '260px',
                }}
              >
                Whatsapp Flow selection is not yet available in this view.
              </div>
            )}

            <div
              style={{
                borderRadius: '18px',
                border: '1px solid var(--border-soft)',
                padding: '18px',
                background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {selectedTemplate ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTemplate.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        {selectedTemplate.language} · {selectedTemplate.status || 'PENDING'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--success-color)', fontWeight: 700 }}>{selectedTemplate.status === 'APPROVED' ? 'Approved' : 'Draft'}</span>
                    </div>
                  </div>

                  <div style={{ borderRadius: '16px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)', padding: '16px', minHeight: '220px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Template Preview</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedTemplate.data?.components?.map((component: any, index: number) => (
                        <div key={index} style={{ padding: '12px', borderRadius: '14px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)', border: '1px solid var(--border-soft)' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                            {component.type}
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                            {component.text || JSON.stringify(component.parameters || component, null, 2)}
                          </div>
                        </div>
                      )) || <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No preview data available.</div>}
                    </div>
                  </div>

                  {selectedTemplate.data?.components?.some((component: any) => component.type === 'HEADER' && component.format === 'IMAGE') && (
                    <div style={{ display: 'grid', gap: '10px', marginTop: '12px', padding: '14px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)', border: '1px solid var(--border-soft)', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>Header Image</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            This template requires an IMAGE header. Upload an image before sending.
                          </div>
                        </div>
                        <button
                          onClick={() => templateHeaderFileInputRef.current?.click()}
                          disabled={uploadingFile}
                          style={{
                            background: 'var(--accent-color)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'var(--surface-color)',
                            padding: '10px 14px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {uploadingFile ? 'Uploading...' : 'Upload Image'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Upload your image</div>
                          <div style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Upload an image file to satisfy the IMAGE header requirement.
                          </div>
                        </div>

                        {headerExampleImageUrl ? (
                          <div style={{ display: 'grid', gap: '6px', padding: '14px', borderRadius: '16px', background: isDarkMode ? 'var(--surface-muted)' : 'var(--accent-bg-soft)', border: '1px solid var(--border-soft)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>Reference sample image URL</div>
                            <textarea
                              readOnly
                              value={headerExampleImageUrl}
                              style={{
                                width: '100%',
                                minHeight: '72px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: isDarkMode ? 'var(--surface-hover)' : 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                padding: '12px',
                                fontSize: '12px',
                                resize: 'vertical',
                              }}
                            />
                          </div>
                        ) : null}
                      </div>

                      {templateHeaderUploadError && (
                        <div style={{ color: 'var(--danger-color)', fontSize: '12px' }}>{templateHeaderUploadError}</div>
                      )}
                    </div>
                  )}

                  {templateBodyParams.length > 0 && (
                    <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Fill template variables before sending:</div>
                      {templateBodyParams.map((value, index) => (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Variable {'{{'}{index + 1}{'}}'}
                          </label>
                          <input
                            value={value}
                            onChange={(e) => {
                              const params = [...templateBodyParams];
                              params[index] = e.target.value;
                              setTemplateBodyParams(params);
                            }}
                            placeholder={`Value for {{${index + 1}}}`}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => selectedTemplate && handleSendTemplate(selectedTemplate.name, selectedTemplate.language)}
                      disabled={!selectedTemplate || sending || isHeaderImageRequired}
                      style={{
                        flex: 1,
                        minWidth: '160px',
                        background: isHeaderImageRequired ? 'var(--danger-color)' : 'var(--accent-color)',
                        border: 'none',
                        borderRadius: '14px',
                        color: 'var(--surface-color)',
                        padding: '14px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: isHeaderImageRequired ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isHeaderImageRequired ? 'Upload Image to Send' : 'Send Template'}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      style={{
                        flex: 1,
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '14px',
                        color: 'var(--text-primary)',
                        padding: '14px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-secondary)', textAlign: 'center', minHeight: '220px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Select a template to preview</div>
                  <div style={{ fontSize: '12px' }}>Click on a template card to see its details and send options.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={templateHeaderFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleTemplateHeaderFileChange}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSubmit={handleAddManualContact}
        contactName={newContactName}
        onNameChange={setNewContactName}
        contactPhone={newContactPhone}
        onPhoneChange={setNewContactPhone}
      />
    </div>
  );
};

export default LiveChat;
