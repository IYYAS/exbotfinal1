import React, { useState } from 'react';
import { Check, CheckCheck, AlertCircle, Download } from 'lucide-react';
import type { MessageLog, ContactInfo } from '../types';
import { BACKEND_URL } from '../api';
import { useTheme } from '../context/ThemeContext';

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
  const { isDarkMode } = useTheme();
  const isIncoming = message.is_incoming;
  const [imgError, setImgError] = useState(false);

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
          background: isIncoming ? (isDarkMode ? '#202c33' : '#e5f5f1') : (isDarkMode ? '#005c4b' : '#d1fae5'),
          color: isDarkMode ? '#e9edef' : '#0f172a',
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
              background: isDarkMode ? 'rgba(0, 0, 0, 0.18)' : 'rgba(59, 130, 246, 0.1)',
              borderLeft: '4px solid #53bdeb',
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '6px',
              fontSize: '12.5px',
              color: isDarkMode ? '#8696a0' : '#475569',
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
              {parentMsg.message_body || parentMsg.data?.caption || `[${parentMsg.message_type.toUpperCase()} Attachment]`}
            </span>
          </div>
        )}

        {/* Attachment */}
        {message.attachment && (() => {
          const normalizeAttachmentUrl = (rawUrl: string) => {
            const cleaned = rawUrl.trim().replace(/\\/g, '/');
            if (cleaned.match(/^https?:\/\//i)) {
              try {
                const parsed = new URL(cleaned);
                parsed.pathname = parsed.pathname.replace(/ /g, '_');
                return parsed.toString();
              } catch {
                return cleaned;
              }
            }

            let path = cleaned.replace(/\/+/g, '/');
            if (path.startsWith('/')) {
              path = path.slice(1);
            }

            path = path.replace(/ /g, '_');
            if (path.startsWith('whatsapp/uploads/')) {
              path = `media/${path}`;
            } else if (path.startsWith('devwhatsapp/uploads/')) {
              path = `media/whatsapp/uploads/${path.slice('devwhatsapp/uploads/'.length)}`;
            } else if (!path.startsWith('media/')) {
              path = `media/${path}`;
            }

            return `${BACKEND_URL}/${path}`;
          };

          const attachUrl = normalizeAttachmentUrl(message.attachment);
          const encodedAttachUrl = encodeURI(attachUrl);

          const attachmentType = message.message_type?.toLowerCase() || '';
          const attachmentFilename = message.message_body || attachUrl;
          const lowerUrl = attachUrl.toLowerCase();
          const isImageUrl = lowerUrl.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/);
          const isVideoUrl = lowerUrl.match(/\.(mp4|mov|webm|ogg|mkv)(\?.*)?$/);
          const isAudioUrl = lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/);

          if (attachmentType === 'image' || attachmentType === 'sticker' || isImageUrl) {
            return imgError ? (
              <div style={{ color: '#f87171', fontSize: '12px' }}>
                Image failed to load. URL: <br />
                <a href={encodedAttachUrl} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
                  {encodedAttachUrl}
                </a>
              </div>
            ) : (
              <img
                src={encodedAttachUrl}
                alt="attachment"
                onError={() => setImgError(true)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '160px',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: '8px',
                  marginBottom: message.message_body ? '8px' : '0',
                  display: 'block',
                  objectFit: 'cover',
                }}
              />
            );
          }

          if (attachmentType === 'video' || isVideoUrl) {
            return (
              <video
                src={encodedAttachUrl}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '160px',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
              />
            );
          }

          if (attachmentType === 'audio' || attachmentType === 'voice' || isAudioUrl) {
            return (
              <audio
                src={encodedAttachUrl}
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
              href={encodedAttachUrl}
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
                background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                marginBottom: '6px',
              }}
            >
              <Download size={14} /> {attachmentFilename || 'Download Attachment'}
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
            color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15, 23, 42, 0.6)',
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
            background: isDarkMode ? '#2a3942' : '#e0f2fe',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '12px',
            padding: '2px 7px',
            fontSize: '16px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.1)',
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
