import React from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { ContactInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ContactListProps {
  contacts: ContactInfo[];
  activeContact: ContactInfo | null;
  blockedWaIds: string[];
  currentFilter: 'all' | 'unread' | 'blocked';
  searchTerm: string;
  loadingContacts: boolean;
  onSearchChange: (term: string) => void;
  onLabelClick?: (label: string) => void;
  onSelectContact: (contact: ContactInfo) => void;
  onAddContact: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  activeContact,
  blockedWaIds,
  currentFilter,
  searchTerm,
  loadingContacts,
  onSearchChange,
  onLabelClick,
  onSelectContact,
  onAddContact,
}) => {
  const { isDarkMode } = useTheme();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredContacts = contacts.filter(c => {
    if (!normalizedSearch) return true;

    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
    const phone = (c.wa_id || '').toLowerCase();
    const label = (c.label || '').toLowerCase();
    const labels = (c.labels || []).map((lbl) => lbl.toLowerCase()).join(' ');

    return (
      name.includes(normalizedSearch) ||
      phone.includes(normalizedSearch) ||
      label.includes(normalizedSearch) ||
      labels.includes(normalizedSearch)
    );
  });

  return (
    <div
      style={{
        width: '320px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-color)',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Live Conversations</div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Chat with your contacts in real time.
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {currentFilter === 'unread' && 'Showing unread conversations'}
              {currentFilter === 'blocked' && 'Showing blocked conversations'}
              {currentFilter === 'all' && 'Showing all conversations'}
            </div>
          </div>
          <button
            onClick={onAddContact}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59,130,246,0.16)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: '0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.24)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.16)')}
          >
            <Plus size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            background: isDarkMode ? '#111827' : '#f3f4f6',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search or start chat..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Contacts List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {loadingContacts ? (
          <div style={{ display: 'flex', height: '120px', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={24} className="spin" color="var(--primary-color)" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}
          >
            No conversations found.
          </div>
        ) : (
          filteredContacts.map((c) => {
            const isActive = activeContact?.wa_id === c.wa_id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectContact(c)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  backgroundColor: isActive ? 'rgba(59,130,246,0.22)' : isDarkMode ? '#111827' : '#f9fafb',
                  border: isActive ? '1px solid rgba(59,130,246,0.45)' : '1px solid transparent',
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.05)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.02)' : '#f9fafb';
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#2563eb' : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(59, 130, 246, 0.1)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                >
                  {(c.first_name || 'U')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.first_name || 'WhatsApp User'} {c.last_name || ''}
                    </span>
                    {c.last_messaged_at && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {new Intl.DateTimeFormat('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(c.last_messaged_at))}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '6px' }}>
                    {c.last_message_sender && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.last_message_sender}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#cbd5e1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message_body || 'No recent message'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{c.wa_id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {blockedWaIds.includes(c.wa_id) && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.12)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Blocked
                        </span>
                      )}
                      {c.unread_messages_count > 0 && (
                        <span
                          style={{
                            backgroundColor: '#10b981',
                            color: '#f8fafc',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '999px',
                            padding: '2px 8px',
                          }}
                        >
                          {c.unread_messages_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const contactLabels = c.labels?.length
                      ? c.labels
                      : (c.label || '')
                          .split(',')
                          .map((label) => label.trim())
                          .filter(Boolean);

                    return contactLabels.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {contactLabels.map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => onLabelClick?.(label)}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#a78bfa',
                              background: 'rgba(167, 139, 250, 0.12)',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
