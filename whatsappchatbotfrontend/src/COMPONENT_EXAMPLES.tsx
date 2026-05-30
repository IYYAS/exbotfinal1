/**
 * Example Usage of Refactored Components
 * 
 * This file demonstrates how to use the extracted components
 * in different contexts and scenarios.
 */

import React, { useState, useRef } from 'react';
import {
  ContactList,
  MessageBubble,
  MessageInput,
  ContextMenu,
  JSONInspector,
  ChatHeader,
  ActiveReplyBanner,
  EmptyState,
  AddContactModal,
} from '../components';
import type { ContactInfo, MessageLog } from '../types';
import { useRecording } from '../hooks/useRecording';

// ============================================================================
// Example 1: Using ContactList as a standalone component
// ============================================================================
export const ContactListExample: React.FC = () => {
  const [contacts] = useState<ContactInfo[]>([
    {
      id: 1,
      wa_id: '919876543210',
      first_name: 'John',
      last_name: 'Doe',
      unread_messages_count: 3,
      last_messaged_at: new Date().toISOString(),
    },
  ]);

  const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <ContactList
      contacts={contacts}
      activeContact={activeContact}
      searchTerm={searchTerm}
      loadingContacts={false}
      onSearchChange={setSearchTerm}
      onSelectContact={setActiveContact}
      onAddContact={() => alert('Add contact clicked')}
    />
  );
};

