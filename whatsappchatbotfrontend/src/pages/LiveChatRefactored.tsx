import React, { useState, useEffect, useRef } from 'react';
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
import type { ContactInfo, MessageLog, WhatsAppTemplate } from '../types';
import { whatsappAPI } from '../api';
import { useRecording } from '../hooks/useRecording';

const LiveChat: React.FC = () => {
  // ============ State Management ============
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  // Loading states
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // UI states
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState('');

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
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  // Recording hook
  const recording = useRecording();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ============ Effects ============
  useEffect(() => {
    fetchContacts();
    fetchTemplates();
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
    scrollToBottom();
  }, [messages]);

  // ============ API Methods ============
  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await whatsappAPI.fetchContacts();
      setContacts(res.data);
      if (res.data.length > 0 && !activeContact) {
        setActiveContact(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const pollContacts = async () => {
    try {
      const res = await whatsappAPI.fetchContacts();
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

  // ============ Message Methods ============
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeContact || sending) return;

    setSending(true);
    const text = messageInput.trim();
    setMessageInput('');

    try {
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
      }
    } catch (err: any) {
      console.error('Send message failed', err);
      const errRes = err.response?.data?.meta_response || { error: 'Meta endpoint rejected message dispatch' };
      const errorLog: MessageLog = {
        id: Date.now(),
        contact_wa_id: activeContact.wa_id,
        is_incoming: false,
        status: 'failed',
        message_body: text,
        message_type: 'text',
        messaged_at: new Date().toISOString(),
        data: errRes,
      };
      setInspectorMessage(errorLog);
      alert('Failed to send WhatsApp message. View Inspector for raw Meta error.');
    } finally {
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
      setActiveContact(null);
      setMessages([]);
      fetchContacts();
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
    if (!activeContact) return;
    setShowTemplates(false);
    setSending(true);

    try {
      // Construct correct Meta WhatsApp Cloud API template payload
      const templatePayload = {
        name: templateName,
        language: {
          code: language,
        },
        components: [],
      };

      // Send template with optional custom image URL
      const res = await whatsappAPI.sendTemplate(
        activeContact.wa_id, 
        templatePayload,
        templateImageUrl.trim() || undefined  // Pass image URL if provided
      );

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

  const handleDeleteTemplate = async (templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete the template "${templateName}" from Meta? This action cannot be undone.`)) {
      return;
    }
    try {
      await whatsappAPI.deleteTemplate(templateName);
      alert('Template successfully deleted from Meta!');
      fetchTemplates();
    } catch (err: any) {
      console.error('Delete template failed', err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.error || 'Unknown error';
      alert(`Template deletion failed: ${errMsg}`);
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

  const handleFileUpload = async (file: File) => {
    if (!activeContact) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await whatsappAPI.uploadMedia(formData);
      if (uploadRes.data.success && uploadRes.data.media_id) {
        const mime = uploadRes.data.mime_type || '';
        let msgType = 'document';
        if (mime.startsWith('image/')) msgType = 'image';
        else if (mime.startsWith('video/')) msgType = 'video';
        else if (mime.startsWith('audio/')) msgType = 'audio';

        const sendRes = await whatsappAPI.sendMessage(activeContact.wa_id, file.name, {
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
            is_incoming: false,
            status: 'sent',
            message_body: file.name,
            message_type: msgType,
            attachment: uploadRes.data.local_url,
            messaged_at: new Date().toISOString(),
            data: sendRes.data.meta_response,
          };
          setInspectorMessage(newLog);
        }
      }
    } catch (err: any) {
      console.error('File upload failed', err);
      alert('Failed uploading attachment to WhatsApp cloud.');
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

  const handleQuotedClick = (quotedId: string) => {
    const element = document.getElementById(`msg-${quotedId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prevBg = (element as HTMLDivElement).style.background;
      (element as HTMLDivElement).style.background = 'rgba(83, 189, 235, 0.4)';
      setTimeout(() => {
        (element as HTMLDivElement).style.background = prevBg;
      }, 1200);
    }
  };

  // ============ Render ============
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        background: 'var(--surface-color)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Contact List Sidebar */}
      <ContactList
        contacts={contacts}
        activeContact={activeContact}
        searchTerm={searchTerm}
        loadingContacts={loadingContacts}
        onSearchChange={setSearchTerm}
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
          background: '#0b141a',
          position: 'relative',
        }}
      >
        {activeContact ? (
          <>
            <ChatHeader
              activeContact={activeContact}
              onShowTemplates={() => setShowTemplates(true)}
              onDeleteChat={() => handleDeleteContact(activeContact.id)}
            />

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
                  setReplyToMessage(contextMenu.message);
                  setContextMenu(null);
                }}
                onCopy={() => {
                  navigator.clipboard.writeText(contextMenu.message.message_body || '');
                  setContextMenu(null);
                }}
                onViewPayload={() => {
                  setInspectorMessage(contextMenu.message);
                  setContextMenu(null);
                }}
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
              attachmentMenuOpen={attachmentMenuOpen}
              onPreviewUrlToggle={() => setPreviewUrl((v) => !v)}
              onAttachmentMenuToggle={() => setAttachmentMenuOpen((prev) => !prev)}
              onFileSelect={handleFileUpload}
              onStartRecording={recording.startRecording}
              onStopRecording={recording.stopRecording}
              onCancelRecording={recording.cancelRecording}
              onSendMediaUrl={() => {}}
              activeContact={activeContact}
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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Send WhatsApp Template
              </h3>
              <button
                onClick={() => {
                  setShowTemplates(false);
                  setTemplateImageUrl(''); // Reset image URL when closing
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

            {/* Image URL Input for templates with IMAGE header */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Custom Image URL (optional - for templates with IMAGE header)
              </label>
              <input
                type="text"
                placeholder="Paste image URL or leave blank for default"
                value={templateImageUrl}
                onChange={(e) => setTemplateImageUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 0 0' }}>
                💡 If blank, default image will be used
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {templates.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    padding: '40px 20px',
                  }}
                >
                  <p style={{ marginBottom: '16px' }}>No templates available</p>
                  <button
                    onClick={syncTemplates}
                    style={{
                      background: 'var(--primary-color)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    Sync from Meta
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={syncTemplates}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    🔄 Sync Meta Templates
                  </button>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                          }}
                        >
                          {template.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '8px',
                          }}
                        >
                          <span>📋 {template.language}</span>
                          <span>•</span>
                          <span style={{ color: template.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                            {template.status || 'PENDING'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleSendTemplate(template.name, template.language)}
                          disabled={sending}
                          style={{
                            background: 'var(--primary-color)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          Send
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.name)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
