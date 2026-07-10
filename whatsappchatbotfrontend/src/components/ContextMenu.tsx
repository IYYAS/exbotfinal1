import React from 'react';
import { Terminal, Trash2, CornerUpLeft } from 'lucide-react';
import type { MessageLog } from '../types';

interface ContextMenuProps {
  message: MessageLog;
  x: number;
  y: number;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onViewPayload: () => void;
  onClose: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onReaction,
  onReply,
  onCopy,
  onViewPayload,
  onClose,
}) => {
  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          top: Math.min(y, window.innerHeight - 320),
          left: Math.min(x, window.innerWidth - 220),
          zIndex: 200,
          background: '#233138',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          minWidth: '200px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emoji Reactions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '10px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: '#1d2b33',
          }}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <span
              key={emoji}
              onClick={() => {
                onReaction(emoji);
                onClose();
              }}
              style={{
                fontSize: '22px',
                cursor: 'pointer',
                display: 'inline-block',
                transition: 'transform 0.12s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLSpanElement).style.transform = 'scale(1.4)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLSpanElement).style.transform = 'scale(1)')}
            >
              {emoji}
            </span>
          ))}
          <span
            style={{
              fontSize: '18px',
              cursor: 'pointer',
              color: '#8696a0',
              fontWeight: 'bold',
              userSelect: 'none',
            }}
            title="More reactions"
          >
            +
          </span>
        </div>

        {/* Actions */}
        {[
          {
            icon: <CornerUpLeft size={15} />,
            label: 'Reply',
            action: onReply,
          },
          {
            icon: <span style={{ fontSize: '14px' }}>📋</span>,
            label: 'Copy',
            action: onCopy,
          },
          {
            icon: <Terminal size={15} />,
            label: 'View API Payload',
            action: onViewPayload,
            color: '#34d399',
          },
          {
            icon: <span style={{ fontSize: '14px' }}>⭐</span>,
            label: 'Star',
            action: onClose,
          },
          {
            icon: <Trash2 size={15} />,
            label: 'Delete',
            action: onClose,
            color: '#ef4444',
          },
        ].map(({ icon, label, action, color }) => (
          <div
            key={label}
            onClick={action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '13px 18px',
              cursor: 'pointer',
              color: color || '#e9edef',
              fontSize: '14px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
          >
            {icon} {label}
          </div>
        ))}
      </div>
    </>
  );
};
