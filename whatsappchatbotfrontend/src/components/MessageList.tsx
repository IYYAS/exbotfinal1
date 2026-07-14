import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import type { MessageLog, ContactInfo } from '../types';
import { MessageBubble } from './MessageBubble';
import { useTheme } from '../context/ThemeContext';

interface MessageListProps {
  messages: MessageLog[];
  activeContact: ContactInfo | null;
  loadingMessages: boolean;
  inspectorMessage: MessageLog | null;
  sentReactions: Record<string, string>;
  onContextMenu: (message: MessageLog, x: number, y: number) => void;
  onQuotedClick: (quotedId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeContact,
  loadingMessages,
  inspectorMessage,
  sentReactions,
  onContextMenu,
  onQuotedClick,
  messagesEndRef,
}) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {loadingMessages ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="spin" color="var(--primary-color)" />
        </div>
      ) : messages.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <MessageSquare size={48} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: '13px' }}>Start your conversations by template or quick reply.</span>
        </div>
      ) : (
        messages.map((m) => {
          const isInspectorTarget = inspectorMessage?.id === m.id;
          const quotedId = m.data?.context?.id || m.data?.reply_to_message_id;
          const parentMsg = quotedId ? messages.find((msg) => msg.wamid === quotedId) : null;

          const sentEmoji = m.wamid ? sentReactions[m.wamid] : undefined;
          const incomingReactionMsg = m.wamid
            ? messages.find((r) => r.message_type === 'reaction' && r.data?.reaction?.message_id === m.wamid)
            : undefined;
          const incomingEmoji = incomingReactionMsg?.data?.reaction?.emoji;
          const reactionBadge = sentEmoji || incomingEmoji;

          return (
            <MessageBubble
              key={m.id}
              message={m}
              activeContact={activeContact}
              isInspectorTarget={isInspectorTarget}
              parentMsg={parentMsg || null}
              reactionBadge={reactionBadge}
              incomingEmoji={incomingEmoji}
              sentEmoji={sentEmoji}
              onContextMenu={(e, msg) => {
                e.preventDefault();
                onContextMenu(msg, e.clientX, e.clientY);
              }}
              onQuotedClick={onQuotedClick}
            />
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
