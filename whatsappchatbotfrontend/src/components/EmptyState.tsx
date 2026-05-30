import React from 'react';
import { MessageSquare } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-secondary)',
      }}
    >
      <MessageSquare size={64} style={{ opacity: 0.1 }} />
      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>WhatsApp CRM Live Chat</h3>
      <p style={{ fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
        Select a conversation from the list to start messaging in real-time.
      </p>
    </div>
  );
};
