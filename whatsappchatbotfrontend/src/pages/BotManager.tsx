import React, { useEffect, useState, useCallback } from 'react';
import { whatsappAPI } from '../api';
import type { WhatsAppTemplate } from '../types';
import {
  Bot, Plus, Search, Eye, Trash2, X,
  ChevronRight, CheckCircle2, XCircle, Clock,
  Zap, RefreshCw, AlertTriangle, Code2, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatbotFlow {
  id: number;
  uid: string;
  name: string;
  is_active: boolean;
  flow_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

type ActiveView = 'bot-reply' | 'message-template' | 'sequence';

import SequenceManager from './SequenceManager';

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── JSON Tree Renderer ───────────────────────────────────────────────────────
const JsonNode: React.FC<{ data: any; depth?: number; keyName?: string }> = ({ data, depth = 0, keyName }) => {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 16;
  if (data === null || data === undefined)
    return <div style={{ paddingLeft: indent, fontSize: 13 }}>{keyName && <span style={{ color: '#a78bfa', marginRight: 6 }}>{keyName}:</span>}<span style={{ color: '#6b7280' }}>null</span></div>;
  if (typeof data !== 'object') {
    const color = typeof data === 'boolean' ? '#f59e0b' : typeof data === 'number' ? '#34d399' : '#e2e8f0';
    return <div style={{ paddingLeft: indent, fontSize: 13, lineHeight: '1.8' }}>{keyName && <span style={{ color: '#a78bfa', marginRight: 6 }}>{keyName}:</span>}<span style={{ color }}>{String(data)}</span></div>;
  }
  const isArray = Array.isArray(data);
  const entries: [string, any][] = isArray ? data.map((v: any, i: number) => [String(i), v]) : Object.entries(data);
  const isEmpty = entries.length === 0;
  return (
    <div style={{ paddingLeft: indent }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: isEmpty ? 'default' : 'pointer', fontSize: 13, lineHeight: '1.8' }} onClick={() => !isEmpty && setOpen(o => !o)}>
        {!isEmpty && <span style={{ color: '#60a5fa', fontSize: 10 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>}
        {keyName && <span style={{ color: '#a78bfa', marginRight: 4 }}>{keyName}:</span>}
        <span style={{ color: '#60a5fa' }}>{isArray ? '[' : '{'}</span>
        {!open && <><span style={{ color: '#6b7280', fontSize: 11 }}>&nbsp;{entries.length} items</span><span style={{ color: '#60a5fa' }}>{isArray ? ']' : '}'}</span></>}
      </div>
      {open && (<>{entries.map(([k, v]) => <JsonNode key={k} data={v} depth={depth + 1} keyName={isArray ? undefined : k} />)}<div style={{ color: '#60a5fa', fontSize: 13 }}>{isArray ? ']' : '}'}</div></>)}
    </div>
  );
};

// ─── Create Flow Modal ────────────────────────────────────────────────────────
const CreateFlowModal: React.FC<{ onClose: () => void; onCreate: (name: string) => Promise<void> }> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const handle = async () => { if (!name.trim()) return; setCreating(true); await onCreate(name.trim()); setCreating(false); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} color="#fff" /></div>
          <div><h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, margin: 0 }}>Create New Flow</h3><p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>Give your bot flow a name</p></div>
        </div>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Flow Name *</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && handle()} placeholder="e.g. Welcome Flow..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button disabled={!name.trim() || creating} onClick={handle} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: name.trim() ? 'var(--accent-gradient)' : '#374151', color: name.trim() ? '#fff' : '#6b7280', cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            {creating ? <RefreshCw size={14} /> : <Plus size={14} />}{creating ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{ flow: ChatbotFlow | null; onClose: () => void }> = ({ flow, onClose }) => {
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);
  if (!flow) return null;
  const hasFlowData = flow.flow_data && Object.keys(flow.flow_data).length > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface-color)', borderLeft: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={20} color="#fff" /></div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flow.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Flow ID: {flow.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 6 }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          {[
            { label: 'Status', value: flow.is_active ? 'Active' : 'Inactive', icon: flow.is_active ? <CheckCircle2 size={14} color="var(--success-color)" /> : <XCircle size={14} color="var(--danger-color)" />, color: flow.is_active ? 'var(--success-color)' : 'var(--danger-color)' },
            { label: 'Flow ID', value: `#${flow.id}`, icon: <Zap size={14} color="var(--info-color)" />, color: 'var(--info-color)' },
            { label: 'Created', value: formatDate(flow.created_at), icon: <Clock size={14} color="var(--purple-color)" />, color: 'var(--purple-color)' },
            { label: 'Updated', value: formatDate(flow.updated_at), icon: <Clock size={14} color="var(--warning-color)" />, color: 'var(--warning-color)' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{item.icon}<span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Code2 size={16} color="var(--text-secondary)" /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Flow Data</span></div>
            <button onClick={() => setShowRaw(r => !r)} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{showRaw ? 'Tree View' : 'Raw JSON'}</button>
          </div>
          {!hasFlowData ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-color)', borderRadius: 12, border: '1px dashed var(--border-color)' }}><AlertTriangle size={32} color="#6b7280" style={{ marginBottom: 12 }} /><p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>No flow data yet.</p></div>
          ) : showRaw ? (
            <pre style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, fontSize: 12, color: '#e2e8f0', overflowX: 'auto', lineHeight: 1.6, margin: 0 }}>{JSON.stringify(flow.flow_data, null, 2)}</pre>
          ) : (
            <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, fontFamily: 'var(--font-family)' }}><JsonNode data={flow.flow_data} /></div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => navigate(`/flow-builder/${flow.id}`)} style={{ width: '100%', padding: 10, background: 'var(--accent-gradient)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Edit2 size={14} /> Edit in Flow Builder</button>
        </div>
      </div>
    </div>
  );
};

