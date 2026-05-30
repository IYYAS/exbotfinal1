import React, { useRef } from 'react';
import { Send, Paperclip, Link2, Loader2, Trash2 } from 'lucide-react';
import type { ContactInfo } from '../types';

interface MessageInputProps {
  messageInput: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isRecording: boolean;
  recordingTime: number;
  uploadingFile: boolean;
  sending: boolean;
  previewUrl: boolean;
  attachmentMenuOpen: boolean;
  onPreviewUrlToggle: () => void;
  onAttachmentMenuToggle: () => void;
  onFileSelect: (file: File) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendMediaUrl: (type: 'image' | 'video' | 'audio' | 'document', url: string) => void;
  activeContact: ContactInfo | null;
  micError: string;
  onMicErrorClose: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  messageInput,
  onMessageChange,
  onSendMessage,
  isRecording,
  recordingTime,
  uploadingFile,
  sending,
  previewUrl,
  attachmentMenuOpen,
  onPreviewUrlToggle,
  onAttachmentMenuToggle,
  onFileSelect,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  activeContact,
  micError,
  onMicErrorClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <>
      {/* Mic error toast */}
      {micError && (
        <div
          style={{
            background: '#2d1b1b',
            borderLeft: '4px solid #ef5350',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span style={{ color: '#ef9a9a', fontSize: '13px' }}>🎙️ {micError}</span>
          <button
            onClick={onMicErrorClose}
            style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Recording bar */}
      {isRecording && (
        <div
          style={{
            padding: '10px 24px',
            background: '#202c33',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <button
            type="button"
            onClick={onCancelRecording}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef5350',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <Trash2 size={22} />
          </button>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ef5350',
              flexShrink: 0,
              animation: 'blink 1s infinite',
            }}
          />
          <span style={{ color: '#e9edef', fontSize: 14, minWidth: 38 }}>
            {formatRecordingTime(recordingTime)}
          </span>
          <div style={{ flex: 1, height: 3, background: '#2a3942', borderRadius: 2 }} />
          <button
            type="button"
            onClick={onStopRecording}
            style={{
              background: '#00a884',
              border: 'none',
              borderRadius: '50%',
              width: 42,
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <Send size={18} />
          </button>
        </div>
      )}

      {/* Input form */}
      {!isRecording && (
        <form
          onSubmit={onSendMessage}
          style={{
            padding: '12px 24px',
            background: '#202c33',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Attachment button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={onAttachmentMenuToggle}
              disabled={uploadingFile || sending}
              style={{
                background: 'none',
                border: 'none',
                color: '#8696a0',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: attachmentMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {uploadingFile ? <Loader2 size={20} className="spin" /> : <Paperclip size={20} />}
            </button>
          </div>

          {/* Link Preview Toggle */}
          <button
            type="button"
            onClick={onPreviewUrlToggle}
            style={{
              background: previewUrl ? 'rgba(83,189,235,0.18)' : 'none',
              border: previewUrl ? '1px solid #53bdeb' : '1px solid transparent',
              color: previewUrl ? '#53bdeb' : '#8696a0',
              cursor: 'pointer',
              padding: '5px 8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <Link2 size={14} />
            {previewUrl ? 'ON' : 'OFF'}
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => onMessageChange(e.target.value)}
            style={{
              flex: 1,
              background: '#2a3942',
              border: 'none',
              outline: 'none',
              borderRadius: '8px',
              color: '#e9edef',
              padding: '10px 16px',
              fontSize: '14.5px',
            }}
          />

          {/* Send / Mic button */}
          <button
            type={messageInput.trim() ? 'submit' : 'button'}
            onClick={!messageInput.trim() ? onStartRecording : undefined}
            disabled={sending || uploadingFile}
            style={{
              backgroundColor: '#00a884',
              color: '#ffffff',
              border: 'none',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {messageInput.trim() ? <Send size={18} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.52 0 10 3.13 10 7v6c0 3.87-4.48 7-10 7s-10-3.13-10-7v-6c0-3.87 4.48-7 10-7m0 2c-4.41 0-8 2.69-8 6v6c0 3.31 3.59 6 8 6s8-2.69 8-6v-6c0-3.31-3.59-6-8-6z"/></svg>}
          </button>
        </form>
      )}
    </>
  );
};
