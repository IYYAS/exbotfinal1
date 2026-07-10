import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { whatsappAPI } from '../api';
import {
  RefreshCw, Activity, Clock, Users, CheckCircle,
  XCircle, AlertTriangle, Play, Pause, ChevronRight,
  Search, Send
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SequenceEnrollment {
  id: number;
  contact_name: string;
  contact_wa_id: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'cancelled';
  pending_count: number;
  sent_count: number;
}

interface SequenceDelivery {
  id: number;
  node_id: string;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message: string | null;
}

interface SequenceSummary {
  flow_id: number;
  flow_name: string;
  campaign_node_id: string;
  campaign_name: string;
  sequence_name?: string;
  flow_data?: any;
  node_data?: any;
  total_enrolled: number;
  active_count: number;
  completed_count: number;
  pending_deliveries: number;
  sent_deliveries: number;
  failed_deliveries: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────
const SequenceManager: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<SequenceSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<SequenceSummary | null>(null);
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);
  const [deliveries, setDeliveries] = useState<SequenceDelivery[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<SequenceEnrollment | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'enrollments' | 'deliveries' | 'overview'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await whatsappAPI.fetchSequenceFlows();
      const raw: any[] = res.data || [];
      const flattened: SequenceSummary[] = [];

      for (const flow of raw) {
        const nodes = flow.sequence_nodes || [];
        for (const node of nodes) {
          flattened.push({
            flow_id: flow.id,
            flow_name: flow.name,
            campaign_node_id: String(node.id),
            campaign_name: node.sequence_name || node.name || `Sequence ${node.id}`,
            sequence_name: node.sequence_name || node.name || `Sequence ${node.id}`,
            flow_data: flow.flow_data,
            node_data: node.data,
            total_enrolled: 0,
            active_count: 0,
            completed_count: 0,
            pending_deliveries: 0,
            sent_deliveries: 0,
            failed_deliveries: 0,
          });
        }
      }

      setCampaigns(flattened);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async (campaign: SequenceSummary) => {
    try {
      const res = await whatsappAPI.fetchSequenceEnrollments();
      const filtered = res.data.filter(
        (e: any) => String(e.flow) === String(campaign.flow_id) && e.node_id === campaign.campaign_node_id
      );
      setEnrollments(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveries = async (enrollmentId: number) => {
    try {
      const res = await whatsappAPI.fetchSequenceDeliveries(enrollmentId);
      setDeliveries(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelEnrollment = async (enrollmentId: number) => {
    try {
      await whatsappAPI.cancelSequenceEnrollment(enrollmentId);
      if (selectedCampaign) fetchEnrollments(selectedCampaign);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSelectCampaign = (c: SequenceSummary) => {
    setSelectedCampaign(c);
    setSelectedEnrollment(null);
    setDeliveries([]);
    setActiveTab('overview');
    fetchEnrollments(c);
  };

  const handleSelectEnrollment = (e: SequenceEnrollment) => {
    setSelectedEnrollment(e);
    setActiveTab('deliveries');
    fetchDeliveries(e.id);
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.flow_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (s: string) =>
    s === 'active' ? '#22c55e' : s === 'completed' ? '#3b82f6' : s === 'failed' ? '#ef4444' : '#64748b';

  const statusBg = (s: string) =>
    s === 'active' ? 'rgba(34,197,94,0.12)' : s === 'completed' ? 'rgba(59,130,246,0.12)' : s === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.1)';

  const deliveryStatusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle size={13} color="#22c55e" />;
    if (s === 'failed') return <XCircle size={13} color="#ef4444" />;
    if (s === 'pending') return <Clock size={13} color="#fbbf24" />;
    return <AlertTriangle size={13} color="#94a3b8" />;
  };

  const formatDate = (dt: string) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 120px)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT: Campaign List Panel ─────────────────────────────────────────── */}
      <div style={{ width: 320, background: 'var(--bg-color)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Sequences</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>All active drip campaigns powered by Flow Builder</p>
            </div>
            <button
              onClick={fetchCampaigns}
              style={{ border: 'none', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Refresh"
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 98, background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Campaigns</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{campaigns.length}</div>
            </div>
            <div style={{ flex: 1, minWidth: 98, background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Selected</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{selectedCampaign ? 1 : 0}</div>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && campaigns.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading campaigns...</div>
          )}
          {!loading && filteredCampaigns.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Activity size={32} color="#334155" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>No campaigns yet</div>
              <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>Build a sequence in the Flow Builder using Sequence Campaign nodes</div>
            </div>
          )}
          {filteredCampaigns.map((c, i) => {
            const isSelected = selectedCampaign?.campaign_node_id === c.campaign_node_id && selectedCampaign?.flow_id === c.flow_id;
            return (
              <div
                key={i}
                onClick={() => handleSelectCampaign(c)}
                style={{
                  margin: '6px 12px',
                  padding: '14px 14px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.12)' : '#111827',
                  border: `1px solid ${isSelected ? '#3b82f6' : '#1f2937'}`,
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 10px 20px rgba(59,130,246,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.campaign_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.flow_name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '4px 8px', borderRadius: 999 }}>
                        {c.active_count} active
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '4px 8px', borderRadius: 999 }}>
                        {c.total_enrolled} total
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/flow-builder/${c.flow_id}`); }}
                    style={{ border: 'none', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedCampaign ? (
          /* Empty State */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', background: 'linear-gradient(180deg, #0b1120 0%, #111827 100%)' }}>
            <div style={{ width: 88, height: 88, borderRadius: 24, background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <Activity size={36} color="#60a5fa" />
            </div>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>Select a Sequence Campaign</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 380, lineHeight: 1.6 }}>
              Choose a campaign from the left panel to view enrolled contacts, delivery status, and flow analytics.
            </p>
            <button
              onClick={() => navigate('/bot-reply')}
              style={{ marginTop: 24, padding: '12px 20px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 999, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              Go to Flow Builder
            </button>
            <div style={{ marginTop: 22, padding: '14px 18px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 14, fontSize: 12, color: '#94a3b8', width: 360, textAlign: 'center' }}>
              💡 Build sequences in <strong style={{ color: '#60a5fa' }}>WhatsApp Automation → Flow Builder</strong> using the <strong style={{ color: '#60a5fa' }}>Sequence Campaign</strong> node.
            </div>
          </div>
        ) : (
          <>
            {/* Campaign Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', background: '#111827' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={20} color="#fff" />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{selectedCampaign.campaign_name}</h2>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Flow: {selectedCampaign.flow_name}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { fetchEnrollments(selectedCampaign); fetchCampaigns(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                  <button
                    onClick={() => navigate(`/flow-builder/${selectedCampaign.flow_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    <ChevronRight size={13} /> Open Flow Builder
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {[
                  { label: 'Total Enrolled', value: selectedCampaign.total_enrolled, color: '#94a3b8', icon: <Users size={14} /> },
                  { label: 'Active', value: selectedCampaign.active_count, color: '#22c55e', icon: <Play size={14} /> },
                  { label: 'Completed', value: selectedCampaign.completed_count, color: '#3b82f6', icon: <CheckCircle size={14} /> },
                  { label: 'Msgs Sent', value: selectedCampaign.sent_deliveries, color: '#a78bfa', icon: <Send size={14} /> },
                  { label: 'Msgs Pending', value: selectedCampaign.pending_deliveries, color: '#fbbf24', icon: <Clock size={14} /> },
                  { label: 'Msgs Failed', value: selectedCampaign.failed_deliveries, color: '#ef4444', icon: <XCircle size={14} /> },
                ].map((stat, i) => (
                  <div key={i} style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: stat.color }}>{stat.icon}<span style={{ fontSize: 10, fontWeight: 600 }}>{stat.label}</span></div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                {(['overview', 'enrollments', 'deliveries'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: activeTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                      color: activeTab === tab ? '#fff' : '#64748b',
                      textTransform: 'capitalize'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>📊 Campaign Overview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Completion rate bar */}
                      {selectedCampaign.total_enrolled > 0 && (
                        <>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                              <span>Completion Rate</span>
                              <span>{Math.round((selectedCampaign.completed_count / selectedCampaign.total_enrolled) * 100)}%</span>
                            </div>
                            <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(selectedCampaign.completed_count / selectedCampaign.total_enrolled) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 4, transition: 'width 0.5s' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                              <span>Message Delivery Rate</span>
                              <span>
                                {selectedCampaign.sent_deliveries + selectedCampaign.failed_deliveries > 0
                                  ? Math.round((selectedCampaign.sent_deliveries / (selectedCampaign.sent_deliveries + selectedCampaign.failed_deliveries)) * 100)
                                  : 0}%
                              </span>
                            </div>
                            <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${selectedCampaign.sent_deliveries + selectedCampaign.failed_deliveries > 0 ? (selectedCampaign.sent_deliveries / (selectedCampaign.sent_deliveries + selectedCampaign.failed_deliveries)) * 100 : 0}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 4 }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>ℹ️ How This Sequence Works</h4>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                      <p style={{ margin: '0 0 8px' }}>When a contact reaches the <strong style={{ color: '#60a5fa' }}>{selectedCampaign.campaign_name}</strong> node in the <strong style={{ color: '#60a5fa' }}>{selectedCampaign.flow_name}</strong> flow, they are automatically enrolled in this sequence campaign.</p>
                      <p style={{ margin: '0 0 8px' }}>🟢 <strong style={{ color: '#22c55e' }}>Within 24h</strong> of their last interaction — text or template messages are sent.</p>
                      <p style={{ margin: 0 }}>🔴 <strong style={{ color: '#f87171' }}>Outside 24h</strong> — only the fallback template is sent (WhatsApp policy).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Enrollments Tab ── */}
              {activeTab === 'enrollments' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Enrolled Contacts ({enrollments.length})</h4>
                  </div>
                  {enrollments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                      <Users size={32} color="#334155" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>No contacts enrolled yet</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>Contacts will appear here when they reach this sequence node in your flow</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {enrollments.map((enroll: any) => (
                        <div
                          key={enroll.id}
                          style={{
                            background: '#1e293b',
                            border: `1px solid ${selectedEnrollment?.id === enroll.id ? '#3b82f6' : '#334155'}`,
                            borderRadius: 10,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s',
                          }}
                          onClick={() => handleSelectEnrollment(enroll)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#334155,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                              {(enroll.contact_name || enroll.contact_wa_id || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{enroll.contact_name || enroll.contact_wa_id}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>+{enroll.contact_wa_id} · Enrolled {formatDate(enroll.enrolled_at)}</div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#a78bfa' }}>📤 {enroll.sent_count || 0} sent</span>
                                <span style={{ fontSize: 10, color: '#fbbf24' }}>⏳ {enroll.pending_count || 0} pending</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(enroll.status), background: statusBg(enroll.status), padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                              {enroll.status}
                            </span>
                            {enroll.status === 'active' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); cancelEnrollment(enroll.id); }}
                                title="Cancel Enrollment"
                                style={{ border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', padding: '5px', borderRadius: 6, display: 'flex' }}
                              >
                                <Pause size={12} />
                              </button>
                            )}
                            <ChevronRight size={14} color="#334155" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Deliveries Tab ── */}
              {activeTab === 'deliveries' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    {selectedEnrollment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                          Message Schedule — {selectedEnrollment.contact_name || selectedEnrollment.contact_wa_id}
                        </h4>
                        <span style={{ fontSize: 11, color: statusColor(selectedEnrollment.status), background: statusBg(selectedEnrollment.status), padding: '2px 8px', borderRadius: 10, fontWeight: 600, textTransform: 'capitalize' }}>
                          {selectedEnrollment.status}
                        </span>
                      </div>
                    ) : (
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Select an enrollment from the Enrollments tab to view its message schedule</h4>
                    )}
                  </div>
                  {deliveries.length === 0 && selectedEnrollment && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                      <Clock size={32} color="#334155" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 13 }}>No deliveries found for this enrollment</div>
                    </div>
                  )}
                  {deliveries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {deliveries.map((d: any, i: number) => (
                        <div
                          key={d.id}
                          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                                {i + 1}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>Step {i + 1}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>Node: {d.node_id}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                                {deliveryStatusIcon(d.status)}
                                <span style={{ fontSize: 11, fontWeight: 700, color: d.status === 'sent' ? '#22c55e' : d.status === 'failed' ? '#ef4444' : d.status === 'pending' ? '#fbbf24' : '#94a3b8', textTransform: 'capitalize' }}>
                                  {d.status}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: '#475569' }}>
                                {d.status === 'pending' ? `⏳ Scheduled: ${formatDate(d.scheduled_at)}` : d.status === 'sent' ? `✅ Sent: ${formatDate(d.sent_at)}` : `Scheduled: ${formatDate(d.scheduled_at)}`}
                              </div>
                              {d.error_message && (
                                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2, maxWidth: 240, textAlign: 'right' }}>⚠️ {d.error_message}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SequenceManager;
