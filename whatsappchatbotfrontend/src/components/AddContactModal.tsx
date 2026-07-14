import React from 'react';
import { X } from 'lucide-react';


interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  contactName: string;
  onNameChange: (value: string) => void;
  contactPhone: string;
  onPhoneChange: (value: string) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contactName,
  onNameChange,
  contactPhone,
  onPhoneChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Add New WhatsApp Chat
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Contact Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shamil"
              value={contactName}
              onChange={(e) => onNameChange(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Phone Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 919745687920"
              value={contactPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                background: 'var(--primary-color)',
                border: 'none',
                color: '#ffffff',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
