import React from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { ContactInfo } from '../types';

interface ContactListProps {
  contacts: ContactInfo[];
  activeContact: ContactInfo | null;
  searchTerm: string;
  loadingContacts: boolean;
  onSearchChange: (term: string) => void;
  onSelectContact: (contact: ContactInfo) => void;
  onAddContact: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  activeContact,
  searchTerm,
  loadingContacts,
  onSearchChange,
  onSelectContact,
  onAddContact,
}) => {
  const filteredContacts = contacts.filter(c =>
    (c.first_name || 'WhatsApp User').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.wa_id || '').includes(searchTerm)
  );

  return (
    <div
      style={{
        width: '320px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Live Conversations
          </h3>
          <button
            onClick={onAddContact}
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
              transition: '0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
          >
            <Plus size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
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
              background: 'none',
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
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingContacts ? (
          <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
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
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: '0.2s',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '15px',
                  }}
                >
                  {(c.first_name || 'WhatsApp User')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '600',
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
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {new Date(c.last_messaged_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{c.wa_id}
                    </span>
                    {c.unread_messages_count > 0 && (
                      <span
                        style={{
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
                          padding: '0 4px',
                        }}
                      >
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
  );
};
