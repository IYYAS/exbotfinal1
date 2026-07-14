import React, { useEffect, useRef, useState } from 'react';
import { Send, Link2, Trash2, Mic, Plus, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import type { ContactInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MessageInputProps {
  messageInput: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isRecording: boolean;
  recordingTime: number;
  uploadingFile: boolean;
  sending: boolean;
  previewUrl: boolean;
  onPreviewUrlToggle: () => void;
  onFileSelect: (file: File) => void;
  onRemoveAttachment: () => void;
  pendingAttachment: { previewUrl: string; name: string; type: string } | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onShowTemplates: () => void;
  onShowCannedResponse: () => void;
  activeContact: ContactInfo | null;
  isBlocked: boolean;
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
  onPreviewUrlToggle,
  onFileSelect,
  onRemoveAttachment,
  pendingAttachment,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onShowTemplates,
  onShowCannedResponse,
  isBlocked,
  micError,
  onMicErrorClose,
}) => {
  const { isDarkMode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlusMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onMessageChange(`${messageInput}${emojiData.emoji}`);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
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
        <div style={{ position: 'relative' }}>
          {isBlocked && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '24px',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#f8fafc',
                textAlign: 'center',
                borderRadius: '0 0 0 0',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(239, 68, 68, 0.12)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Blocked user</div>
              <div style={{ maxWidth: '380px', color: '#cbd5e1', fontSize: '13px' }}>
                This conversation is blocked by WhatsApp Cloud API. Messages cannot be sent until the contact is unblocked.
              </div>
            </div>
          )}

          {pendingAttachment && (
        <div
          style={{
            margin: '0 18px 10px',
            background: '#111b22',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: 72, minWidth: 72, height: 72, borderRadius: '16px', overflow: 'hidden', background: '#0f1720' }}>
            {pendingAttachment.type.startsWith('image/') ? (
              <img
                src={pendingAttachment.previewUrl}
                alt={pendingAttachment.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '10px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  textAlign: 'center',
                }}
              >
                {pendingAttachment.name}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              {pendingAttachment.type.startsWith('image/') ? 'Image selected' : 'Attachment selected'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingAttachment.name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
              Add a caption below before sending.
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveAttachment}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: '#1f2937',
              color: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      <form
            onSubmit={onSendMessage}
            style={{
              padding: '16px 18px',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: isBlocked ? 0.5 : 1,
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: '#ffffff',
                borderRadius: '32px',
                boxShadow: '0 10px 40px rgba(15, 23, 42, 0.08)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
              }}
            >
              <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu((v) => !v);
                    setShowEmojiPicker(false);
                  }}
                  disabled={sending}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#f8fafc',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={20} />
                </button>

                {showPlusMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '52px',
                      left: 0,
                      width: '240px',
                      background: '#ffffff',
                      borderRadius: '18px',
                      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
                      overflow: 'hidden',
                      zIndex: 100,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        onShowTemplates();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#0f172a',
                        fontWeight: 700,
                      }}
                    >
                      📩 Send Flow or Message Template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        onShowCannedResponse();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      AB Canned Response
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        fileInputRef.current?.click();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      📎 File Attachment
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f8fafc',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Smile size={20} />
              </button>

              <input
                type="text"
                placeholder={pendingAttachment ? 'Add a caption...' : "Type a message... (For canned response type '/')"}
                value={messageInput}
                onChange={(e) => onMessageChange(e.target.value)}
                disabled={isBlocked}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#475569',
                  padding: '0',
                  fontSize: '14px',
                  fontFamily: 'var(--font-family)',
                }}
              />

              <button
                type="button"
                onClick={onPreviewUrlToggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: previewUrl ? '#6366f1' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                }}
              >
                <Link2 size={18} />
              </button>

              <button
                type="button"
                onClick={isBlocked ? undefined : onStartRecording}
                disabled={isBlocked || sending || uploadingFile}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isBlocked ? '#94a3b8' : '#10b981',
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                }}
              >
                <Mic size={18} />
              </button>
            </div>

            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '72px',
                  left: '16px',
                  zIndex: 50,
                  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.18)',
                  borderRadius: '18px',
                  overflow: 'hidden',
                }}
              >
                <EmojiPicker onEmojiClick={handleEmojiClick} theme={isDarkMode ? Theme.DARK : Theme.LIGHT} />
              </div>
            )}

            <button
              type="submit"
              disabled={sending || uploadingFile || isBlocked || (!messageInput.trim() && !pendingAttachment)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: 'none',
                background: isBlocked ? '#a78bfa' : '#7c3aed',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: sending || uploadingFile || isBlocked || (!messageInput.trim() && !pendingAttachment) ? 'not-allowed' : 'pointer',
                boxShadow: '0 16px 48px rgba(124, 58, 237, 0.24)',
                opacity: sending || uploadingFile || isBlocked || (!messageInput.trim() && !pendingAttachment) ? 0.7 : 1,
              }}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
