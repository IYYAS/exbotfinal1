
// import section  

import React, { useState, useEffect, useRef } from 'react';
import {


  Send, Search, Plus, Loader2, Sparkles, Paperclip,
  MessageSquare, User, Check, CheckCheck, X,
  Terminal, ShieldCheck, Download, RefreshCw, AlertCircle, Trash2,
  CornerUpLeft, Link2, Mic
} from 'lucide-react';
import { whatsappAPI, BACKEND_URL } from '../api';

//  types and interfaces

interface ContactInfo {
  id: number;
  wa_id: string;
  first_name: string;
  last_name?: string;
  unread_messages_count: number;
  last_messaged_at?: string;
}

interface MessageLog {
  id: number;
  contact_wa_id: string;
  wamid?: string;
  is_incoming: boolean;
  status: string;
  message_body: string;
  message_type: string;
  attachment?: string;
  messaged_at: string;
  data: any; // Raw Meta/Webhook JSON
}

interface WhatsAppTemplate {
  id: number;
  name: string;
  language: string;
  category?: string;
  status?: string;
  data: any;
}

// Predefined advanced template presets for quick testing of complex message types without needing to create them in Meta first. These are not exhaustive and can be expanded with more examples from Meta's documentation.
 
const ADVANCED_PRESETS: Record<string, any> = {
  "Authentication: Copy Code": {
    "name": "authenticatin_code_copy_code_button",
    "language": "en_US",
    "category": "AUTHENTICATION",
    "components": [
      {
        "type": "BODY",
        "add_security_recommendation": true
      },
      {
        "type": "FOOTER",
        "code_expiration_minutes": 10
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "OTP",
            "otp_type": "COPY_CODE",
            "text": "Copy Code"
          }
        ]
      }
    ]
  },
  "Authentication: Autofill Button": {
    "name": "authentication_code_autofill_button",
    "language": "en_US",
    "category": "AUTHENTICATION",
    "components": [
      {
        "type": "BODY",
        "add_security_recommendation": true
      },
      {
        "type": "FOOTER",
        "code_expiration_minutes": 10
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "OTP",
            "otp_type": "ONE_TAP",
            "text": "Copy Code",
            "autofill_text": "Autofill",
            "package_name": "com.example.luckyshrub",
            "signature_hash": "K8a%2FAINcGX7"
          }
        ]
      }
    ]
  },
  "Marketing: Intro Catalog Offer": {
    "name": "intro_catalog_offer",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      {
        "type": "BODY",
        "text": "Now shop for your favourite products right here on WhatsApp! Get Rs {{1}} off on all orders above {{2}}Rs! Valid for your first {{3}} orders placed on WhatsApp!",
        "example": {
          "body_text": [
            [
              "100",
              "400",
              "3"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "Best grocery deals on WhatsApp!"
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "CATALOG",
            "text": "View catalog"
          }
        ]
      }
    ]
  },
  "Marketing: Abandoned Cart": {
    "name": "abandoned_cart",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Forget something {{1}}?",
        "example": {
          "header_text": [
            "Pablo"
          ]
        }
      },
      {
        "type": "BODY",
        "text": "Looks like you left some items in your cart! Use code {{1}} and you can get 10% off of all of them!",
        "example": {
          "body_text": [
            [
              "10OFF"
            ]
          ]
        }
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "MPM",
            "text": "View items"
          }
        ]
      }
    ]
  },
  "Marketing: Poda Summer Sale": {
    "name": "poda",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Our {{1}} is on!",
        "example": {
          "header_text": [
            "Summer Sale"
          ]
        }
      },
      {
        "type": "BODY",
        "text": "Shop now through {{1}} and use code {{2}} to get {{3}} off of all merchandise.",
        "example": {
          "body_text": [
            [
              "the end of August",
              "25OFF",
              "25%"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "Use the buttons below to manage your marketing subscriptions"
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "QUICK_REPLY",
            "text": "Unsubcribe from Promos"
          },
          {
            "type": "QUICK_REPLY",
            "text": "Unsubscribe from All"
          }
        ]
      }
    ]
  },
  "Marketing: Limited Time Image Offer": {
    "name": "limited_time_offer_tuscan_getaway_2023",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      {
        "type": "HEADER",
        "format": "IMAGE",
        "example": {
          "header_handle": [
            "4::aW..."
          ]
        }
      },
      {
        "type": "BODY",
        "text": "Hi {{1}}! For a limited time only you can get our {{2}} for as low as {{3}}. Tap the Offer Details button for more information.",
        "example": {
          "body_text": [
            [
              "Mark",
              "Tuscan Getaway package",
              "800"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "Offer valid until May 31, 2023"
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "PHONE_NUMBER",
            "text": "Call",
            "phone_number": "15550051310"
          },
          {
            "type": "URL",
            "text": "Shop Now",
            "url": "https://www.examplesite.com/shop?promo={{1}}",
            "example": [
              "summer2023"
            ]
          }
        ]
      }
    ]
  }
};




// ─── Link Preview Card Component ───────────────────────────────────────────────
interface LinkMeta { title?: string; description?: string; image?: string; url?: string; }
const linkPreviewCache: Record<string, LinkMeta | null> = {};

//  link preview miccro link get the doamin , and that desian 


