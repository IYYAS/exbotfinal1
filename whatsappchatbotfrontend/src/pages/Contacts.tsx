import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Users, Tag, Filter, Eye, Edit3, Trash2 } from 'lucide-react';
import { whatsappAPI } from '../api';
import type { ContactInfo } from '../types';

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await whatsappAPI.fetchContacts();
      setContacts(res.data || []);
    } catch (err) {
      console.error('Failed to load contacts', err);
      setError('Unable to fetch contacts right now. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const labels = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((contact) => {
      if (contact.label) set.add(contact.label);
    });
    return Array.from(set).sort();
  }, [contacts]);

  const openContactModal = (contact: ContactInfo, mode: 'view' | 'edit') => {
    setSelectedContact(contact);
    setModalMode(mode);
    setActionError(null);

    if (mode === 'edit') {
      setEditFirstName(contact.first_name || '');
      setEditLastName(contact.last_name || '');
      setEditPhone(contact.wa_id || '');
      setEditEmail(contact.email || '');
      setEditLabel(contact.label || '');
    }
  };

  const closeModal = () => {
    setSelectedContact(null);
    setModalMode(null);
    setActionError(null);
  };

  const handleDeleteContact = async (contact: ContactInfo) => {
    if (!window.confirm(`Delete contact ${contact.first_name || 'WhatsApp User'}? This cannot be undone.`)) return;
    setDeletingId(contact.id);
    setActionError(null);

    try {
      await whatsappAPI.deleteContact(contact.id);
      await fetchContacts();
      if (selectedContact?.id === contact.id) {
        closeModal();
      }
    } catch (err) {
      console.error('Failed to delete contact', err);
      setActionError('Unable to delete contact.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    setSaving(true);
    setActionError(null);

    try {
      await whatsappAPI.updateContact(selectedContact.id, {
        first_name: editFirstName,
        last_name: editLastName,
        wa_id: editPhone.replace(/\D/g, ''),
        email: editEmail || null,
        label: editLabel || null,
      });
      await fetchContacts();
      const updated = contacts.find((c) => c.id === selectedContact.id);
      if (updated) {
        setSelectedContact(updated);
      }
      setModalMode('view');
    } catch (err) {
      console.error('Failed to update contact', err);
      setActionError('Unable to save contact changes.');
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        contact.first_name?.toLowerCase().includes(search) ||
        contact.last_name?.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.wa_id?.includes(search) ||
        contact.label?.toLowerCase().includes(search);

      const matchesLabel = !labelFilter || contact.label === labelFilter;
      return matchesSearch && matchesLabel;
    });
  }, [contacts, searchTerm, labelFilter]);

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59, 130, 246, 0.12)', display: 'grid', placeItems: 'center' }}>
              <Users size={22} color="#2563eb" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: 'var(--text-primary)' }}>Subscriber Manager</h1>
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14, maxWidth: 640 }}>
                Contacts loaded from the WhatsApp contact API. Filter by label, search by name or phone, and review subscriber activity.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchContacts}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            borderRadius: 12,
            border: '1px solid var(--border-color)',
            background: 'var(--surface-color)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 16, background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Total Subscribers</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{contacts.length}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 16, background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Tag size={14} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Distinct Labels</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{labels.length}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 16, background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Active Filters</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{filteredContacts.length}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>matching contacts</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, or label"
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              borderRadius: 14,
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          >
            <option value="">All labels</option>
            {labels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 20, border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
        {error ? (
          <div style={{ padding: 28, color: 'var(--error-color)', fontSize: 14 }}>{error}</div>
        ) : loading ? (
          <div style={{ padding: 28, color: 'var(--text-secondary)', fontSize: 14 }}>Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ padding: 28, color: 'var(--text-secondary)', fontSize: 14 }}>No contacts found for your current search and filters.</div>
        ) : (
          <div style={{ overflowX: 'auto', height: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '16px 18px' }}>ID</th>
                  <th style={{ padding: '16px 18px' }}>Name</th>
                  <th style={{ padding: '16px 18px' }}>Phone</th>
                  <th style={{ padding: '16px 18px' }}>Email</th>
                  <th style={{ padding: '16px 18px' }}>Label</th>
                  <th style={{ padding: '16px 18px' }}>Unread</th>
                  <th style={{ padding: '16px 18px' }}>Last Messaged</th>
                  <th style={{ padding: '16px 18px' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', minWidth: 90, color: 'var(--text-secondary)' }}>{contact.id}</td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', minWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {contact.first_name || 'WhatsApp User'} {contact.last_name || ''}
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>+{contact.wa_id}</td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>{contact.email || '—'}</td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                      {contact.label ? (
                        <span style={{ padding: '6px 10px', borderRadius: 9999, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                          {contact.label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', fontWeight: 600, color: contact.unread_messages_count > 0 ? '#22c55e' : 'var(--text-secondary)' }}>
                      {contact.unread_messages_count}
                    </td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                      {formatDateTime(contact.last_messaged_at)}
                    </td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                      {formatDateTime(contact.updated_at)}
                    </td>
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          title="View"
                          onClick={() => openContactModal(contact, 'view')}
                          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => openContactModal(contact, 'edit')}
                          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDeleteContact(contact)}
                          disabled={deletingId === contact.id}
                          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#ef4444', display: 'grid', placeItems: 'center', cursor: deletingId === contact.id ? 'not-allowed' : 'pointer' }}
                        >
                          {deletingId === contact.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modalMode && selectedContact) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 20, background: 'var(--surface-color)', border: '1px solid var(--border-color)', padding: 24, position: 'relative' }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(59,130,246,0.12)', display: 'grid', placeItems: 'center' }}>
                {modalMode === 'edit' ? <Edit3 size={20} color="#2563eb" /> : <Eye size={20} color="#2563eb" />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>
                  {modalMode === 'edit' ? 'Edit Contact' : 'View Contact'}
                </h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {modalMode === 'edit'
                    ? 'Update contact details and save changes.'
                    : 'Inspect the current contact record from the subscriber list.'}
                </p>
              </div>
            </div>

            {modalMode === 'view' ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{selectedContact.first_name || 'WhatsApp User'} {selectedContact.last_name || ''}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>+{selectedContact.wa_id}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedContact.email || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Label</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedContact.label || 'None'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Last Messaged</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formatDateTime(selectedContact.last_messaged_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Updated</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formatDateTime(selectedContact.updated_at)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => openContactModal(selectedContact, 'edit')}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteContact(selectedContact)}
                    disabled={deletingId === selectedContact.id}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#ffffff', cursor: deletingId === selectedContact.id ? 'not-allowed' : 'pointer' }}
                  >
                    {deletingId === selectedContact.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateContact} style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>First name</label>
                    <input
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      required
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>Last name</label>
                    <input
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>Phone</label>
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>Email</label>
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>Label</label>
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                {actionError && (
                  <div style={{ color: '#f87171', fontSize: 13 }}>{actionError}</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--primary-color)', color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