// ─── Bot Reply Panel ──────────────────────────────────────────────────────────
const BotReplyPanel: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [botPage, setBotPage] = useState(1);
  const itemsPerPage = 8;

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappAPI.fetchFlows();
      const data: ChatbotFlow[] = res.data;
      setFlows(data);
      setStats({ total: data.length, active: data.filter(f => f.is_active).length, inactive: data.filter(f => !f.is_active).length });
    } catch (err) { console.error('Failed to load flows', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const handleCreate = async (name: string) => {
    try { const res = await whatsappAPI.createFlow({ name }); setShowCreate(false); navigate(`/flow-builder/${res.data.id}`); }
    catch (err) { console.error('Create failed', err); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this flow?')) return;
    setDeletingId(id);
    try { await whatsappAPI.deleteFlow(id); await fetchFlows(); if (selectedFlow?.id === id) setSelectedFlow(null); }
    catch (err) { console.error('Delete failed', err); }
    finally { setDeletingId(null); }
  };

  const filtered = flows.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const totalBotPages = Math.ceil(filtered.length / itemsPerPage);
  const currentFlows = filtered.slice((botPage - 1) * itemsPerPage, botPage * itemsPerPage);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bot Reply Settings</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>Manage your chatbot flows and automation rules</p>
        </div>
        <button style={{ padding: '7px 14px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>Options ▼</button>
      </div>

      <div style={{ padding: '12px 20px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
        {[{ label: 'Total Flows', value: stats.total, color: '#60a5fa' }, { label: 'Active', value: stats.active, color: '#34d399' }, { label: 'Inactive', value: stats.inactive, color: '#f87171' }].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flows..." style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={fetchFlows} style={{ padding: '7px 10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><RefreshCw size={14} /></button>
        <button onClick={() => setShowCreate(true)} style={{ padding: '7px 14px', background: 'var(--accent-gradient)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}><Plus size={13} /> Create</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ minWidth: 700, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 160px 100px 110px', padding: '10px 20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>#</div><div>Reference Name</div><div>Updated At</div><div>Status</div><div style={{ textAlign: 'center' }}>Actions</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading flows...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '50px', textAlign: 'center' }}>
                  <Bot size={36} color="#374151" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No flows found</p>
                  <button onClick={() => setShowCreate(true)} style={{ marginTop: 10, padding: '9px 18px', background: 'var(--accent-gradient)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Create Flow</button>
                </div>
              ) : currentFlows.map((flow, idx) => (
                <div key={flow.id} onMouseEnter={() => setHoverRow(flow.id)} onMouseLeave={() => setHoverRow(null)} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 160px 100px 110px', padding: '11px 20px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', background: hoverRow === flow.id ? 'rgba(255,255,255,0.02)' : 'transparent', cursor: 'pointer' }} onClick={() => setSelectedFlow(flow)}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(botPage - 1) * itemsPerPage + idx + 1}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{flow.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(flow.updated_at)}</div>
                  <div><span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: flow.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: flow.is_active ? '#34d399' : '#f87171', border: `1px solid ${flow.is_active ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>{flow.is_active ? 'Active' : 'Inactive'}</span></div>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedFlow(flow)} style={{ width: 26, height: 26, border: '1px solid var(--border-color)', borderRadius: 5, background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={12} /></button>
                    <button onClick={() => navigate(`/flow-builder/${flow.id}`)} style={{ width: 26, height: 26, border: '1px solid var(--border-color)', borderRadius: 5, background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={12} /></button>
                    <button onClick={e => handleDelete(flow.id, e)} disabled={deletingId === flow.id} style={{ width: 26, height: 26, border: '1px solid var(--danger-border)', borderRadius: 5, background: 'var(--danger-bg-light)', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{deletingId === flow.id ? <RefreshCw size={12} /> : <Trash2 size={12} />}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '9px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>Showing {(botPage - 1) * itemsPerPage + 1} to {Math.min(botPage * itemsPerPage, filtered.length)} of {filtered.length} entries</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button disabled={botPage === 1} onClick={() => setBotPage(p => Math.max(1, p - 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: botPage === 1 ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: botPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <button style={{ padding: '3px 9px', border: 'none', background: '#3b82f6', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer' }}>{botPage}</button>
              <button disabled={botPage === totalBotPages} onClick={() => setBotPage(p => Math.min(totalBotPages, p + 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: botPage === totalBotPages ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: botPage === totalBotPages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>
      {showCreate && <CreateFlowModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      <DetailDrawer flow={selectedFlow} onClose={() => setSelectedFlow(null)} />
    </div>
  );
};

// ─── Message Template Panel ───────────────────────────────────────────────────
const MessageTemplatePanel: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templatePage, setTemplatePage] = useState(1);
  const itemsPerPage = 8;
  const totalTemplatePages = Math.ceil(templates.length / itemsPerPage);
  const currentTemplates = templates.slice((templatePage - 1) * itemsPerPage, templatePage * itemsPerPage);

  // Template Variables state
  const [templateVariables, setTemplateVariables] = useState<Array<{ id: number; name: string; created_at: string }>>([]);
  const [showVarModal, setShowVarModal] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [showVarsDropdown, setShowVarsDropdown] = useState(false);
  const [varPage, setVarPage] = useState(1);
  const varsPerPage = 8;
  const totalVarPages = Math.ceil(templateVariables.length / varsPerPage);
  const currentVars = templateVariables.slice((varPage - 1) * varsPerPage, varPage * varsPerPage);

  const fetchVariables = async () => {
    try {
      const res = await whatsappAPI.fetchTemplateVariables();
      setTemplateVariables(res.data);
    } catch { console.error('Failed to load template variables'); }
  };

  const handleCreateVariable = async () => {
    const trimmed = newVarName.trim();
    if (!trimmed) return;
    try {
      const res = await whatsappAPI.createTemplateVariable(trimmed);
      setTemplateVariables(prev => [res.data, ...prev]);
      setNewVarName('');
      setShowVarModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create variable';
      alert(msg);
    }
  };

  const handleDeleteVariable = async (id: number) => {
    if (!window.confirm('Delete this variable?')) return;
    try {
      await whatsappAPI.deleteTemplateVariable(id);
      setTemplateVariables(prev => prev.filter(v => v.id !== id));
    } catch { alert('Failed to delete variable'); }
  };

  const insertVariable = (varName: string) => {
    setTemplateBody(prev => prev + `{{${varName}}}`);
    setShowVarsDropdown(false);
  };

  // form state
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('MARKETING');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [templateBody, setTemplateBody] = useState('');
  const [bodyVariables, setBodyVariables] = useState<Array<{ name: string; example: string }>>([]);
  const [templateFooter, setTemplateFooter] = useState('');
  const [buttons, setButtons] = useState<Array<any>>([]);
  const [showButtonDropdown, setShowButtonDropdown] = useState(false);
  const [openUrlVarsIndex, setOpenUrlVarsIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try { const res = await whatsappAPI.fetchTemplates(); setTemplates(res.data); }
    catch { console.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); fetchVariables(); }, []);

  const syncTemplates = async () => {
    try {
      const res = await whatsappAPI.syncTemplates();
      if (res.data.success) { await fetchTemplates(); alert(`✅ Synced ${res.data.count} templates!`); }
    } catch { alert('Failed to sync'); }
  };

  const buildComponents = (headerHandle: string | null = null) => {
    const components: any[] = [];
    if (headerType !== 'NONE') {
      const hc: any = { type: 'HEADER', format: headerType };
      if (headerType === 'TEXT' && headerText.trim()) hc.text = headerText;
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerHandle) {
        hc.example = { header_handle: [headerHandle] };
      }
      components.push(hc);
    }
    let finalBodyText = templateBody;
    const bodyTextExamples: string[] = [];
    let counter = 1;
    let matchIndex = 0;

    finalBodyText = finalBodyText.replace(/\{\{([^}]+)\}\}/g, () => {
      // Ignore if it's already a number? No, just replace all with sequential numbers
      const v = bodyVariables[matchIndex];
      bodyTextExamples.push(v && v.example ? v.example : 'sample');
      matchIndex++;
      return `{{${counter++}}}`;
    });

    const bc: any = { type: 'BODY', text: finalBodyText };
    if (bodyTextExamples.length > 0) {
      bc.example = { body_text: [bodyTextExamples] };
    }

    components.push(bc);
    if (templateFooter.trim()) components.push({ type: 'FOOTER', text: templateFooter });
    if (buttons.length > 0) {
      const cleanButtons = buttons.map(b => {
        const { urlType, countryCode, ...rest } = b;
        if (rest.type === 'PHONE_NUMBER' && countryCode) {
          let num = (rest.phone_number || '').trim();
          if (!num.startsWith('+') && num.length > 0) {
            rest.phone_number = countryCode + num;
          }
        }
        return rest;
      });
      components.push({ type: 'BUTTONS', buttons: cleanButtons });
    }
    return components;
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) { alert('Name and body are required'); return; }
    if (!/^[a-z0-9_]+$/.test(templateName.trim())) { alert('Template name can only contain lowercase letters, numbers, and underscores.'); return; }
    const trimmedBody = templateBody.trim();
    if (trimmedBody.startsWith('{{') || trimmedBody.endsWith('}}')) { alert('❌ Meta does not allow variables at the very beginning or end of the message body.\n\nExample: "Hello {{name}}, how are you?"'); return; }
    if (/\}\}\s*\{\{/.test(trimmedBody)) { alert('❌ Meta does not allow consecutive variables without text between them.\n\nInvalid: hello {{1}}{{2}} world\nValid: hello {{1}}, your order {{2}} is ready.'); return; }
    if (headerType === 'TEXT' && !headerText.trim()) { alert('Header text is required when Header Type is Text'); return; }
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && !headerFile) { alert('Media file is required for this header type'); return; }
    
    setCreating(true);
    try {
      let headerHandle = null;
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerFile) {
        const formData = new FormData();
        formData.append('file', headerFile);
        const uploadRes = await whatsappAPI.uploadTemplateMedia(formData);
        if (uploadRes.data.success && uploadRes.data.header_handle) {
          headerHandle = uploadRes.data.header_handle;
        } else {
          alert('❌ Failed to upload media file to Meta.');
          setCreating(false);
          return;
        }
      }

      const res = await whatsappAPI.createTemplate({ name: templateName, language: templateLanguage, category: templateCategory, components: buildComponents(headerHandle) });
      if (res.data.success) { alert('✅ Template created!'); resetForm(); setShowCreateModal(false); await fetchTemplates(); }
    } catch (err: any) { alert(`❌ Error: ${err.response?.data?.error || 'Failed'}`); }
    finally { setCreating(false); }
  };

  const handleDeleteTemplate = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try { await whatsappAPI.deleteTemplate(name); alert('✅ Deleted!'); await fetchTemplates(); }
    catch (err: any) { alert(`❌ ${err.response?.data?.error || 'Failed'}`); }
  };


  const resetForm = () => {
    setTemplateName(''); setTemplateCategory('MARKETING'); setTemplateLanguage('en_US');
    setHeaderType('NONE'); setHeaderText(''); setHeaderFile(null); setTemplateBody(''); setBodyVariables([]);
    setTemplateFooter(''); setButtons([]); setShowButtonDropdown(false); setOpenUrlVarsIndex(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Message Template Settings</h1>
        <button style={{ padding: '7px 14px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>Options ▼</button>
      </div>

      <div style={{ padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', width: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input placeholder="Search..." style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={syncTemplates} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid #06b6d4', borderRadius: 6, color: '#06b6d4', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><span>⟳</span> Sync Template</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowCreateDropdown(!showCreateDropdown)} style={{ padding: '7px 14px', background: '#0ea5e9', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Create ▾
          </button>
          {showCreateDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowCreateDropdown(false)} />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 5, width: 220, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, padding: 6, display: 'flex', flexDirection: 'column' }}>
                {['Mixed Template', 'WP Template', 'Carousel Media Template 🔒', 'Carousel Product Template 🔒', 'Default Template'].map((opt) => (
                  <button 
                    key={opt} 
                    onClick={() => { setShowCreateDropdown(false); resetForm(); setShowCreateModal(true); }} 
                    style={{ padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: opt.includes('🔒') ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ minWidth: 700, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 100px 110px 90px 100px', padding: '10px 20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>#</div><div>Template Name</div><div>Type</div><div>Status</div><div style={{ textAlign: 'center' }}>Actions</div><div>Updated at</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading templates...</div>
              ) : templates.length === 0 ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: 13 }}>No templates yet.</p>
                  <button onClick={() => { resetForm(); setShowCreateModal(true); }} style={{ marginTop: 10, padding: '9px 18px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Create Template</button>
                </div>
              ) : currentTemplates.map((template, idx) => (
                <div key={template.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 100px 110px 90px 100px', padding: '11px 20px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(templatePage - 1) * itemsPerPage + idx + 1}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{template.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({template.data?.category || 'Custom'})</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>text</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: template.status === 'APPROVED' ? '#10b981' : '#f59e0b' }} />
                    <span style={{ fontSize: 11, color: template.status === 'APPROVED' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>{template.status === 'APPROVED' ? 'Approved' : template.status || 'Pending'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedTemplate(template)} style={{ width: 26, height: 26, border: '1px solid var(--border-color)', borderRadius: 5, background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={12} /></button>
                    <button onClick={() => handleDeleteTemplate(template.name)} style={{ width: 26, height: 26, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 5, background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{(template as any).updated_at ? new Date((template as any).updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {!loading && templates.length > 0 && (
          <div style={{ padding: '9px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>Showing {(templatePage - 1) * itemsPerPage + 1} to {Math.min(templatePage * itemsPerPage, templates.length)} of {templates.length} entries</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button disabled={templatePage === 1} onClick={() => setTemplatePage(p => Math.max(1, p - 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: templatePage === 1 ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: templatePage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <button style={{ padding: '3px 9px', border: 'none', background: '#3b82f6', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer' }}>{templatePage}</button>
              <button disabled={templatePage === totalTemplatePages} onClick={() => setTemplatePage(p => Math.min(totalTemplatePages, p + 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: templatePage === totalTemplatePages ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: templatePage === totalTemplatePages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, width: '100%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Message Template</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left Column: Form */}
              <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, borderRight: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Template Name *</label>
                  <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Put a name to track it later" style={{ width: '100%', padding: '9px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Locale *</label>
                  <select value={templateLanguage} onChange={e => setTemplateLanguage(e.target.value)} style={{ width: '100%', padding: '9px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
                    <option value="en_US">English (US)</option><option value="es_ES">Spanish</option><option value="hi_IN">Hindi</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Template Category *</label>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {['UTILITY', 'MARKETING', 'AUTHENTICATION'].map(cat => (
                      <div key={cat} onClick={() => setTemplateCategory(cat)} style={{ flex: 1, textAlign: 'center', padding: '9px 0', fontSize: 11, cursor: 'pointer', background: templateCategory === cat ? '#3b82f6' : 'var(--bg-color)', color: templateCategory === cat ? '#fff' : 'var(--text-secondary)', fontWeight: templateCategory === cat ? 600 : 400 }}>
                        {cat === 'AUTHENTICATION' ? 'Auth/OTP' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Header Type *</label>
                  <select value={headerType} onChange={e => setHeaderType(e.target.value as any)} style={{ width: '100%', padding: '9px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
                    <option value="NONE">No Header</option><option value="TEXT">Text Header</option><option value="IMAGE">Image</option><option value="VIDEO">Video</option><option value="DOCUMENT">Document</option>
                  </select>
                  {headerType === 'TEXT' && <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Header text..." style={{ width: '100%', marginTop: 7, padding: '9px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />}
                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && <input type="file" onChange={e => setHeaderFile(e.target.files ? e.target.files[0] : null)} style={{ width: '100%', marginTop: 7, padding: '6px 9px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} accept={headerType === 'IMAGE' ? 'image/*' : headerType === 'VIDEO' ? 'video/*' : '*/*'} />}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Message Body (1024) *</label>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <button style={{ padding: '7px 11px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer' }}>⚙️ Custom Fields ▼</button>
                    <div style={{ position: 'relative' }}>
                      <button
                        style={{ padding: '7px 11px', background: showVarsDropdown ? 'rgba(59,130,246,0.15)' : 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: showVarsDropdown ? '#3b82f6' : 'var(--text-primary)', fontSize: 11, cursor: 'pointer' }}
                        onClick={() => setShowVarsDropdown(v => !v)}
                      >⌨️ Variables ▼</button>
                      {showVarsDropdown && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowVarsDropdown(false)} />
                          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 2, minWidth: 180, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 200, padding: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {templateVariables.length === 0 ? (
                              <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
                                No variables saved yet.<br />
                                <span style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setShowVarsDropdown(false); setShowVarModal(true); }}>Create one</span>
                              </div>
                            ) : (
                              templateVariables.map(v => (
                                <button
                                  key={v.id}
                                  onClick={() => insertVariable(v.name)}
                                  style={{ padding: '7px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 10 }}>{'{{'}</span>
                                  <span style={{ flex: 1 }}>{v.name}</span>
                                  <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 10 }}>{'}}'}</span>
                                </button>
                              ))
                            )}
                            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                              <button onClick={() => { setShowVarsDropdown(false); setShowVarModal(true); }} style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: '#3b82f6', fontSize: 11, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={11} /> Add New Variable
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <button style={{ padding: '7px 11px', background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }} onClick={() => setTemplateBody(p => p + '{{name}}')}>👤 Name</button>
                  </div>
                  <textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} style={{ width: '100%', height: 100, padding: 12, background: 'var(--surface-color)', border: 'none', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none', resize: 'none' }} />
                </div>
                {(templateBody.match(/\{\{([^}]+)\}\}/g) || []).map((match, i) => (
                  <input key={i} type="text" placeholder={`Example for ${match.replace(/[{}]/g, '')}`} value={bodyVariables[i]?.example || ''} onChange={e => { const v = [...bodyVariables]; v[i] = { name: match.replace(/[{}]/g, ''), example: e.target.value }; setBodyVariables(v); }} style={{ width: '100%', marginTop: 7, padding: '7px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, boxSizing: 'border-box', outline: 'none' }} />
                ))}
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Footer Text</label>
                <input type="text" value={templateFooter} onChange={e => setTemplateFooter(e.target.value)} placeholder="Provide text for footer (60)" style={{ width: '100%', padding: '9px 11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>Buttons</label>
                <div style={{ position: 'relative', width: 'fit-content' }}>
                  <button type="button" onClick={() => setShowButtonDropdown(!showButtonDropdown)} style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    + Add button
                  </button>
                   {showButtonDropdown && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowButtonDropdown(false)} />
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, width: 240, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, padding: 8, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '4px 8px' }}>Quick reply buttons</div>
                        <button type="button" onClick={() => { setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]); setShowButtonDropdown(false); }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Custom</button>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '12px 8px 4px 8px' }}>Call to action buttons</div>
                        {(() => {
                          const urlCount = buttons.filter((b: any) => b.type === 'URL').length;
                          const phoneCount = buttons.filter((b: any) => b.type === 'PHONE_NUMBER').length;
                          const copyCount = buttons.filter((b: any) => b.type === 'COPY_CODE').length;
                          const urlDisabled = urlCount >= 2;
                          const phoneDisabled = phoneCount >= 1;
                          const copyDisabled = copyCount >= 1;
                          return (
                            <>
                              <button type="button" disabled={urlDisabled} onClick={() => { if (!urlDisabled) { setButtons([...buttons, { type: 'URL', text: '', url: '', urlType: 'Static' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: urlDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: urlDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: urlDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!urlDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span>Visit website</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>2 buttons maximum</span>
                              </button>
                              <button type="button" disabled={phoneDisabled} onClick={() => { if (!phoneDisabled) { setButtons([...buttons, { type: 'PHONE_NUMBER', text: '', countryCode: '+91', phone_number: '' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: phoneDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: phoneDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: phoneDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!phoneDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span>Call phone number</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>1 button maximum</span>
                              </button>
                              <button type="button" disabled={copyDisabled} onClick={() => { if (!copyDisabled) { setButtons([...buttons, { type: 'COPY_CODE', text: 'Copy Code', example: '' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: copyDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: copyDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: copyDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!copyDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span>Copy offer code</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>1 button maximum</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>

                {buttons.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {buttons.map((b, i) => (
                      <div key={i} style={{ padding: 16, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-color)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 12, right: 12, cursor: 'pointer', color: '#ef4444' }} onClick={() => setButtons(buttons.filter((_, j) => j !== i))}><X size={16} /></div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                          {b.type === 'QUICK_REPLY' ? 'Quick Reply' : b.type === 'URL' ? 'Call to Action • Visit Website' : b.type === 'PHONE_NUMBER' ? 'Call to Action • Phone Number' : 'Call to Action • Copy Code'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Type of Action</label>
                            <input disabled value={b.type === 'QUICK_REPLY' ? 'Custom' : b.type === 'URL' ? 'Visit website' : b.type === 'PHONE_NUMBER' ? 'Call phone number' : 'Copy offer code'} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 12, outline: 'none' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Button Text</label>
                            <input value={b.text} onChange={e => { const newB = [...buttons]; newB[i].text = e.target.value; setButtons(newB); }} placeholder="Button Text" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                          </div>
                          {b.type === 'URL' && (
                            <>
                              <div>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL Type</label>
                                <select value={b.urlType || 'Static'} onChange={e => { const newB = [...buttons]; newB[i].urlType = e.target.value; setButtons(newB); }} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
                                  <option value="Static">Static</option>
                                  <option value="Dynamic">Dynamic</option>
                                </select>
                              </div>
                              <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Website URL</span>
                                  {b.urlType === 'Dynamic' && (
                                    <span style={{ color: '#3b82f6', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => setOpenUrlVarsIndex(openUrlVarsIndex === i ? null : i)}>
                                      ⌨️ Variables ▼
                                    </span>
                                  )}
                                </label>
                                <input value={b.url} onChange={e => { const newB = [...buttons]; newB[i].url = e.target.value; setButtons(newB); }} placeholder={b.urlType === 'Dynamic' ? 'https://example.com/{{1}}' : 'https://example.com'} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                                {openUrlVarsIndex === i && (
                                  <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpenUrlVarsIndex(null)} />
                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 160, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 300, padding: 6 }}>
                                      {templateVariables.length === 0 ? (
                                        <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-secondary)' }}>No variables yet</div>
                                      ) : (
                                        templateVariables.map(v => (
                                          <button key={v.id} type="button" onClick={() => { const newB = [...buttons]; newB[i].url = (newB[i].url || '') + `{{${v.name}}}`; setButtons(newB); setOpenUrlVarsIndex(null); }} style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {`{{${v.name}}}`}
                                          </button>
                                        ))
                                      )}
                                      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                                        <button type="button" onClick={() => { const newB = [...buttons]; newB[i].url = (newB[i].url || '') + '{{1}}'; setButtons(newB); setOpenUrlVarsIndex(null); }} style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', textAlign: 'left', color: '#8b5cf6', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>{'+ Insert {{1}}'}</button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                          {b.type === 'PHONE_NUMBER' && (
                            <>
                              <div>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Country</label>
                                <select value={b.countryCode || '+91'} onChange={e => { const newB = [...buttons]; newB[i].countryCode = e.target.value; setButtons(newB); }} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none' }}>
                                  <option value="+93">Afghanistan (+93)</option>
                                  <option value="+355">Albania (+355)</option>
                                  <option value="+213">Algeria (+213)</option>
                                  <option value="+61">Australia (+61)</option>
                                  <option value="+43">Austria (+43)</option>
                                  <option value="+880">Bangladesh (+880)</option>
                                  <option value="+32">Belgium (+32)</option>
                                  <option value="+55">Brazil (+55)</option>
                                  <option value="+1">Canada (+1)</option>
                                  <option value="+86">China (+86)</option>
                                  <option value="+20">Egypt (+20)</option>
                                  <option value="+33">France (+33)</option>
                                  <option value="+49">Germany (+49)</option>
                                  <option value="+91">India (+91)</option>
                                  <option value="+62">Indonesia (+62)</option>
                                  <option value="+98">Iran (+98)</option>
                                  <option value="+964">Iraq (+964)</option>
                                  <option value="+353">Ireland (+353)</option>
                                  <option value="+39">Italy (+39)</option>
                                  <option value="+81">Japan (+81)</option>
                                  <option value="+962">Jordan (+962)</option>
                                  <option value="+254">Kenya (+254)</option>
                                  <option value="+60">Malaysia (+60)</option>
                                  <option value="+52">Mexico (+52)</option>
                                  <option value="+212">Morocco (+212)</option>
                                  <option value="+31">Netherlands (+31)</option>
                                  <option value="+64">New Zealand (+64)</option>
                                  <option value="+234">Nigeria (+234)</option>
                                  <option value="+47">Norway (+47)</option>
                                  <option value="+92">Pakistan (+92)</option>
                                  <option value="+63">Philippines (+63)</option>
                                  <option value="+48">Poland (+48)</option>
                                  <option value="+351">Portugal (+351)</option>
                                  <option value="+966">Saudi Arabia (+966)</option>
                                  <option value="+65">Singapore (+65)</option>
                                  <option value="+27">South Africa (+27)</option>
                                  <option value="+82">South Korea (+82)</option>
                                  <option value="+34">Spain (+34)</option>
                                  <option value="+94">Sri Lanka (+94)</option>
                                  <option value="+46">Sweden (+46)</option>
                                  <option value="+41">Switzerland (+41)</option>
                                  <option value="+886">Taiwan (+886)</option>
                                  <option value="+66">Thailand (+66)</option>
                                  <option value="+90">Turkey (+90)</option>
                                  <option value="+971">UAE (+971)</option>
                                  <option value="+44">United Kingdom (+44)</option>
                                  <option value="+1">United States (+1)</option>
                                  <option value="+84">Vietnam (+84)</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Phone Number</label>
                                <input value={b.phone_number} onChange={e => { const newB = [...buttons]; newB[i].phone_number = e.target.value; setButtons(newB); }} placeholder="Phone Number" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                              </div>
                            </>
                          )}
                          {b.type === 'COPY_CODE' && (
                            <div style={{ gridColumn: '1 / span 2' }}>
                              <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Offer Code</label>
                              <input value={b.example} onChange={e => { const newB = [...buttons]; newB[i].example = e.target.value; setButtons(newB); }} placeholder="25OFF" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column: Phone Mockup */}
              <div style={{ width: 400, background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                {/* Phone Container */}
                <div style={{ width: 320, height: 600, background: '#fff', border: '12px solid #222', borderRadius: 40, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
                  {/* Whatsapp Header */}
                  <div style={{ background: '#075e54', color: '#fff', padding: '36px 12px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} /></div>
                     <div>
                       <div style={{ fontWeight: 600, fontSize: 14 }}>Business Name</div>
                       <div style={{ fontSize: 10, opacity: 0.8 }}>online</div>
                     </div>
                  </div>
                  {/* Chat Area */}
                  <div style={{ background: '#e5ddd5', flex: 1, padding: 16, overflowY: 'auto', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover' }}>
                    <div style={{ background: '#dcf8c6', padding: 12, borderRadius: 8, borderTopLeftRadius: 0, fontSize: 13, color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      {headerType === 'TEXT' && headerText && <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{headerText}</div>}
                      {headerType === 'IMAGE' && <div style={{ background: 'rgba(0,0,0,0.05)', height: 120, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 4 }}>📷 Image Placeholder</div>}
                      {headerType === 'VIDEO' && <div style={{ background: 'rgba(0,0,0,0.05)', height: 120, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 4 }}>🎥 Video Placeholder</div>}
                      {headerType === 'DOCUMENT' && <div style={{ background: 'rgba(0,0,0,0.05)', height: 60, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', borderRadius: 4 }}>📄 Document Placeholder</div>}
                      
                      <div style={{ whiteSpace: 'pre-wrap' }}>{templateBody ? templateBody : <span style={{ color: '#999', fontStyle: 'italic' }}>Enter message body...</span>}</div>
                      
                      {templateFooter && <div style={{ fontSize: 10, color: '#666', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>{templateFooter}</div>}
                    </div>
                    
                    {buttons.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                         {buttons.map((b, i) => (
                           <div key={i} style={{ background: '#fff', padding: 10, borderRadius: 8, textAlign: 'center', fontSize: 12, color: '#0ea5e9', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                             {b.text || 'Button'}
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
              <button onClick={handleCreateTemplate} disabled={creating} style={{ padding: '9px 22px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedTemplate(null)}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '80vh', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{selectedTemplate.name}</h2>
              <button onClick={() => setSelectedTemplate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {selectedTemplate.status === 'REJECTED' && (selectedTemplate.data?.rejected_reason || selectedTemplate.data?.reason) && (
              <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                <strong>Rejection Reason: </strong> {selectedTemplate.data.rejected_reason || selectedTemplate.data.reason}
              </div>
            )}
            <pre style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-color)', padding: 14, borderRadius: 8, fontSize: 11, color: 'var(--text-primary)', margin: 0 }}>{JSON.stringify(selectedTemplate, null, 2)}</pre>
          </div>
        </div>
      )}
      {/* ── Template Variables Table ───────────── */}
      <div style={{ marginTop: 20, padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Template Variables</h2>
      </div>
      <div style={{ padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', width: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input placeholder="Search & Enter..." style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setNewVarName(''); setShowVarModal(true); }} style={{ padding: '7px 12px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={12} /> Create</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 180px 80px', padding: '10px 20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div>#</div><div>Variable Name</div><div>Created At</div><div style={{ textAlign: 'center' }}>Actions</div>
            </div>
            {currentVars.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>No template variables yet. Click Create to add one.</div>
            ) : (
              currentVars.map((v, idx) => (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 180px 80px', padding: '11px 20px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(varPage - 1) * varsPerPage + idx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>{'{{'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</span>
                    <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>{'}}'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                    <button onClick={() => handleDeleteVariable(v.id)} style={{ width: 26, height: 26, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 5, background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ padding: '9px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
          <div>
            <select style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontSize: 11 }}>
              <option value="8">8</option><option value="10">10</option>
            </select>
          </div>
          <span>{templateVariables.length === 0 ? '0 - 0 of 0' : `${(varPage - 1) * varsPerPage + 1} - ${Math.min(varPage * varsPerPage, templateVariables.length)} of ${templateVariables.length}`}</span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button disabled={varPage === 1} onClick={() => setVarPage(p => Math.max(1, p - 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: varPage === 1 ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: varPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <button disabled={varPage === totalVarPages || templateVariables.length === 0} onClick={() => setVarPage(p => Math.min(totalVarPages, p + 1))} style={{ padding: '3px 9px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: (varPage === totalVarPages || templateVariables.length === 0) ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: 10, cursor: (varPage === totalVarPages || templateVariables.length === 0) ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </div>
      </div>

      {/* ── Create Variable Modal ──────────────── */}
      {showVarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowVarModal(false)}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 14, width: '100%', maxWidth: 420, padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{'{}'}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Template Variable</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>Available in the Variables ▼ dropdown inside the template editor</p>
              </div>
              <button onClick={() => setShowVarModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>✕</button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 7 }}>Variable Name *</label>
              <input
                autoFocus
                type="text"
                value={newVarName}
                onChange={e => setNewVarName(e.target.value.replace(/\s/g, '_'))}
                onKeyDown={e => e.key === 'Enter' && handleCreateVariable()}
                placeholder="e.g. customer_name, order_id..."
                style={{ width: '100%', padding: '10px 13px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
              {newVarName.trim() && (
                <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, fontSize: 12, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Preview: <strong style={{ marginLeft: 4 }}>{`{{${newVarName}}}`}</strong>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVarModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button
                onClick={handleCreateVariable}
                disabled={!newVarName.trim()}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: newVarName.trim() ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : '#374151', color: newVarName.trim() ? '#fff' : '#6b7280', cursor: newVarName.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}
              >💾 Save Variable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Bot Manager Page ────────────────────────────────────────────────────
const BotManager: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('bot-reply');

  const menuItems: Array<{ key: ActiveView | null; label: string; desc: string }> = [
    { key: 'bot-reply', label: 'Bot Reply', desc: 'Change Settings' },
    { key: null, label: 'Short-link', desc: 'Change Settings' },
    { key: 'sequence', label: 'Sequence', desc: 'Change Settings' },
    { key: null, label: 'Input Flow', desc: 'Change Settings' },
    { key: null, label: 'Post-back', desc: 'Change Settings' },
    { key: 'message-template', label: 'Message Template', desc: 'Change Settings' },
    { key: null, label: 'Action Buttons', desc: 'Change Settings' },
    { key: null, label: 'Configuration', desc: 'Change Settings' },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', height: 'calc(100vh - 124px)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Column 1: Bots List */}
      <div style={{ width: 230, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>Bots</h2>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input placeholder="Search..." style={{ width: '100%', padding: '6px 9px 6px 28px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, padding: 9, overflowY: 'auto' }}>
          <div style={{ padding: 11, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', borderRadius: 8, cursor: 'pointer' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>WhatsApp Business Account</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+1 (555) 123-4567</div>
          </div>
        </div>
      </div>

      {/* Column 2: Bot Menu */}
      <div style={{ width: 200, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--bg-color)' }}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WhatsApp Business Account</div>
        </div>
        <div style={{ flex: 1, padding: '9px 7px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map(item => {
            const isActive = item.key === activeView;
            return (
              <div
                key={item.label}
                onClick={() => item.key && setActiveView(item.key)}
                style={{ padding: '8px 9px', borderRadius: 6, background: isActive ? 'var(--surface-color)' : 'transparent', border: isActive ? '1px solid var(--border-color)' : '1px solid transparent', borderBottom: isActive ? '2px solid #10b981' : '1px solid transparent', cursor: item.key ? 'pointer' : 'default', display: 'flex', alignItems: 'flex-start', gap: 7 }}
              >
                <div style={{ color: isActive ? '#10b981' : 'var(--text-secondary)', fontSize: 13, marginTop: 1 }}>⚙️</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: isActive ? '#10b981' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                    {isActive && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />}
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 3: Switchable Content Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {activeView === 'bot-reply' && <BotReplyPanel />}
        {activeView === 'message-template' && <MessageTemplatePanel />}
        {activeView === 'sequence' && <SequenceManager />}
      </div>
    </div>
  );
};

export default BotManager;