const LinkPreviewCard: React.FC<{ url: string }> = ({ url }) => {
  const [meta, setMeta] = useState<LinkMeta | null | 'loading'>('loading');

  useEffect(() => {
    if (url in linkPreviewCache) {
      setMeta(linkPreviewCache[url]);
      return;
    }
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          const m: LinkMeta = {
            title: data.data?.title,
            description: data.data?.description,
            image: data.data?.image?.url || data.data?.logo?.url,
            url: data.data?.url || url
          };
          linkPreviewCache[url] = m;
          setMeta(m);
        } else {
          linkPreviewCache[url] = null;
          setMeta(null);
        }
      })
      .catch(() => { linkPreviewCache[url] = null; setMeta(null); });
  }, [url]);

  if (meta === 'loading') return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', width: '60%' }} />
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', width: '90%' }} />
      </div>
    </div>
  );
  if (!meta) return null;

  const domain = (() => { try { return new URL(meta.url || url).hostname.replace('www.', ''); } catch { return url; } })();

  return (
    <a href={meta.url || url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', marginTop: '6px' }}>
      <div style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        transition: 'background 0.2s'
      }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.38)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
      >
        {meta.image && (
          <img
            src={meta.image}
            alt={meta.title || 'preview'}
            style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ padding: '8px 10px' }}>
          {meta.title && (
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#e9edef', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meta.title}
            </div>
          )}
          {meta.description && (
            <div style={{ fontSize: '11.5px', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
              {meta.description}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#53bdeb', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🔗 {domain}
          </div>
        </div>
      </div>
    </a>
  );
};

//  location design ui 

const LocationBubble: React.FC<{ latitude: number; longitude: number; name?: string; address?: string }> = ({ latitude, longitude, name, address }) => {
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <a href={mapUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: '6px' }}>
      <div style={{
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
        transition: 'opacity 0.2s'
      }}>
        {/* Map thumbnail — fallback to a styled placeholder if no API key */}
        <div style={{
          width: '100%',
          height: '130px',
          background: '#1a2a35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px'
        }}>
          📍
        </div>

        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#e9edef', marginBottom: '2px' }}>
            {name || 'Shared location'}
          </div>
          {address && (
            <div style={{ fontSize: '11.5px', color: '#8696a0', marginBottom: '4px' }}>
              {address}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#53bdeb' }}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)} · Open in Maps
          </div>
        </div>
      </div>
    </a>
  );
};

// audio Player ui and the package  

const VoiceNotePlayer: React.FC<{ src: string; isIncoming: boolean }> = ({ src, isIncoming }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Mic recording states — add after fileInputRef

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error('Audio play failed', err));
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '4px',
      width: '290px',
      maxWidth: '100%',
      userSelect: 'none'
    }}>
      {/* Avatar Circle with Microphone Badge */}
      <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#182229',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8696a0',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <User size={20} />
        </div>
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          right: '-1px',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          backgroundColor: isIncoming ? '#202c33' : '#005c4b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #202c33'
        }}>
          <Mic size={9} color="#10b981" style={{ strokeWidth: 3 }} />
        </div>
      </div>

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          background: 'none',
          border: 'none',
          color: '#e9edef',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          outline: 'none'
        }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Playback Progress (Waveform and Scrubber) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div
          onClick={handleSeek}
          style={{
            height: '20px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          {/* Simulated Waveform bars */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            width: '100%',
            height: '10px'
          }}>
            {Array.from({ length: 32 }).map((_, i) => {
              const heights = [3, 5, 8, 4, 9, 6, 3, 7, 10, 5, 3, 7, 6, 4, 8, 5, 7, 3, 6, 8, 4, 5, 7, 3, 5, 8, 4, 6, 3, 5, 7, 4];
              const h = heights[i % heights.length];
              const isActive = (i / 32) * 100 <= progressPct;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h * 10}%`,
                    backgroundColor: isActive ? '#53bdeb' : 'rgba(255,255,255,0.25)',
                    borderRadius: '1px',
                    transition: 'background-color 0.1s'
                  }}
                />
              );
            })}
          </div>

          {/* Seek circle handler */}
          {progressPct > 0 && (
            <div style={{
              position: 'absolute',
              left: `calc(${progressPct}% - 5px)`,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#53bdeb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {/* Current Time Display */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
          {formatTime(currentTime || duration)}
        </div>
      </div>
    </div>
  );
};

// 


const LiveChat: React.FC = () => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [activeContact, setActiveContact] = useState<ContactInfo | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Template creation form states
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [tName, setTName] = useState('');
  const [tCategory, setTCategory] = useState('MARKETING');
  const [tLanguage, setTLanguage] = useState('en');
  const [tHeader, setTHeader] = useState('');
  const [tHeaderExample, setTHeaderExample] = useState('');
  const [tBody, setTBody] = useState('');
  const [tBodyExamples, setTBodyExamples] = useState('');
  const [tFooter, setTFooter] = useState('');
  const [tButtonType, setTButtonType] = useState('NONE'); // NONE, QUICK_REPLY
  const [tButton1Text, setTButton1Text] = useState('');
  const [tButton2Text, setTButton2Text] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Advanced Builder States
  const [builderMode, setBuilderMode] = useState<'basic' | 'advanced'>('basic');
  const [advancedPreset, setAdvancedPreset] = useState<string>('');
  const [advancedJson, setAdvancedJson] = useState<string>('');

  // Custom contact input
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');

  // Selected Meta JSON Inspector message
  const [inspectorMessage, setInspectorMessage] = useState<MessageLog | null>(null);

  // Active reply quote message
  const [replyToMessage, setReplyToMessage] = useState<MessageLog | null>(null);

  // Link preview toggle
  const [previewUrl, setPreviewUrl] = useState(false);

  // WhatsApp-style context menu
  const [contextMenu, setContextMenu] = useState<{ message: MessageLog; x: number; y: number } | null>(null);

  // Reactions we've sent: { wamid -> emoji }
  const [sentReactions, setSentReactions] = useState<Record<string, string>>({});

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [micError, setMicError] = useState('');  // ← ADD THIS LINE

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachment Menu & Send Media from URL States
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrlType, setMediaUrlType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [mediaUrlVoice, setMediaUrlVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // ADD THESE inside LiveChat, after messagesEndRef:
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Auto-scroll ref

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);
  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.wa_id);
      setReplyToMessage(null); // Clear active reply quote when switching contacts!
      setSentReactions({}); // Clear local reaction badges when switching contact
    }
  }, [activeContact]);

  useEffect(() => {
    // Poll for new messages every 4 seconds to simulate real-time updates!
    const timer = setInterval(() => {
      if (activeContact) {
        pollMessages(activeContact.wa_id);
      }
      pollContacts();
    }, 900000);
    return () => clearInterval(timer);
  }, [activeContact]);

  useEffect(() => {
    scrollToBottom();

  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await whatsappAPI.fetchContacts();
      setContacts(res.data);
      if (res.data.length > 0 && !activeContact) {
        setActiveContact(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const pollContacts = async () => {
    try {
      const res = await whatsappAPI.fetchContacts();
      // Only set if contacts have changed to avoid redraws
      if (JSON.stringify(res.data) !== JSON.stringify(contacts)) {
        setContacts(res.data);
      }
    } catch (err) {
      console.error('Polled contacts failed', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await whatsappAPI.fetchTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load WABA templates', err);
    }
  };

  const syncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await whatsappAPI.syncTemplates();
      if (res.data.success) {
        fetchTemplates();
        alert(`Successfully synchronized ${res.data.count} Meta templates to the database!`);
      }
    } catch (err) {
      console.error('Templates synchronization failed', err);
      alert('Could not synchronize templates. Ensure WABA is correctly linked.');
    } finally {
      setSyncingTemplates(false);
    }
  };

  const fetchMessages = async (waId: string) => {
    setLoadingMessages(true);
    try {
      const res = await whatsappAPI.fetchMessages(waId);
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const pollMessages = async (waId: string) => {
    try {
      const res = await whatsappAPI.fetchMessages(waId);
      const reversed = res.data.reverse();
      if (JSON.stringify(reversed) !== JSON.stringify(messages)) {
        setMessages(reversed);
      }
    } catch (err) {
      console.error('Polled messages failed', err);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this contact and all their chat messages?")) return;
    try {
      await whatsappAPI.deleteContact(id);
      setActiveContact(null);
      setMessages([]);
      fetchContacts();
      alert("Contact deleted successfully!");
    } catch (err) {
      console.error("Failed to delete contact", err);
      alert("Failed to delete contact.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeContact || sending) return;

    setSending(true);
    const text = messageInput.trim();
    setMessageInput('');

    try {
      const extraData = {
        ...(replyToMessage ? { reply_to_message_id: replyToMessage.wamid } : {}),
        ...(previewUrl ? { preview_url: true } : {})
      };
      const res = await whatsappAPI.sendMessage(activeContact.wa_id, text, extraData);
      if (res.data.success) {
        console.log('Send message response:', res.data);

        setReplyToMessage(null); // Clear reply quote!
        fetchMessages(activeContact.wa_id);
        // Automatically set the new log as inspector focus to show Meta response!
        const newLog: MessageLog = {
          id: res.data.log_id,
          contact_wa_id: activeContact.wa_id,
          wamid: res.data.wamid,
          is_incoming: false,
          status: 'sent',
          message_body: text,
          message_type: 'text',
          messaged_at: new Date().toISOString(),
          data: res.data.meta_response
        };
        setInspectorMessage(newLog);
      }
    } catch (err: any) {
      console.error('Send message failed', err);
      const errRes = err.response?.data?.meta_response || { error: 'Meta endpoint rejected message dispatch' };
      // Even if failed, build temporary error log for inspector
      const errorLog: MessageLog = {
        id: Date.now(),
        contact_wa_id: activeContact.wa_id,
        is_incoming: false,
        status: 'failed',
        message_body: text,
        message_type: 'text',
        messaged_at: new Date().toISOString(),
        data: errRes
      };
      setInspectorMessage(errorLog);
      alert('Failed to send WhatsApp message. View Inspector for raw Meta error.');
    } finally {
      setSending(false);
    }
  };

  const handleSendReaction = async (message: MessageLog, emoji: string) => {
    if (!message.wamid || !activeContact) return;
    try {
      await whatsappAPI.sendReaction(activeContact.wa_id, message.wamid, emoji);
      // Store the reaction badge locally so it shows on the bubble
      setSentReactions(prev => ({ ...prev, [message.wamid!]: emoji }));
    } catch (err) {
      console.error('Reaction failed', err);
    }
  };

  const handleAddManualContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim() || !newContactName.trim()) return;

    try {
      // Clean phone input to only digits
      const waId = newContactPhone.replace(/\D/g, '');
      const res = await whatsappAPI.addContact({
        wa_id: waId,
        first_name: newContactName,
        platform: 'whatsapp'
      });
      if (res.data) {
        setNewContactPhone('');
        setNewContactName('');
        setShowAddContact(false);
        fetchContacts();
        setActiveContact(res.data);
      }
    } catch (err) {
      console.error('Add contact failed', err);
      alert('Could not add contact. This WhatsApp phone number is already in your chat list.');
    }
  };

  const handleSendTemplate = async (templateName: string, language: string) => {
    if (!activeContact) return;
    setShowTemplates(false);
    setSending(true);

    try {
      const res = await whatsappAPI.sendMessage(activeContact.wa_id, '', {
        template_name: templateName,
        language_code: language
      });
      if (res.data.success) {
        fetchMessages(activeContact.wa_id);
        const newLog: MessageLog = {
          id: res.data.log_id,
          contact_wa_id: activeContact.wa_id,
          is_incoming: false,
          status: 'sent',
          message_body: `Template: ${templateName}`,
          message_type: 'template',
          messaged_at: new Date().toISOString(),
          data: res.data.meta_response
        };
        setInspectorMessage(newLog);
      }
    } catch (err: any) {
      console.error('Template send failed', err);
      const errRes = err.response?.data?.meta_response || { error: 'Template not verified/approved' };
      const errorLog: MessageLog = {
        id: Date.now(),
        contact_wa_id: activeContact.wa_id,
        is_incoming: false,
        status: 'failed',
        message_body: `Template: ${templateName}`,
        message_type: 'template',
        messaged_at: new Date().toISOString(),
        data: errRes
      };
      setInspectorMessage(errorLog);
      alert('Template dispatch rejected by Meta. View inspector payload details.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete the template "${templateName}" from Meta? This action cannot be undone.`)) {
      return;
    }
    try {
      await whatsappAPI.deleteTemplate(templateName);
      alert('Template successfully deleted from Meta!');
      fetchTemplates();
    } catch (err: any) {
      console.error('Delete template failed', err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.error || 'Unknown error';
      alert(`Template deletion failed: ${errMsg}`);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTemplate(true);

    let payload: any = {};

    try {
      if (builderMode === 'advanced') {
        if (!advancedJson.trim()) {
          alert('JSON payload is required in Advanced Builder.');
          setCreatingTemplate(false);
          return;
        }
        try {
          payload = JSON.parse(advancedJson);
        } catch (parseErr) {
          alert('Invalid JSON. Please fix formatting errors.');
          setCreatingTemplate(false);
          return;
        }
      } else {
        if (!tName.trim() || !tBody.trim()) {
          alert('Template Name and Body text are required.');
          setCreatingTemplate(false);
          return;
        }

        const components: any[] = [];

        // 1. Header component
        if (tHeader.trim()) {
          const headerObj: any = {
            type: 'HEADER',
            format: 'TEXT',
            text: tHeader.trim()
          };
          if (tHeaderExample.trim()) {
            headerObj.example = {
              header_text: [tHeaderExample.trim()]
            };
          }
          components.push(headerObj);
        }

        // 2. Body component
        const bodyObj: any = {
          type: 'BODY',
          text: tBody.trim()
        };
        if (tBodyExamples.trim()) {
          const bodyExArray = tBodyExamples.split(',').map(ex => ex.trim());
          bodyObj.example = {
            body_text: [bodyExArray]
          };
        }
        components.push(bodyObj);

        // 3. Footer component
        if (tFooter.trim()) {
          components.push({
            type: 'FOOTER',
            text: tFooter.trim()
          });
        }

        // 4. Buttons component
        if (tButtonType === 'QUICK_REPLY') {
          const buttonsList: any[] = [];
          if (tButton1Text.trim()) {
            buttonsList.push({
              type: 'QUICK_REPLY',
              text: tButton1Text.trim()
            });
          }
          if (tButton2Text.trim()) {
            buttonsList.push({
              type: 'QUICK_REPLY',
              text: tButton2Text.trim()
            });
          }
          if (buttonsList.length > 0) {
            components.push({
              type: 'BUTTONS',
              buttons: buttonsList
            });
          }
        }

        payload = {
          name: tName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          language: tLanguage,
          category: tCategory,
          components
        };
      }

      const res = await whatsappAPI.createTemplate(payload);

      if (res.data.success) {
        alert('Template successfully registered with Meta and saved locally!');
        // Reset states
        setTName('');
        setTHeader('');
        setTHeaderExample('');
        setTBody('');
        setTBodyExamples('');
        setTFooter('');
        setTButtonType('NONE');
        setTButton1Text('');
        setTButton2Text('');
        setAdvancedJson('');
        setAdvancedPreset('');

        setShowCreateTemplate(false);
        fetchTemplates(); // reload templates list
      }
    } catch (err: any) {
      console.error('Create template failed', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Error occurred';
      alert(`Template registration failed: ${errMsg}`);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeContact) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await whatsappAPI.uploadMedia(formData);
      if (uploadRes.data.success && uploadRes.data.media_id) {
        // Now send file message using retrieved media_id
        const mime = uploadRes.data.mime_type || '';
        let msgType = 'document';
        if (mime.startsWith('image/')) msgType = 'image';
        else if (mime.startsWith('video/')) msgType = 'video';
        else if (mime.startsWith('audio/')) msgType = 'audio';

        const sendRes = await whatsappAPI.sendMessage(activeContact.wa_id, file.name, {
          type: msgType,
          media_id: uploadRes.data.media_id,
          local_url: uploadRes.data.local_url,
          reply_to_message_id: replyToMessage?.wamid,
          filename: msgType === 'document' ? file.name : undefined,
          voice: msgType === 'audio' ? true : undefined
        });

        if (sendRes.data.success) {
          setReplyToMessage(null); // Clear reply context after sending file
          fetchMessages(activeContact.wa_id);
          const newLog: MessageLog = {
            id: sendRes.data.log_id,
            contact_wa_id: activeContact.wa_id,
            is_incoming: false,
            status: 'sent',
            message_body: file.name,
            message_type: msgType,
            attachment: uploadRes.data.local_url,
            messaged_at: new Date().toISOString(),
            data: sendRes.data.meta_response
          };
          setInspectorMessage(newLog);
        }
      }
    } catch (err: any) {
      console.error('File upload/dispatch failed', err);
      alert('Failed uploading attachment to WhatsApp cloud.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMediaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrlInput || !activeContact) return;

    setSending(true);
    setShowUrlModal(false);

    try {
      const sendRes = await whatsappAPI.sendMessage(activeContact.wa_id, '', {
        type: mediaUrlType,
        media_url: mediaUrlInput,
        voice: mediaUrlType === 'audio' ? mediaUrlVoice : undefined,
        reply_to_message_id: replyToMessage?.wamid
      });

      if (sendRes.data.success) {
        setReplyToMessage(null);
        setMediaUrlInput('');
        fetchMessages(activeContact.wa_id);
        const newLog: MessageLog = {
          id: sendRes.data.log_id,
          contact_wa_id: activeContact.wa_id,
          is_incoming: false,
          status: 'sent',
          message_body: `[${mediaUrlType.toUpperCase()} ATTACHMENT]`,
          message_type: mediaUrlType,
          attachment: mediaUrlInput,
          messaged_at: new Date().toISOString(),
          data: sendRes.data.meta_response
        };
        setInspectorMessage(newLog);
      }
    } catch (err: any) {
      console.error('Failed to send media via URL', err);
      alert('Failed to send media via URL.');
    } finally {
      setSending(false);
    }
  };
  const formatRecordingTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // In startRecording — force mp4 which Meta accepts natively

      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      // ✅ REPLACE YOUR OLD onstop WITH THIS:
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0 || !activeContact) return;

        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/ogg';
        const ext = mimeType.includes('ogg') ? 'ogg'
          : mimeType.includes('mp4') ? 'mp4'
            : 'webm';

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        const formData = new FormData();
        formData.append('file', file);

        try {
          setUploadingFile(true);
          const uploadRes = await whatsappAPI.uploadMedia(formData);

          // ✅ Check media_id explicitly
          if (!uploadRes.data.media_id) {
            console.error('Upload failed — no media_id returned:', uploadRes.data);
            setMicError(`Meta rejected the audio: ${uploadRes.data.meta_error?.error?.error?.message || 'Unsupported format'}`);
            setTimeout(() => setMicError(''), 6000);
            return;
          }

          const sendRes = await whatsappAPI.sendMessage(activeContact.wa_id, '', {
            type: 'audio',
            media_id: uploadRes.data.media_id,
            local_url: uploadRes.data.local_url,
            voice: true,
          });
          console.log('Send voice response:', sendRes.data);

          if (sendRes.data.success) fetchMessages(activeContact.wa_id);

        } catch (err) {
          console.error('Voice upload failed', err);
          setMicError('Failed to send voice message.');
          setTimeout(() => setMicError(''), 4000);
        } finally {
          setUploadingFile(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setMicError('Microphone blocked — allow mic in browser address bar, then reload.');
      } else {
        setMicError('Could not access microphone.');
      }
      setTimeout(() => setMicError(''), 5000);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    audioChunksRef.current = []; // discard audio
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

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

  const filteredContacts = contacts.filter(c =>
    (c.first_name || 'WhatsApp User').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.wa_id || '').includes(searchTerm)
  );

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 120px)',
      background: 'var(--surface-color)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      fontFamily: '"Inter", sans-serif'
    }}>

      {/* 1. Sidebar - Contact List */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.01)'
      }}>

        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Live Conversations</h3>
            <button
              onClick={() => setShowAddContact(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: '0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            >
              <Plus size={18} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search or start chat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Contacts scrolling area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingContacts ? (
            <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="spin" color="var(--primary-color)" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No conversations found.
            </div>
          ) : (
            filteredContacts.map(c => {
              const isActive = activeContact?.wa_id === c.wa_id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveContact(c);
                    setInspectorMessage(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: '0.2s',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'transparent'
                  }}
                  onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                  onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '15px'
                  }}>
                    {(c.first_name || 'WhatsApp User')[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.first_name || 'WhatsApp User'} {c.last_name || ''}
                      </span>
                      {c.last_messaged_at && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {new Date(c.last_messaged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        +{c.wa_id}
                      </span>
                      {c.unread_messages_count > 0 && (
                        <span style={{
                          backgroundColor: '#25d366',
                          color: '#000000',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: '50%',
                          minWidth: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px'
                        }}>
                          {c.unread_messages_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 2. Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b141a', // WhatsApp Classic Dark background!
        position: 'relative'
      }}>
        {activeContact ? (
          <>
            {/* Header info */}
            <div style={{
              padding: '10px 20px',
              background: '#202c33',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {activeContact.first_name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>
                    {activeContact.first_name} {activeContact.last_name || ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696a0' }}>
                    Online · +{activeContact.wa_id}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowTemplates(true)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} color="#e3a008" /> Send Template
                </button>

                <button
                  onClick={() => handleDeleteContact(activeContact.id)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                >
                  <Trash2 size={14} /> Delete Chat
                </button>
              </div>
            </div>

            {/* Messages Listing */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {loadingMessages ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={36} className="spin" color="var(--primary-color)" />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#8696a0' }}>
                  <MessageSquare size={48} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: '13px' }}>Start your conversations by template or quick reply.</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isIncoming = m.is_incoming;
                  const isInspectorTarget = inspectorMessage?.id === m.id;

                  // Extract quoted message context
                  const quotedId = m.data?.context?.id || m.data?.reply_to_message_id;
                  const parentMsg = quotedId ? messages.find(msg => msg.wamid === quotedId) : null;

                  // Reaction badge: our sent reaction OR incoming reaction message targeting this wamid
                  const sentEmoji = m.wamid ? sentReactions[m.wamid] : undefined;
                  const incomingReactionMsg = m.wamid
                    ? messages.find(r => r.message_type === 'reaction' && r.data?.reaction?.message_id === m.wamid)
                    : undefined;
                  const incomingEmoji = incomingReactionMsg?.data?.reaction?.emoji;
                  const reactionBadge = sentEmoji || incomingEmoji;

                  return (
                    <div
                      key={m.id}
                      id={m.wamid ? `msg-${m.wamid}` : undefined}
                      style={{
                        alignSelf: isIncoming ? 'flex-start' : 'flex-end',
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      {/* Message Bubble wrapper */}
                      <div style={{
                        background: isIncoming ? '#202c33' : '#005c4b',
                        color: '#e9edef',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '14.5px',
                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                        position: 'relative',
                        border: isInspectorTarget ? '2px solid #53bdeb' : 'none',
                        cursor: 'context-menu',
                        userSelect: 'text'
                      }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ message: m, x: e.clientX, y: e.clientY });
                        }}
                      >
                        {/* Quoted Message Preview inside bubble */}
                        {parentMsg && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const element = document.getElementById(`msg-${quotedId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                const prevBg = element.style.background;
                                element.style.background = 'rgba(83, 189, 235, 0.4)';
                                setTimeout(() => {
                                  element.style.background = prevBg;
                                }, 1200);
                              }
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
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontWeight: 'bold', color: '#53bdeb', fontSize: '11px' }}>
                              {parentMsg.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
                            </span>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '350px' }}>
                              {parentMsg.message_body || `[${parentMsg.message_type.toUpperCase()} Attachment]`}
                            </span>
                          </div>
                        )}
                        {/* If Media Attachment exists */}
                        {m.attachment && (() => {
                          // Build the correct URL regardless of how the path is stored
                          const attachUrl = m.attachment.startsWith('http')
                            ? m.attachment
                            : m.attachment.startsWith('/media/')
                              ? `${BACKEND_URL}${m.attachment}`
                              : `${BACKEND_URL}/media/${m.attachment}`;

                          if (m.message_type === 'image' || m.message_type === 'sticker') {
                            const isSticker = m.message_type === 'sticker';
                            return (
                              <div style={{ marginBottom: '6px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => window.open(attachUrl, '_blank')}
                              >
                                <img
                                  src={attachUrl}
                                  alt={isSticker ? "Sticker" : "Image"}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: isSticker ? '140px' : '220px',
                                    objectFit: isSticker ? 'contain' : 'cover',
                                    display: 'block',
                                    borderRadius: '8px'
                                  }}
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    img.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.innerText = isSticker ? '💟 Sticker (failed to load)' : '🖼️ Image (failed to load)';
                                    img.parentElement?.appendChild(fallback);
                                  }}
                                />
                              </div>
                            );
                          }

                          if (m.message_type === 'video') {
                            return (
                              <div style={{ marginBottom: '6px', borderRadius: '10px', overflow: 'hidden' }}>
                                <video
                                  src={attachUrl}
                                  controls
                                  style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }}
                                />
                              </div>
                            );
                          }

                          if (m.message_type === 'audio' || m.message_type === 'voice') {
                            return (
                              <div style={{ marginBottom: '6px' }}>
                                <VoiceNotePlayer src={attachUrl} isIncoming={isIncoming} />
                              </div>
                            );
                          }

                          // Default: document download
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
                                marginBottom: '6px'
                              }}
                            >
                              <Download size={14} /> {m.message_body || 'Download Attachment'}
                            </a>
                          );
                        })()}


                        {m.message_type !== 'audio' && m.message_type !== 'voice' && m.message_type !== 'contacts' && m.message_body && m.message_type !== 'location' && (
                          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: '40px' }}>
                            {m.message_body}
                          </div>
                        )}

                        {m.message_type === 'contacts' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(0,0,0,0.15)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            margin: '4px 0',
                            minWidth: '220px'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#25d366',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                              👤
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
                              <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#e9edef', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {m.message_body?.replace('📇 Contact Card: ', '') || 'Contact Card'}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#8696a0' }}>
                                WhatsApp Contact Card
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Location message */}
                        {m.message_type === 'location' && m.data?.location && (() => {
                          const { latitude, longitude, name, address } = m.data.location;
                          return (
                            <LocationBubble
                              latitude={latitude}
                              longitude={longitude}
                              name={name}
                              address={address}
                            />
                          );
                        })()}

                        {/* Link Preview Card — shown when message body contains a URL */}
                        {(() => {
                          const urlMatch = m.message_body?.match(/https?:\/\/[^\s]+/);
                          return urlMatch ? <LinkPreviewCard url={urlMatch[0]} /> : null;
                        })()}

                        {/* Status / Time block — clean, no inline toolbar buttons */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'flex-end',
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.6)',
                          marginTop: '4px'
                        }}>
                          <span>
                            {new Date(m.messaged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isIncoming && getStatusIcon(m.status)}
                        </div>
                      </div>

                      {/* Emoji Reaction Badge — shown below bubble corner */}
                      {reactionBadge && (
                        <div style={{
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
                          animation: 'fadeInScale 0.2s ease'
                        }}>
                          {reactionBadge}
                          {incomingEmoji && sentEmoji && sentEmoji !== incomingEmoji && (
                            <span style={{ fontSize: '14px' }}>{incomingEmoji}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ─── WhatsApp-style Context Menu ─────────────────────────── */}
            {contextMenu && (
              <>
                {/* Invisible overlay to close on click-away */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                  onClick={() => setContextMenu(null)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                />
                {/* Menu popup */}
                <div
                  style={{
                    position: 'fixed',
                    top: Math.min(contextMenu.y, window.innerHeight - 320),
                    left: Math.min(contextMenu.x, window.innerWidth - 220),
                    zIndex: 200,
                    background: '#233138',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    minWidth: '200px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animation: 'fadeInScale 0.12s ease'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Emoji reactions row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: '#1d2b33'
                  }}>
                    {QUICK_REACTIONS.map(emoji => (
                      <span
                        key={emoji}
                        onClick={() => { handleSendReaction(contextMenu.message, emoji); setContextMenu(null); }}
                        style={{ fontSize: '22px', cursor: 'pointer', display: 'inline-block', transition: 'transform 0.12s', userSelect: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.4)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {emoji}
                      </span>
                    ))}
                    <span
                      style={{ fontSize: '18px', cursor: 'pointer', color: '#8696a0', fontWeight: 'bold', userSelect: 'none' }}
                      title="More reactions"
                    >+</span>
                  </div>

                  {/* Action items */}
                  {[
                    { icon: <CornerUpLeft size={15} />, label: 'Reply', action: () => { setReplyToMessage(contextMenu.message); setContextMenu(null); } },
                    { icon: <span style={{ fontSize: '14px' }}>📋</span>, label: 'Copy', action: () => { navigator.clipboard.writeText(contextMenu.message.message_body || ''); setContextMenu(null); } },
                    { icon: <Terminal size={15} />, label: 'View API Payload', action: () => { setInspectorMessage(contextMenu.message); setContextMenu(null); }, color: '#34d399' },
                    { icon: <span style={{ fontSize: '14px' }}>⭐</span>, label: 'Star', action: () => setContextMenu(null) },
                    { icon: <Trash2 size={15} />, label: 'Delete', action: () => setContextMenu(null), color: '#ef4444' },
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
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {icon} {label}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Active Quoted Reply Banner */}
            {replyToMessage && (
              <div style={{
                background: '#182229',
                borderLeft: '4px solid #53bdeb',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#53bdeb' }}>
                    {replyToMessage.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#8696a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '500px' }}>
                    {replyToMessage.message_body || `[${replyToMessage.message_type.toUpperCase()} Attachment]`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
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
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input form */}
            {/* Mic error toast */}
            {micError && (
              <div style={{
                background: '#2d1b1b',
                borderLeft: '4px solid #ef5350',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <span style={{ color: '#ef9a9a', fontSize: '13px' }}>
                  🎙️ {micError}
                </span>
                <button onClick={() => setMicError('')}
                  style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            )}
            {/* Recording bar */}
            {isRecording && (
              <div style={{
                padding: '10px 24px', background: '#202c33',
                display: 'flex', alignItems: 'center', gap: '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <button type="button" onClick={cancelRecording}
                  style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={22} />
                </button>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: '#ef5350', flexShrink: 0,
                  animation: 'blink 1s infinite'
                }} />
                <span style={{ color: '#e9edef', fontSize: 14, minWidth: 38 }}>
                  {formatRecordingTime(recordingTime)}
                </span>
                <div style={{ flex: 1, height: 3, background: '#2a3942', borderRadius: 2 }} />
                <button type="button" onClick={stopRecording}
                  style={{
                    background: '#00a884', border: 'none', borderRadius: '50%',
                    width: 42, height: 42, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#fff'
                  }}>
                  <Send size={18} />
                </button>
              </div>
            )}

            {/* Normal Input form — hidden while recording */}
            {!isRecording && (
              <form onSubmit={handleSendMessage} style={{
                padding: '12px 24px', background: '#202c33',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

                {/* Attachment button — unchanged */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setAttachmentMenuOpen(prev => !prev)}
                    disabled={uploadingFile || sending}
                    style={{
                      background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer',
                      padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: attachmentMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent'
                    }}
                  >
                    {uploadingFile ? <Loader2 size={20} className="spin" /> : <Paperclip size={20} />}
                  </button>

                  {attachmentMenuOpen && (
                    <>
                      <div onClick={() => setAttachmentMenuOpen(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} />
                      <div style={{
                        position: 'absolute', bottom: '55px', left: '0',
                        background: '#233138', borderRadius: '14px',
                        padding: '10px 0', width: '220px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.5)', zIndex: 1001
                      }}>
                        {[
                          { label: 'Document', bg: '#5157ae', icon: '📄', onClick: () => fileInputRef.current?.click() },
                          { label: 'Photos & videos', bg: '#bf59cf', icon: '🖼️', onClick: () => fileInputRef.current?.click() },
                          { label: 'Camera', bg: '#e5405e', icon: '📷', onClick: () => { } },
                          { label: 'Audio', bg: '#e07000', icon: '🎵', onClick: () => { } },
                          { label: 'Contact', bg: '#1a9fc0', icon: '👤', onClick: () => { } },
                          { label: 'Poll', bg: '#39c16c', icon: '📊', onClick: () => { } },
                          { label: 'Event', bg: '#39c16c', icon: '📅', onClick: () => { } },
                          { label: 'New sticker', bg: '#f8c83b', icon: '😊', onClick: () => { } },
                        ].map(item => (
                          <div key={item.label}
                            onClick={() => { setAttachmentMenuOpen(false); item.onClick(); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '14px',
                              padding: '11px 18px', cursor: 'pointer', color: '#e9edef', fontSize: '14px'
                            }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', background: item.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', flexShrink: 0
                            }}>
                              {item.icon}
                            </div>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Link Preview Toggle — unchanged */}
                <button
                  type="button"
                  onClick={() => setPreviewUrl(v => !v)}
                  style={{
                    background: previewUrl ? 'rgba(83,189,235,0.18)' : 'none',
                    border: previewUrl ? '1px solid #53bdeb' : '1px solid transparent',
                    color: previewUrl ? '#53bdeb' : '#8696a0',
                    cursor: 'pointer', padding: '5px 8px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, transition: 'all 0.2s'
                  }}
                >
                  <Link2 size={14} />
                  {previewUrl ? 'ON' : 'OFF'}
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  style={{
                    flex: 1, background: '#2a3942', border: 'none', outline: 'none',
                    borderRadius: '8px', color: '#e9edef', padding: '10px 16px', fontSize: '14.5px'
                  }}
                />

                {/* ✅ Mic / Send button — correctly wired */}
                <button
                  type={messageInput.trim() ? 'submit' : 'button'}
                  onClick={!messageInput.trim() ? startRecording : undefined}
                  disabled={sending || uploadingFile}
                  style={{
                    backgroundColor: '#00a884', color: '#ffffff', border: 'none',
                    width: '42px', height: '42px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  {sending || uploadingFile
                    ? <Loader2 size={18} className="spin" />
                    : messageInput.trim()
                      ? <Send size={18} />
                      : <Mic size={18} />}
                </button>
              </form>
            )}
          </>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
            <MessageSquare size={64} style={{ opacity: 0.1 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>WhatsApp CRM Live Chat</h3>
            <p style={{ fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
              Select a conversation from the list to start messaging in real-time.
            </p>
          </div>
        )}

      </div>

      {/* 3. Right Sidebar - Meta Response JSON Inspector */}
      {inspectorMessage && (
        <div style={{
          width: '380px',
          borderLeft: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} color="var(--primary-color)" />
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>Meta JSON Inspector</span>
            </div>
            <button
              onClick={() => setInspectorMessage(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Details Scroll */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <div>Message UID: <strong style={{ color: 'var(--text-primary)' }}>{inspectorMessage.id}</strong></div>
              {inspectorMessage.wamid && (
                <div>Wamid: <strong style={{ color: '#53bdeb', fontFamily: 'monospace' }}>{inspectorMessage.wamid}</strong></div>
              )}
              <div>Status: <span style={{ color: inspectorMessage.status === 'failed' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{inspectorMessage.status.toUpperCase()}</span></div>
              <div>Type: <strong style={{ color: 'var(--text-primary)' }}>{inspectorMessage.message_type}</strong></div>
            </div>

            <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} /> RAW API PAYLOAD & WEBHOOK LOGS:
            </div>

            <pre style={{
              margin: 0,
              padding: '12px',
              backgroundColor: '#111b21',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#34d399',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {JSON.stringify(inspectorMessage.data || { info: "No raw payload details stored for this mock entry" }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'var(--surface-color)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Add New WhatsApp Chat</h3>
              <button onClick={() => setShowAddContact(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddManualContact}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shamil"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>WhatsApp Phone Number (with Country Code)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 919745687920"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddContact(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}>
                  Start Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'var(--surface-color)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Select WhatsApp Business Template</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Send pre-approved templates directly to your customers.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowCreateTemplate(true)}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  <Plus size={12} /> Create Template
                </button>
                <button
                  onClick={syncTemplates}
                  disabled={syncingTemplates}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={syncingTemplates ? 'spin' : ''} /> Sync
                </button>
                <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {templates.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No templates synced yet. Click "Sync" to load approved templates from Meta!
                </div>
              ) : (
                templates.map(t => (
                  <div
                    key={t.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '14px' }}>{t.name}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          backgroundColor: t.status?.toUpperCase() === 'APPROVED' ? 'rgba(16,185,129,0.2)' : t.status?.toUpperCase() === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                          color: t.status?.toUpperCase() === 'APPROVED' ? '#10b981' : t.status?.toUpperCase() === 'REJECTED' ? '#ef4444' : '#fbbf24',
                        }}>
                          {t.status || 'unknown'}
                        </span>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {t.language} · {t.category}
                        </span>
                        <button
                          onClick={() => handleDeleteTemplate(t.name)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          title="Delete Template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Show components structure */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {t.data?.components?.map((c: any, index: number) => {
                        if (c.type === 'BODY') return <div key={index}>{c.text}</div>;
                        if (c.type === 'BUTTONS') return <div key={index} style={{ color: '#53bdeb', marginTop: '4px' }}>[Buttons: {c.buttons?.map((b: any) => b.text).join(', ')}]</div>;
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => handleSendTemplate(t.name, t.language)}
                      disabled={t.status?.toUpperCase() !== 'APPROVED'}
                      style={{
                        alignSelf: 'flex-end',
                        backgroundColor: t.status?.toUpperCase() === 'APPROVED' ? '#10b981' : '#4b5563',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: t.status?.toUpperCase() === 'APPROVED' ? 'pointer' : 'not-allowed',
                        opacity: t.status?.toUpperCase() === 'APPROVED' ? 1 : 0.5,
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => { if (t.status?.toUpperCase() === 'APPROVED') e.currentTarget.style.backgroundColor = '#059669'; }}
                      onMouseOut={(e) => { if (t.status?.toUpperCase() === 'APPROVED') e.currentTarget.style.backgroundColor = '#10b981'; }}
                    >
                      {t.status?.toUpperCase() === 'APPROVED' ? 'Send Template' : `Status: ${t.status || 'Unknown'}`}
                    </button>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'var(--surface-color)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '650px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Create WhatsApp Message Template</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Design a new template to register directly with Meta.</p>
              </div>
              <button onClick={() => setShowCreateTemplate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Builder Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setBuilderMode('basic')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: builderMode === 'basic' ? 'rgba(83, 189, 235, 0.15)' : 'transparent',
                  color: builderMode === 'basic' ? '#53bdeb' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: builderMode === 'basic' ? '#53bdeb' : 'transparent',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Basic Builder
              </button>
              <button
                type="button"
                onClick={() => setBuilderMode('advanced')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: builderMode === 'advanced' ? 'rgba(83, 189, 235, 0.15)' : 'transparent',
                  color: builderMode === 'advanced' ? '#53bdeb' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: builderMode === 'advanced' ? '#53bdeb' : 'transparent',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Advanced / Presets
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              {builderMode === 'basic' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Template Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. holiday_promotion_2026"
                    value={tName}
                    onChange={(e) => setTName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  />
                </div>

                {/* Category & Language */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Category</label>
                  <select
                    value={tCategory}
                    onChange={(e) => setTCategory(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Language</label>
                  <select
                    value={tLanguage}
                    onChange={(e) => setTLanguage(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                    }}
                  >
                    <option value="en">English (en_US)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="pt_BR">Portuguese (pt_BR)</option>
                  </select>
                </div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '4px 0' }} />

              {/* Header text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Header Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Our {{1}} is on!"
                  value={tHeader}
                  onChange={(e) => setTHeader(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                  }}
                />
                {tHeader.includes('{{1}}') && (
                  <input
                    type="text"
                    placeholder="Example value for {{1}} (e.g. Summer Sale)"
                    value={tHeaderExample}
                    onChange={(e) => setTHeaderExample(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '6px 12px', color: 'var(--text-primary)', fontSize: '12px', marginTop: '4px'
                    }}
                  />
                )}
              </div>

              {/* Body Component */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Body Text (Required)</label>
                <textarea
                  placeholder="e.g. Shop now through {{1}} and use code {{2}} to get {{3}} off."
                  value={tBody}
                  onChange={(e) => setTBody(e.target.value)}
                  required
                  rows={3}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical'
                  }}
                />
                {/\{\{\d\}\}/.test(tBody) && (
                  <input
                    type="text"
                    placeholder="Examples comma separated (e.g. the end of August, 25OFF, 25%)"
                    value={tBodyExamples}
                    onChange={(e) => setTBodyExamples(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '6px 12px', color: 'var(--text-primary)', fontSize: '12px', marginTop: '4px'
                    }}
                  />
                )}
              </div>

              {/* Footer text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Footer Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tap below to manage subscription"
                  value={tFooter}
                  onChange={(e) => setTFooter(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                  }}
                />
              </div>

              {/* Buttons Component */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Buttons Type</label>
                <select
                  value={tButtonType}
                  onChange={(e) => setTButtonType(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                  }}
                >
                  <option value="NONE">No Buttons</option>
                  <option value="QUICK_REPLY">Quick Reply Buttons</option>
                </select>

                {tButtonType === 'QUICK_REPLY' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                    <input
                      type="text"
                      placeholder="Button 1 Text (e.g. Stop Promos)"
                      value={tButton1Text}
                      onChange={(e) => setTButton1Text(e.target.value)}
                      required
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Button 2 Text (Optional)"
                      value={tButton2Text}
                      onChange={(e) => setTButton2Text(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px'
                      }}
                    />
                  </div>
                )}
              </div>
              </>
              ) : (
                <>
                  {/* Advanced Builder (JSON / Presets) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Load Template Preset (Optional)</label>
                    <select
                      value={advancedPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdvancedPreset(val);
                        if (val && ADVANCED_PRESETS[val]) {
                          setAdvancedJson(JSON.stringify(ADVANCED_PRESETS[val], null, 2));
                        } else {
                          setAdvancedJson('');
                        }
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Custom JSON (Empty) --</option>
                      {Object.keys(ADVANCED_PRESETS).map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>JSON Payload</label>
                    <textarea
                      value={advancedJson}
                      onChange={(e) => setAdvancedJson(e.target.value)}
                      placeholder='{\n  "name": "my_template",\n  "language": "en_US",\n  "category": "MARKETING",\n  "components": []\n}'
                      style={{
                        background: '#111b21',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#34d399',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        minHeight: '300px',
                        resize: 'vertical',
                        outline: 'none',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    />
                    <p style={{ fontSize: '11px', color: '#8696a0', margin: 0 }}>
                      You can directly edit the payload here before creating. Ensure all names follow the `lowercase_with_underscores` format.
                    </p>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTemplate(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  style={{
                    backgroundColor: '#10b981', border: 'none', color: '#ffffff',
                    padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  {creatingTemplate ? (
                    <>
                      <Loader2 size={14} className="spin" /> Registering...
                    </>
                  ) : (
                    'Create & Register Template'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Media via URL Modal */}
      {showUrlModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11,20,26,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <form
            onSubmit={handleSendMediaUrl}
            style={{
              background: '#222e35',
              borderRadius: '16px',
              width: '450px',
              maxWidth: '90%',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'fadeInScale 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Send Media from URL</h3>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* If replying to a message, show context banner inside modal */}
            {replyToMessage && (
              <div style={{
                background: '#111b21',
                borderLeft: '4px solid #53bdeb',
                padding: '10px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeftWidth: '4px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#53bdeb' }}>
                    Replying to {replyToMessage.is_incoming ? (activeContact?.first_name || 'WhatsApp User') : 'You'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#8696a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '330px' }}>
                    {replyToMessage.message_body || `[${replyToMessage.message_type.toUpperCase()} Attachment]`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8696a0',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#8696a0', fontWeight: 'bold' }}>MEDIA TYPE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                {(['image', 'video', 'audio', 'document'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMediaUrlType(t)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: mediaUrlType === t ? '#53bdeb' : 'rgba(255,255,255,0.1)',
                      background: mediaUrlType === t ? 'rgba(83,189,235,0.15)' : '#111b21',
                      color: mediaUrlType === t ? '#53bdeb' : '#e9edef',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {mediaUrlType === 'audio' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#111b21', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <input
                  type="checkbox"
                  id="voiceToggle"
                  checked={mediaUrlVoice}
                  onChange={e => setMediaUrlVoice(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="voiceToggle" style={{ fontSize: '13px', color: '#e9edef', cursor: 'pointer', userSelect: 'none' }}>
                  🎙️ Send as Voice Note (voice: true)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#8696a0', fontWeight: 'bold' }}>MEDIA LINK (URL)</label>
              <input
                type="url"
                required
                placeholder="https://example.com/file.png"
                value={mediaUrlInput}
                onChange={e => setMediaUrlInput(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#111b21',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#e9edef',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8696a0',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#53bdeb',
                  border: 'none',
                  color: '#111b21',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Send Media
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default LiveChat;
