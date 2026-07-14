import React from 'react';
import { X } from 'lucide-react';
import type { MessageLog, ContactInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ActiveReplyBannerProps {
  replyToMessage: MessageLog | null;
  activeContact: ContactInfo | null;
  onClear: () => void;
}

export const ActiveReplyBanner: React.FC<ActiveReplyBannerProps> = ({
  replyToMessage,
  activeContact,
  onClear,
}) => {
  const { isDarkMode } = useTheme();
  if (!replyToMessage) return null;

  const getMessagePreviewText = (message: MessageLog) =>
    message.message_body || message.data?.caption || `[${message.message_type.toUpperCase()} Attachment]`;

  return (
    <div
      style={{
        background: isDarkMode ? '#182229' : '#f0f9ff',
        borderLeft: '4px solid #53bdeb',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#53bdeb' }}>
          {replyToMessage.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
        </span>
        <span
          style={{
            fontSize: '13px',
            color: isDarkMode ? '#8696a0' : '#475569',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '500px',
          }}
        >
          {getMessagePreviewText(replyToMessage)}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          color: isDarkMode ? '#8696a0' : '#475569',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
