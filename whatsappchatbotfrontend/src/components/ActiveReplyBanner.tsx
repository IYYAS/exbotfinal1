import React from 'react';
import { X } from 'lucide-react';
import type { MessageLog, ContactInfo } from '../types';

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
  if (!replyToMessage) return null;

  return (
    <div
      style={{
        background: '#182229',
        borderLeft: '4px solid #53bdeb',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#53bdeb' }}>
          {replyToMessage.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
        </span>
        <span
          style={{
            fontSize: '13px',
            color: '#8696a0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '500px',
          }}
        >
          {replyToMessage.message_body || `[${replyToMessage.message_type.toUpperCase()} Attachment]`}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          color: '#8696a0',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
