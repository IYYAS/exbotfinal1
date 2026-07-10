import React, { useEffect, useState, useCallback } from 'react';
import { whatsappAPI } from '../api';
import {
  Bot,
  Plus,
  Search,
  Eye,
  Trash2,
  X,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  AlertTriangle,
  Code2,
  ChevronDown,
  ChevronUp,
  Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ChatbotFlow {
  id: number;
  uid: string;
  name: string;
  is_active: boolean;
  flow_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── JSON Tree Renderer ───────────────────────────────────────────────────────
const JsonNode: React.FC<{ data: any; depth?: number; keyName?: string }> = ({
  data,
  depth = 0,
  keyName,
}) => {
  const [open, setOpen] = useState(depth < 2);

  const indent = depth * 16;

  if (data === null || data === undefined) {
    return (
      <div style={{ paddingLeft: indent, fontSize: 13 }}>
        {keyName && <span style={{ color: '#a78bfa', marginRight: 6 }}>{keyName}:</span>}
        <span style={{ color: '#6b7280' }}>null</span>
      </div>
    );
  }

  if (typeof data !== 'object') {
    const color =
      typeof data === 'boolean' ? '#f59e0b' : typeof data === 'number' ? '#34d399' : '#e2e8f0';
    return (
      <div style={{ paddingLeft: indent, fontSize: 13, lineHeight: '1.8' }}>
        {keyName && <span style={{ color: '#a78bfa', marginRight: 6 }}>{keyName}:</span>}
        <span style={{ color }}>{String(data)}</span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? data.map((v: any, i: number) => [String(i), v])
    : Object.entries(data);
  const isEmpty = entries.length === 0;

  return (
    <div style={{ paddingLeft: indent }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: isEmpty ? 'default' : 'pointer',
          fontSize: 13,
          lineHeight: '1.8',
        }}
        onClick={() => !isEmpty && setOpen((o) => !o)}
      >
        {!isEmpty && (
          <span style={{ color: '#60a5fa', fontSize: 10 }}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {keyName && <span style={{ color: '#a78bfa', marginRight: 4 }}>{keyName}:</span>}
        <span style={{ color: '#60a5fa' }}>
          {isArray ? '[' : '{'}
          {isEmpty && (isArray ? ']' : '}')}
          {!open && !isEmpty && (
            <span style={{ color: '#6b7280', marginLeft: 4 }}>
              {isArray ? `${entries.length} items` : `${entries.length} keys`} ...
              {isArray ? ']' : '}'}
            </span>
          )}
        </span>
      </div>
      {open && !isEmpty && (
        <>
          {entries.map((entry: any) => {
            const [k, v] = entry;
            return <JsonNode key={k} data={v} depth={depth + 1} keyName={isArray ? undefined : k} />;
          })}
          <div style={{ paddingLeft: 0, color: '#60a5fa', fontSize: 13 }}>
            {isArray ? ']' : '}'}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Create Modal ─────────────────────────────────────────────────────────────
const CreateModal: React.FC<{
  onClose: () => void;
  onCreate: (name: string) => void;
  creating: boolean;
}> = ({ onClose, onCreate, creating }) => {
  const [name, setName] = useState('');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          padding: 32,
          width: 420,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, margin: 0 }}>
              Create New Flow
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
              Give your bot flow a name to get started
            </p>
          </div>
        </div>

        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Flow Name *
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
          placeholder="e.g. Welcome Flow, Order Status..."
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 24,
          }}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || creating}
            onClick={() => onCreate(name.trim())}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: name.trim() ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : '#374151',
              color: name.trim() ? '#fff' : '#6b7280',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {creating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            {creating ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
  flow: ChatbotFlow | null;
  onClose: () => void;
}> = ({ flow, onClose }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!flow) return null;

  const hasFlowData = flow.flow_data && Object.keys(flow.flow_data).length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ flex: 1, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          width: 520,
          background: 'var(--surface-color)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.25s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {flow.name}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              Flow ID: {flow.id} · UID: {flow.uid?.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Meta info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {[
            { label: 'Status', value: flow.is_active ? 'Active' : 'Inactive', icon: flow.is_active ? <CheckCircle2 size={14} color="#34d399" /> : <XCircle size={14} color="#ef4444" />, color: flow.is_active ? '#34d399' : '#ef4444' },
            { label: 'Flow ID', value: `#${flow.id}`, icon: <Zap size={14} color="#60a5fa" />, color: '#60a5fa' },
            { label: 'Created', value: formatDate(flow.created_at), icon: <Clock size={14} color="#a78bfa" />, color: '#a78bfa' },
            { label: 'Updated', value: formatDate(flow.updated_at), icon: <Clock size={14} color="#f59e0b" />, color: '#f59e0b' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {item.icon}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Flow Data */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code2 size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Flow Data
              </span>
            </div>
            <button
              onClick={() => setShowRaw((r) => !r)}
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showRaw ? 'Tree View' : 'Raw JSON'}
            </button>
          </div>

          {!hasFlowData ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 24px',
                background: 'var(--bg-color)',
                borderRadius: 12,
                border: '1px dashed var(--border-color)',
              }}
            >
              <AlertTriangle size={32} color="#6b7280" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                No flow data configured yet.
              </p>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                Add nodes and logic to this flow via the Flow Builder.
              </p>
            </div>
          ) : showRaw ? (
            <pre
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: 16,
                fontSize: 12,
                color: '#e2e8f0',
                overflowX: 'auto',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {JSON.stringify(flow.flow_data, null, 2)}
            </pre>
          ) : (
            <div
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: 16,
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              }}
            >
              <JsonNode data={flow.flow_data} depth={0} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const BotReply: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await whatsappAPI.fetchFlows();
      setFlows(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load bot flows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const handleCreate = async (name: string) => {
    setCreating(true);
    try {
      await whatsappAPI.createFlow({ name, flow_data: {}, is_active: true });
      setShowCreate(false);
      await fetchFlows();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create flow.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete flow "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await whatsappAPI.deleteFlow(id);
      if (selectedFlow?.id === id) setSelectedFlow(null);
      await fetchFlows();
    } catch {
      alert('Failed to delete flow.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = flows.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    String(f.id).includes(search)
  );

  const mockBotName = "WhatsApp Business Account";
  const mockBotNumber = "+1 (555) 123-4567";

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 120px)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Column 1: Bots List */}
      <div style={{ width: 260, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-color)' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Bots</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              placeholder="Search..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          {/* Active Bot Item */}
          <div style={{
            padding: 12,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 8,
            cursor: 'pointer',
            borderLeft: '3px solid #3b82f6'
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{mockBotName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{mockBotNumber}</div>
          </div>
        </div>
      </div>

      {/* Column 2: Bot Menu */}
      <div style={{ width: 220, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mockBotName}</div>
        </div>
        <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Bot Reply', active: true, desc: 'Change Settings' },
            { label: 'Short-link', active: false, desc: 'Change Settings' },
            { label: 'Sequence', active: false, desc: 'Change Settings' },
            { label: 'Input Flow', active: false, desc: 'Change Settings' },
            { label: 'Post-back', active: false, desc: 'Change Settings' },
            { label: 'Message Template', active: false, desc: 'Change Settings' },
            { label: 'Action Buttons', active: false, desc: 'Change Settings' },
            { label: 'Configuration', active: false, desc: 'Change Settings' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: item.active ? 'var(--surface-color)' : 'transparent',
                border: item.active ? '1px solid var(--border-color)' : '1px solid transparent',
                borderBottom: item.active ? '2px solid #10b981' : '1px solid transparent', // Green bottom border like screenshot
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}
            >
              <div style={{ color: item.active ? '#10b981' : 'var(--text-secondary)', marginTop: 2 }}>
                <Bot size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: item.active ? 600 : 500, color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: item.active ? '#10b981' : 'var(--text-secondary)' }}>
                  {item.active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: 4 }} />}
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Main Content (Existing Bot Reply) */}
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--surface-color)' }}>

        {/* Page Header inside Content */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Bot Reply Settings
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Manage your chatbot flows and automation rules
            </p>
          </div>
          <button style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            Options <ChevronDown size={14} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={fetchFlows} disabled={loading} style={{ padding: '8px 10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, boxShadow: '0 2px 8px rgba(59,130,246,0.2)' }}
          >
            <Plus size={14} /> Create
          </button>
        </div>

        {/* Table Container */}
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 160px 120px 120px', padding: '12px 16px', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>#</div>
            <div>Reference Name</div>
            <div>Updated At</div>
            <div style={{ textAlign: 'center' }}>Status</div>
            <div style={{ textAlign: 'center' }}>Actions</div>
          </div>

          {/* Table Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <RefreshCw size={24} color="#6b7280" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Loading flows...</p>
              </div>
            ) : error ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: 12 }} />
                <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>
                <button onClick={fetchFlows} style={{ marginTop: 12, padding: '6px 14px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 }}>Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>No flows found.</p>
              </div>
            ) : (
              filtered.map((flow, idx) => {
                const isHovered = hoverRow === flow.id;
                // const isSelected = selectedFlow?.id === flow.id;
                const isDeleting = deletingId === flow.id;
                return (
                  <div
                    key={flow.id}
                    onMouseEnter={() => setHoverRow(flow.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 160px 120px 120px',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      alignItems: 'center',
                      background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedFlow(flow)}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{idx + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{flow.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(flow.updated_at)}</div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: flow.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: flow.is_active ? '#10b981' : '#ef4444' }}>
                        {flow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button title="Edit Builder" onClick={() => navigate(`/flow-builder/${flow.id}`)} style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={12} /></button>
                      <button title="View Details" onClick={() => setSelectedFlow(flow)} style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={12} /></button>
                      <button title="Delete" disabled={isDeleting} onClick={() => handleDelete(flow.id, flow.name)} style={{ width: 28, height: 28, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, background: 'transparent', color: '#ef4444', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isDeleting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table Footer */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--surface-color)' }}>
              <span>Showing 1 to {filtered.length} of {flows.length} entries</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ padding: '4px 10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>Previous</button>
                <button style={{ padding: '4px 10px', border: 'none', background: '#3b82f6', borderRadius: 4, color: '#fff', fontSize: 11, cursor: 'pointer' }}>1</button>
                <button style={{ padding: '4px 10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Detail Drawer & Modals */}
      {selectedFlow && <DetailDrawer flow={selectedFlow} onClose={() => setSelectedFlow(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} creating={creating} />}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BotReply;