// ============================================================================
// Example 2: Using MessageInput with Recording
// ============================================================================
export const MessageInputExample: React.FC = () => {
  const [messageInput, setMessageInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState(false);
  const recording = useRecording();

  const handleFileSelect = (file: File) => {
    console.log('Selected file:', file.name);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Message:', messageInput);
    setMessageInput('');
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <MessageInput
        messageInput={messageInput}
        onMessageChange={setMessageInput}
        onSendMessage={handleSendMessage}
        isRecording={recording.isRecording}
        recordingTime={recording.recordingTime}
        uploadingFile={false}
        sending={false}
        previewUrl={previewUrl}
        attachmentMenuOpen={false}
        onPreviewUrlToggle={() => setPreviewUrl(!previewUrl)}
        onAttachmentMenuToggle={() => {}}
        onFileSelect={handleFileSelect}
        onStartRecording={recording.startRecording}
        onStopRecording={recording.stopRecording}
        onCancelRecording={recording.cancelRecording}
        onSendMediaUrl={() => {}}
        activeContact={null}
        micError={recording.error}
        onMicErrorClose={recording.clearError}
      />
    </div>
  );
};

// ============================================================================
// Example 3: Using MessageBubble with different message types
// ============================================================================
export const MessageBubbleExample: React.FC = () => {
  const textMessage: MessageLog = {
    id: 1,
    contact_wa_id: '919876543210',
    wamid: 'wamid.123',
    is_incoming: true,
    status: 'read',
    message_body: 'Hey! How are you doing?',
    message_type: 'text',
    messaged_at: new Date().toISOString(),
    data: {},
  };

  const imageMessage: MessageLog = {
    id: 2,
    contact_wa_id: '919876543210',
    wamid: 'wamid.124',
    is_incoming: false,
    status: 'delivered',
    message_body: 'Check out this image',
    message_type: 'image',
    attachment: '/media/image.jpg',
    messaged_at: new Date().toISOString(),
    data: {},
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <MessageBubble
        message={textMessage}
        activeContact={null}
        isInspectorTarget={false}
        parentMsg={null}
        reactionBadge={undefined}
        incomingEmoji={undefined}
        sentEmoji={undefined}
        onContextMenu={() => {}}
        onQuotedClick={() => {}}
      />

      <MessageBubble
        message={imageMessage}
        activeContact={null}
        isInspectorTarget={false}
        parentMsg={null}
        reactionBadge="👍"
        incomingEmoji={undefined}
        sentEmoji="👍"
        onContextMenu={() => {}}
        onQuotedClick={() => {}}
      />
    </div>
  );
};

// ============================================================================
// Example 4: Using ContextMenu for message actions
// ============================================================================
export const ContextMenuExample: React.FC = () => {
  const message: MessageLog = {
    id: 1,
    contact_wa_id: '919876543210',
    wamid: 'wamid.123',
    is_incoming: true,
    status: 'read',
    message_body: 'This is a test message',
    message_type: 'text',
    messaged_at: new Date().toISOString(),
    data: {},
  };

  return (
    <ContextMenu
      message={message}
      x={100}
      y={100}
      onReaction={(emoji) => console.log('Reaction:', emoji)}
      onReply={() => console.log('Reply clicked')}
      onCopy={() => console.log('Copy clicked')}
      onViewPayload={() => console.log('View payload clicked')}
      onClose={() => console.log('Menu closed')}
    />
  );
};

// ============================================================================
// Example 5: Using JSONInspector for API debugging
// ============================================================================
export const JSONInspectorExample: React.FC = () => {
  const message: MessageLog = {
    id: 1,
    contact_wa_id: '919876543210',
    wamid: 'wamid.123',
    is_incoming: false,
    status: 'sent',
    message_body: 'Test message',
    message_type: 'text',
    messaged_at: new Date().toISOString(),
    data: {
      meta_response: {
        messages: [
          {
            id: 'wamid.123',
          },
        ],
        contacts: [
          {
            input: '+919876543210',
            wa_id: '919876543210',
          },
        ],
      },
    },
  };

  return <JSONInspector message={message} onClose={() => console.log('Inspector closed')} />;
};

// ============================================================================
// Example 6: Using the Recording Hook directly
// ============================================================================
export const RecordingHookExample: React.FC = () => {
  const recording = useRecording();

  const handleRecordAudio = async () => {
    await recording.startRecording();
  };

  const handleStopAndSave = () => {
    const audioBlob = recording.stopRecording();
    if (audioBlob) {
      console.log('Audio blob:', audioBlob);
      // Send to API or save to file
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button onClick={handleRecordAudio} disabled={recording.isRecording}>
        {recording.isRecording ? 'Recording...' : 'Start Recording'}
      </button>

      {recording.isRecording && (
        <div>
          <p>Recording time: {Math.floor(recording.recordingTime / 60)}:{String(recording.recordingTime % 60).padStart(2, '0')}</p>
          <button onClick={handleStopAndSave}>Stop & Save</button>
          <button onClick={recording.cancelRecording}>Cancel</button>
        </div>
      )}

      {recording.error && <p style={{ color: 'red' }}>{recording.error}</p>}
    </div>
  );
};

// ============================================================================
// Example 7: Creating a custom chat component using extracted components
// ============================================================================
export const CustomChatComponent: React.FC<{ contactId: number }> = ({ contactId }) => {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageLog | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recording = useRecording();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ChatHeader
        activeContact={activeContact}
        onShowTemplates={() => console.log('Templates')}
        onDeleteChat={() => console.log('Delete')}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            activeContact={activeContact}
            isInspectorTarget={false}
            parentMsg={null}
            reactionBadge={undefined}
            incomingEmoji={undefined}
            sentEmoji={undefined}
            onContextMenu={() => {}}
            onQuotedClick={() => {}}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {replyToMessage && (
        <ActiveReplyBanner
          replyToMessage={replyToMessage}
          activeContact={activeContact}
          onClear={() => setReplyToMessage(null)}
        />
      )}

      <MessageInput
        messageInput={messageInput}
        onMessageChange={setMessageInput}
        onSendMessage={(e) => {
          e.preventDefault();
          console.log('Send:', messageInput);
          setMessageInput('');
        }}
        isRecording={recording.isRecording}
        recordingTime={recording.recordingTime}
        uploadingFile={false}
        sending={false}
        previewUrl={false}
        attachmentMenuOpen={false}
        onPreviewUrlToggle={() => {}}
        onAttachmentMenuToggle={() => {}}
        onFileSelect={() => {}}
        onStartRecording={recording.startRecording}
        onStopRecording={recording.stopRecording}
        onCancelRecording={recording.cancelRecording}
        onSendMediaUrl={() => {}}
        activeContact={activeContact}
        micError={recording.error}
        onMicErrorClose={recording.clearError}
      />
    </div>
  );
};

// ============================================================================
// Export all examples
// ============================================================================
export const EXAMPLES = {
  ContactListExample,
  MessageInputExample,
  MessageBubbleExample,
  ContextMenuExample,
  JSONInspectorExample,
  RecordingHookExample,
  CustomChatComponent,
};
