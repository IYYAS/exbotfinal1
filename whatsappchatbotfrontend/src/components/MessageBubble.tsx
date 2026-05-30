import React from 'react';
import { Check, CheckCheck, AlertCircle, Download } from 'lucide-react';
import type { MessageLog, ContactInfo } from '../types';
import { BACKEND_URL } from '../api';

interface MessageBubbleProps {
  message: MessageLog;
  activeContact: ContactInfo | null;
  isInspectorTarget: boolean;
  parentMsg: MessageLog | null;
  reactionBadge: string | undefined;
  incomingEmoji: string | undefined;
  sentEmoji: string | undefined;
  onContextMenu: (e: React.MouseEvent, message: MessageLog) => void;
  onQuotedClick: (quotedId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  activeContact,
  isInspectorTarget,
  parentMsg,
  reactionBadge,
  incomingEmoji,
  sentEmoji,
  onContextMenu,
  onQuotedClick,
}) => {
  const isIncoming = message.is_incoming;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck size={16} color="#53bdeb" />;
      case 'delivered':
        return <CheckCheck size={16} color="#8696a0" />;
      case 'sent':
        return <Check size={16} color="#8696a0" />;
      case 'failed':
        return <AlertCircle size={16} color="#ef4444" />;
      default:
        return <Check size={16} color="#8696a0" style={{ opacity: 0.5 }} />;
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      id={message.wamid ? `msg-${message.wamid}` : undefined}
      style={{
        alignSelf: isIncoming ? 'flex-start' : 'flex-end',
        maxWidth: '65%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Message Bubble */}
      <div
        style={{
          background: isIncoming ? '#202c33' : '#005c4b',
          color: '#e9edef',
          borderRadius: '12px',
          padding: '8px 12px',
          fontSize: '14.5px',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          position: 'relative',
          border: isInspectorTarget ? '2px solid #53bdeb' : 'none',
          cursor: 'context-menu',
          userSelect: 'text',
        }}
        onContextMenu={(e) => onContextMenu(e, message)}
      >
        {/* Quoted Message */}
        {parentMsg && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onQuotedClick(parentMsg.wamid || '');
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.18)',
              borderLeft: '4px solid #53bdeb',
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '6px',
              fontSize: '12.5px',
              color: '#8696a0',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#53bdeb', fontSize: '11px' }}>
              {parentMsg.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
            </span>
            <span
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '350px',
              }}
            >
              {parentMsg.message_body}
            </span>
          </div>
        )}

        {/* Attachment */}
        {message.attachment && (() => {
          const attachUrl = message.attachment.startsWith('http')
            ? message.attachment
            : message.attachment.startsWith('/media/')
            ? `${BACKEND_URL}${message.attachment}`
            : `${BACKEND_URL}/media/${message.attachment}`;

          if (message.message_type === 'image' || message.message_type === 'sticker') {
            return (
              <img
                src={attachUrl}
                alt="attachment"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  marginBottom: message.message_body ? '8px' : '0',
                  display: 'block',
                }}
              />
            );
          }

          if (message.message_type === 'video') {
            return (
              <video
                src={attachUrl}
                controls
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
              />
            );
          }

          if (message.message_type === 'audio' || message.message_type === 'voice') {
            return (
              <audio
                src={attachUrl}
                controls
                style={{
                  maxWidth: '100%',
                  marginBottom: '8px',
                }}
              />
            );
          }

          return (
            <a
              href={attachUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#53bdeb',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                marginBottom: '6px',
              }}
            >
              <Download size={14} /> {message.message_body || 'Download Attachment'}
            </a>
          );
        })()}

        {/* Message Body */}
        {message.message_type !== 'audio' &&
          message.message_type !== 'voice' &&
          message.message_type !== 'contacts' &&
          message.message_body &&
          message.message_type !== 'location' && (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: '40px' }}>
              {message.message_body}
            </div>
          )}

        {/* Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'flex-end',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '4px',
          }}
        >
          {formatTime(message.messaged_at)} {getStatusIcon(message.status)}
        </div>
      </div>

      {/* Reaction Badge */}
      {reactionBadge && (
        <div
          style={{
            alignSelf: isIncoming ? 'flex-start' : 'flex-end',
            marginTop: '-10px',
            marginLeft: isIncoming ? '6px' : undefined,
            marginRight: isIncoming ? undefined : '6px',
            background: '#2a3942',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '2px 7px',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          {reactionBadge}
          {incomingEmoji && sentEmoji && sentEmoji !== incomingEmoji && (
            <span style={{ fontSize: '14px' }}>{incomingEmoji}</span>
          )}
        </div>
      )}
    </div>
  );
};
