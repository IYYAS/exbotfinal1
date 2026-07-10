import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { whatsappAPI } from '../api';
import {
  ArrowLeft,
  Save,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  MapPin,
  HelpCircle,
  Database,
  Grid,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit3,
  UploadCloud,
  Link2,
  Bot,
  RefreshCw,
  Clock,
  ExternalLink,
  MousePointerClick,
  GitBranch,
  Filter,
  Users,
  Tag,
  Hash,
  Type,
  Ruler
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface FlowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  data: Record<string, any>;
}

interface FlowConnection {
  id: string;
  sourceId: string;
  sourceOutput: string;
  targetId: string;
}

interface ChatbotFlow {
  id: number;
  uid: string;
  name: string;
  label?: string;
  is_active: boolean;
  flow_data: {
    nodes?: FlowNode[];
    connections?: FlowConnection[];
  };
  created_at: string;
  updated_at: string;
}

// ─── Block Definition ────────────────────────────────────────────────────────
interface SidebarBlock {
  type: string;
  name: string;
  icon: React.ReactNode;
  category: 'MESSAGES' | 'DATA COLLECTION' | 'INTERACTIVE' | 'SEQUENCES' | 'LOGIC';
  defaultData: Record<string, any>;
}

const SIDEBAR_BLOCKS: SidebarBlock[] = [
  // MESSAGES
  { type: 'text', name: 'Text', icon: <MessageSquare size={16} />, category: 'MESSAGES', defaultData: { text: 'Hello! Welcome to our store.' } },
  { type: 'image', name: 'Image', icon: <ImageIcon size={16} />, category: 'MESSAGES', defaultData: { url: '', caption: '' } },
  { type: 'audio', name: 'Audio', icon: <Music size={16} />, category: 'MESSAGES', defaultData: { url: '' } },
  { type: 'video', name: 'Video', icon: <Video size={16} />, category: 'MESSAGES', defaultData: { url: '', caption: '' } },
  { type: 'file', name: 'File', icon: <FileText size={16} />, category: 'MESSAGES', defaultData: { url: '', filename: '' } },
  { type: 'location', name: 'Location', icon: <MapPin size={16} />, category: 'MESSAGES', defaultData: { latitude: '12.9716', longitude: '77.5946', name: 'Bengaluru Office', address: 'Bangalore, India' } },

  // DATA COLLECTION
  { type: 'user_input', name: 'User Input Flow', icon: <Database size={16} />, category: 'DATA COLLECTION', defaultData: { question: 'Please enter your email:', variable: 'user_email' } },
  { type: 'whatsapp_flow', name: 'Whatsapp Flows', icon: <Grid size={16} />, category: 'DATA COLLECTION', defaultData: { flow_id: '', screen: 'SIGNUP' } },

  // INTERACTIVE
  { type: 'button', name: 'Quick Reply Button', icon: <MousePointerClick size={16} />, category: 'INTERACTIVE', defaultData: { buttonText: 'Button Text', text: 'Send Message' } },
  { type: 'interactive_msg', name: 'Interactive Message', icon: <MessageSquare size={16} />, category: 'INTERACTIVE', defaultData: { text: 'Choose an option:', interactive_type: 'button', header_type: 'none', header_image_url: '', header_image_id: '', footer_text: '', button_text: 'Visit Website', button_url: '', flow_id: '' } },
  { type: 'list_message', name: 'List Message', icon: <Grid size={16} />, category: 'INTERACTIVE', defaultData: { buttonText: 'View Options' } },
  { type: 'section', name: 'Section', icon: <Grid size={16} />, category: 'INTERACTIVE', defaultData: { title: 'Category 1' } },
  { type: 'row', name: 'Row', icon: <Grid size={16} />, category: 'INTERACTIVE', defaultData: { title: 'Option 1', description: '' } },
  { type: 'template_msg', name: 'Template Message', icon: <FileText size={16} />, category: 'INTERACTIVE', defaultData: { template_name: '', language: 'en_US' } },
  { type: 'cta_button', name: 'CTA URL Button', icon: <HelpCircle size={16} />, category: 'INTERACTIVE', defaultData: { text: 'Visit Website', url: 'https://exapi.in' } },

  // SEQUENCES
  { type: 'new_sequence_campaign', name: 'Subscribe to Sequence', icon: <Clock size={16} />, category: 'SEQUENCES', defaultData: { sequence_name: '' } },
  { type: 'send_message_after', name: 'Send Message After', icon: <RefreshCw size={16} />, category: 'SEQUENCES', defaultData: { seq_message_type: 'regular', seq_schedule: '5 mins' } },

  // LOGIC
  { type: 'condition', name: 'Condition', icon: <GitBranch size={16} />, category: 'LOGIC', defaultData: { match_type: 'all', system_conditions: [], custom_conditions: [] } },
  { type: 'label_assign', name: 'Label Assign', icon: <Tag size={16} />, category: 'LOGIC', defaultData: { assign_label: '' } },
  { type: 'random_number', name: 'Random Number Generator', icon: <Hash size={16} />, category: 'LOGIC', defaultData: { use_numbers: true, use_upper: false, use_lower: false, use_special: false, length: 5, custom_field: '' } },
];

const INTERACTIVE_SEND_TYPES = [
  { value: 'button', label: 'Reply Buttons' },
  { value: 'list', label: 'List Messages' },
  { value: 'cta_url', label: 'CTA URL Button' },
  { value: 'flow', label: 'Flow Message' }
];

const FbCustomSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select'
}: {
  options: { label: string; value: string }[],
  value: string,
  onChange: (val: string) => void,
  placeholder?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--fb-bg-card)',
          border: '1px solid var(--fb-border-card)',
          borderRadius: 8,
          color: value ? 'var(--fb-text-primary)' : 'var(--fb-text-secondary)',
          fontSize: 13,
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--fb-bg-card)',
          border: '1px solid var(--fb-border-card)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 100,
          maxHeight: 250,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--fb-bg-main)',
                border: '1px solid var(--fb-border-main)',
                borderRadius: 4,
                color: 'var(--fb-text-primary)',
                fontSize: 12,
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  color: opt.value === value ? '#3b82f6' : 'var(--fb-text-primary)',
                  background: opt.value === value ? 'rgba(59,130,246,0.1)' : 'transparent',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (opt.value !== value) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
              </div>
            )) : (
              <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--fb-text-secondary)', textAlign: 'center' }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FbDeliveryOptions = ({ selectedNode, setNodes }: { selectedNode: any, setNodes: any }) => {
  const [expanded, setExpanded] = useState(false);
  const h = selectedNode.data.delay_hours || 0;
  const m = selectedNode.data.delay_minutes || 0;
  const s = selectedNode.data.delay_seconds || 0;
  
  const update = (key: string, val: number) => {
    setNodes((prev: any[]) => prev.map((n: any) => n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: val } } : n));
  };
  
  const totalSecs = h * 3600 + m * 60 + s;
  let delayText = `${totalSecs} seconds`;
  if (totalSecs >= 3600) delayText = `${h}h ${m}m ${s}s`;
  else if (totalSecs >= 60) delayText = `${m}m ${s}s`;

  return (
    <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20 }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><Clock size={16} /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Delivery Options</h3>
              <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Typing indicator and reply delay settings.</p>
          </div>
        </div>
        <span style={{ color: 'var(--fb-text-secondary)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: 'var(--fb-bg-main)', border: '1px solid var(--fb-border-main)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Smart Delay in Reply</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Wait before sending the next message</p>
            </div>
            <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--fb-text-primary)' }}>
              {delayText}
            </div>
          </div>
          
          {[
            { label: 'Hours', key: 'delay_hours', val: h, max: 24 },
            { label: 'Minutes', key: 'delay_minutes', val: m, max: 59 },
            { label: 'Seconds', key: 'delay_seconds', val: s, max: 59 }
          ].map(item => (
            <div key={item.label} style={{ border: '1px solid var(--fb-border-main)', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fb-text-secondary)', fontSize: 12 }}><Clock size={14} /> {item.label}</div>
                <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 14 }}>{item.val}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={item.max} 
                value={item.val} 
                onChange={(e) => update(item.key, parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', height: 6, cursor: 'pointer' }} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FlowBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Flow States
  const [flow, setFlow] = useState<ChatbotFlow | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [systemFields, setSystemFields] = useState<{ label: string, value: string }[]>([]);
  const [customFields, setCustomFields] = useState<{ label: string, value: string }[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ id: string, name: string }[]>([]);
  const [flowLabel, setFlowLabel] = useState<string>('');
  const [flowName, setFlowName] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(420);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [showCreateTemplateDropdown, setShowCreateTemplateDropdown] = useState(false);
  // ─── Inline Template Create Modal ─────────────────────────────────────────
  const [showTplModal, setShowTplModal] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('MARKETING');
  const [tplLanguage, setTplLanguage] = useState('en_US');
  const [tplHeaderType, setTplHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [tplHeaderText, setTplHeaderText] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplFooter, setTplFooter] = useState('');
  const [tplButtons, setTplButtons] = useState<any[]>([]);
  const [tplBtnType, setTplBtnType] = useState<'NONE' | 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'>('NONE');
  const [tplBtnText, setTplBtnText] = useState('');
  const [tplBtnUrl, setTplBtnUrl] = useState('');
  const [tplCreating, setTplCreating] = useState(false);

  // Canvas interaction states
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; output: string } | null>(null);

  // Media upload state
  const [uploadingNodeId, setUploadingNodeId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetNodeId = useRef<string | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle file upload for media nodes
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const nodeId = uploadTargetNodeId.current;
    if (!file || !nodeId) return;
    // Reset the input so same file can be re-selected
    e.target.value = '';
    setUploadingNodeId(nodeId);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await whatsappAPI.uploadMedia(formData);
      const localUrl = res.data?.local_url || '';

      // If nodeId ends in '_header', we're uploading a header file for an interactive or template node
      if (nodeId.endsWith('_header')) {
        const realNodeId = nodeId.replace('_header', '');
        const targetNode = nodes.find(n => n.id === realNodeId);
        if (targetNode?.type === 'template_msg') {
          setNodes(prev => prev.map(n => n.id === realNodeId ? { ...n, data: { ...n.data, header_media_url: localUrl, header_media_id: '' } } : n));
        } else {
          setNodes(prev => prev.map(n => n.id === realNodeId ? { ...n, data: { ...n.data, header_image_url: localUrl, header_image_id: '' } } : n));
        }
      } else {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, url: localUrl, media_id: '' } } : n));
      }
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploadingNodeId(null);
    }
  };

  const triggerFileUpload = (nodeId: string) => {
    uploadTargetNodeId.current = nodeId;
    fileInputRef.current?.click();
  };

  // Escape key cancels connecting mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConnectingFrom(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Templates, Sequences, and Fields
  const fetchTemplatesAndSequences = async () => {
    try {
      const tplRes = await whatsappAPI.fetchTemplates();
      setTemplates(tplRes.data);
      const seqRes = await whatsappAPI.fetchSequences();
      setSequences(seqRes.data);

      const sysFieldsRes = await whatsappAPI.fetchSystemFields();
      setSystemFields(sysFieldsRes.data);

      const custFieldsRes = await whatsappAPI.fetchCustomFields();
      setCustomFields(custFieldsRes.data.map((cf: any) => ({
        label: cf.name,
        value: cf.field_key
      })));

      const labelsRes = await whatsappAPI.fetchLabels();
      setAvailableLabels(labelsRes.data);
    } catch (err) {
      console.error('Failed to load initial data', err);
    }
  };

  useEffect(() => {
    fetchTemplatesAndSequences();
  }, []);

  // Load Flow
  useEffect(() => {
    const loadFlow = async () => {
      if (!id) return;
      try {
        const res = await whatsappAPI.getFlow(parseInt(id));
        setFlow(res.data);
        setFlowName(res.data.name || '');
        setFlowLabel(res.data.label || '');

        const data = res.data.flow_data || {};

        // 1. Parse Nodes compatibility (Array or Object)
        let parsedNodes: FlowNode[] = [];
        if (data.nodes) {
          const rawNodesList = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);

          // Calculate bounding box and minimum coordinates to check for negative offset
          let minX = Infinity;
          let minY = Infinity;
          rawNodesList.forEach((n: any) => {
            const px = typeof n.x === 'number' ? n.x : (Array.isArray(n.position) ? n.position[0] : 100);
            const py = typeof n.y === 'number' ? n.y : (Array.isArray(n.position) ? n.position[1] : 100);
            if (px < minX) minX = px;
            if (py < minY) minY = py;
          });

          // Offset to shift nodes into viewable area if they are negative
          const offsetX = minX < 50 ? (100 - minX) : 0;
          const offsetY = minY < 50 ? (100 - minY) : 0;

          parsedNodes = rawNodesList.map((n: any) => {
            // Map types from legacy Trigger/Message Node formats if present
            let mappedType = n.type || 'text';
            if (mappedType === 'Trigger Node') mappedType = 'start_flow';
            else if (mappedType === 'Message Node') mappedType = 'interactive_msg';
            else if (mappedType === 'Button Node') mappedType = 'button';
            else if (typeof mappedType === 'string' && mappedType.endsWith(' Node')) {
              mappedType = mappedType.replace(' Node', '').toLowerCase();
            }

            const rawX = typeof n.x === 'number' ? n.x : (Array.isArray(n.position) ? n.position[0] : 100);
            const rawY = typeof n.y === 'number' ? n.y : (Array.isArray(n.position) ? n.position[1] : 100);

            const parsedData: any = {
              ...n.data,
              // normalize text, triggers, urls back to form schema
              text: n.data?.text || n.data?.textMessage || '',
              trigger_keywords: n.data?.trigger_keywords || n.data?.triggerKeyword || '',
              match_type: n.data?.match_type || (n.data?.triggerMatchingType === 'exact' ? 'Exact keyword match' : 'Exact keyword match'),
              url: n.data?.url || n.data?.file || '',
              buttonText: n.data?.buttonText || ''
            };
            return {
              id: String(n.id),
              type: mappedType,
              name: n.name || '',
              x: rawX + offsetX,
              y: rawY + offsetY,
              data: parsedData
            };
          });
        }

        // 2. Parse Connections compatibility
        let parsedConnections: FlowConnection[] = [];
        if (data.connections && Array.isArray(data.connections)) {
          parsedConnections = data.connections;
        } else if (data.nodes) {
          const rawNodesList = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);
          rawNodesList.forEach((n: any) => {
            if (n.outputs) {
              Object.entries(n.outputs).forEach(([outputKey, outVal]: [string, any]) => {
                if (outVal && Array.isArray(outVal.connections)) {
                  outVal.connections.forEach((conn: any, idx: number) => {
                    parsedConnections.push({
                      id: `conn_${n.id}_${outputKey}_${conn.node}_${idx}`,
                      sourceId: String(n.id),
                      sourceOutput: outputKey === 'referenceOutput'
                        ? 'next'
                        : (outputKey === 'buttonOutput' ? 'next' : outputKey),
                      targetId: String(conn.node)
                    });
                  });
                }
              });
            }
          });
        }

        if (parsedNodes.length === 0) {
          const startNode: FlowNode = {
            id: 'start',
            type: 'start_flow',
            name: 'Start Bot Flow',
            x: 100,
            y: 200,
            data: { trigger_keywords: 'hello, hi, start', match_type: 'Exact keyword match' }
          };
          setNodes([startNode]);
        } else {
          setNodes(parsedNodes);
        }
        setConnections(parsedConnections);
      } catch (err) {
        console.error(err);
        setMessage({ text: 'Failed to load flow details.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadFlow();
  }, [id]);

  // Handle Dragging Node on Canvas
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    setDraggedNodeId(nodeId);
    setDragStart({
      x: e.clientX - node.x,
      y: e.clientY - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const newX = Math.max(10, e.clientX - dragStart.x);
      const newY = Math.max(10, e.clientY - dragStart.y);
      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n));
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Add block to canvas
  const addBlockToCanvas = (block: SidebarBlock) => {
    const idStr = `node_${Date.now()}`;
    const newNode: FlowNode = {
      id: idStr,
      type: block.type,
      name: block.name,
      x: 350 + (nodes.length % 3) * 30,
      y: 150 + (nodes.length % 3) * 30,
      data: { ...block.defaultData }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(idStr);
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    if (nodeId === 'start') return; // Cannot delete start node
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Connect flow nodes
  const startConnection = (e: React.MouseEvent, nodeId: string, output: string) => {
    e.stopPropagation();
    setConnectingFrom({ nodeId, output });
  };

  const completeConnection = (targetId: string) => {
    if (!connectingFrom) return;
    if (connectingFrom.nodeId === targetId) {
      setConnectingFrom(null);
      return;
    }

    // Check if duplicate connection exists
    const duplicate = connections.find(
      c => c.sourceId === connectingFrom.nodeId &&
        c.sourceOutput === connectingFrom.output &&
        c.targetId === targetId
    );

    if (!duplicate) {
      const newConn: FlowConnection = {
        id: `conn_${Date.now()}`,
        sourceId: connectingFrom.nodeId,
        sourceOutput: connectingFrom.output,
        targetId
      };
      setConnections(prev => [...prev, newConn]);
    }
    setConnectingFrom(null);
  };

  const hasOutputConnection = (nodeId: string, output: string) => {
    return connections.some(c => c.sourceId === nodeId && c.sourceOutput === output);
  };

  const deleteConnection = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  // Save flow
  const handleSave = async () => {
    if (!id || !flow) return;
    setSaving(true);
    setMessage(null);
    try {
      // 1. Build the nodes dictionary matching backend expectations
      const nodesDict: Record<string, any> = {};
      nodes.forEach(node => {
        // Find outgoing connections for this node
        const nodeConns = connections.filter(c => c.sourceId === node.id);

        // Reconstruct outputs structure
        const outputs: Record<string, any> = {};

        if (node.type === 'interactive_msg') {
          // Interactive has potential output connections: next, interactiveOutputButton, interactiveOutputList
          const nextConns = nodeConns.filter(c => c.sourceOutput === 'next');
          const buttonConns = nodeConns.filter(c => c.sourceOutput === 'interactiveOutputButton');
          const listConns = nodeConns.filter(c => c.sourceOutput === 'interactiveOutputList');

          if (nextConns.length > 0) {
            const inputKey = nextConns.map(c => {
              const dest = nodes.find(n => n.id === c.targetId);
              if (dest) {
                if (dest.type === 'image') return 'imageInput';
                if (dest.type === 'interactive_msg') return 'interactiveInput';
                if (dest.type === 'text') return 'textInput';
              }
              return 'input';
            })[0] || 'input';
            outputs.next = {
              connections: nextConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: inputKey
              }))
            };
          }

          if (buttonConns.length > 0) {
            outputs.interactiveOutputButton = {
              connections: buttonConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: 'buttonInput'
              }))
            };
          }

          if (listConns.length > 0) {
            outputs.interactiveOutputList = {
              connections: listConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: 'listInput'
              }))
            };
          }
        } else if (node.type === 'list_message') {
          const sectionConns = nodeConns.filter(c => c.sourceOutput === 'sections');
          if (sectionConns.length > 0) {
            outputs.sections = {
              connections: sectionConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: 'sectionInput'
              }))
            };
          }
        } else if (node.type === 'section') {
          const rowConns = nodeConns.filter(c => c.sourceOutput === 'rows');
          if (rowConns.length > 0) {
            outputs.rows = {
              connections: rowConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: 'rowInput'
              }))
            };
          }
        } else if (node.type === 'row') {
          const nextConns = nodeConns.filter(c => c.sourceOutput === 'next');
          if (nextConns.length > 0) {
            outputs.next = {
              connections: nextConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: 'input'
              }))
            };
          }
        } else if (node.type === 'button') {
          // Button node output connects to content nodes
          const buttonConns = nodeConns.filter(c => c.sourceOutput === 'next');
          if (buttonConns.length > 0) {
            const inputKey = buttonConns.map(c => {
              const dest = nodes.find(n => n.id === c.targetId);
              if (dest) {
                if (dest.type === 'image') return 'imageInput';
                if (dest.type === 'interactive_msg') return 'interactiveInput';
                if (dest.type === 'text') return 'textInput';
                if (dest.type === 'button') return 'buttonInput';
              }
              return 'input';
            })[0] || 'input';
            outputs.buttonOutput = {
              connections: buttonConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: inputKey
              }))
            };
          }
        } else if (node.type === 'condition') {
          const trueConns = nodeConns.filter(c => c.sourceOutput === 'true');
          const falseConns = nodeConns.filter(c => c.sourceOutput === 'false');

          if (trueConns.length > 0) {
            const inputKey = trueConns.map(c => {
              const dest = nodes.find(n => n.id === c.targetId);
              if (dest) {
                if (dest.type === 'image') return 'imageInput';
                if (dest.type === 'interactive_msg') return 'interactiveInput';
                if (dest.type === 'text') return 'textInput';
                if (dest.type === 'button') return 'buttonInput';
              }
              return 'input';
            })[0] || 'input';
            outputs['true'] = {
              connections: trueConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: inputKey
              }))
            };
          }
          if (falseConns.length > 0) {
            const inputKey = falseConns.map(c => {
              const dest = nodes.find(n => n.id === c.targetId);
              if (dest) {
                if (dest.type === 'image') return 'imageInput';
                if (dest.type === 'interactive_msg') return 'interactiveInput';
                if (dest.type === 'text') return 'textInput';
                if (dest.type === 'button') return 'buttonInput';
              }
              return 'input';
            })[0] || 'input';
            outputs['false'] = {
              connections: falseConns.map(c => ({
                node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
                input: inputKey
              }))
            };
          }
        } else if (nodeConns.length > 0) {
          // Standard next output
          const outputKey = node.type === 'start_flow' ? 'referenceOutput' : 'next';
          const inputKey = nodeConns.map(c => {
            const dest = nodes.find(n => n.id === c.targetId);
            if (dest) {
              if (dest.type === 'image') return 'imageInput';
              if (dest.type === 'interactive_msg') return 'interactiveInput';
              if (dest.type === 'text') return 'textInput';
              if (dest.type === 'button') return 'buttonInput';
            }
            return 'input';
          })[0] || 'input';

          outputs[outputKey] = {
            connections: nodeConns.map(c => ({
              node: isNaN(Number(c.targetId)) ? c.targetId : Number(c.targetId),
              input: inputKey
            }))
          };
        }

        // Find incoming connections for this node
        const incomingConns = connections.filter(c => c.targetId === node.id);
        const inputs: Record<string, any> = {};
        if (incomingConns.length > 0) {
          const firstConn = incomingConns[0];
          const src = nodes.find(n => n.id === firstConn.sourceId);
          if (src) {
            let inputKey = 'input';
            if (node.type === 'image') inputKey = 'imageInput';
            else if (node.type === 'interactive_msg') inputKey = 'interactiveInput';
            else if (node.type === 'text') inputKey = 'textInput';
            else if (node.type === 'button') inputKey = 'buttonInput';

            inputs[inputKey] = {
              connections: incomingConns.map(c => ({
                node: isNaN(Number(c.sourceId)) ? c.sourceId : Number(c.sourceId),
                output: c.sourceOutput === 'next'
                  ? (src.type === 'start_flow' ? 'referenceOutput' : (src.type === 'button' ? 'buttonOutput' : 'next'))
                  : c.sourceOutput
              }))
            };
          }
        }

        const outgoingData: any = {
          ...node.data,
          // mapping keys back
          title: node.data.trigger_keywords || node.data.title || '',
          triggerKeyword: node.data.trigger_keywords || node.data.triggerKeyword || '',
          triggerMatchingType: node.data.match_type === 'Exact keyword match' ? 'exact' : (node.data.match_type || 'exact'),
          headerText: node.data.headerText || node.data.header_text || '',
          textMessage: node.data.text || '',
          file: node.data.url || node.data.file || '',
          buttonText: node.data.buttonText || ''
        };
        nodesDict[node.id] = {
          id: isNaN(Number(node.id)) ? node.id : Number(node.id),
          name: node.name,
          type: node.type === 'start_flow' ? 'Trigger Node' : (node.type === 'interactive_msg' ? 'Message Node' : (node.type === 'button' ? 'Button Node' : `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node`)),
          data: outgoingData,
          position: [node.x, node.y],
          inputs: inputs,
          outputs: outputs
        };
      });

      const updatedData = {
        ...flow,
        name: flowName,
        label: flowLabel,
        flow_data: {
          id: (flow.flow_data as any)?.id || "xitFB@0.0.1",
          nodes: nodesDict
        }
      };

      await whatsappAPI.updateFlow(parseInt(id), updatedData);
      setMessage({ text: 'Flow builder saved successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: 'Failed to save flow configuration.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Render SVG Lines for Connections
  const renderConnections = () => {
    return connections.map(conn => {
      const srcNode = nodes.find(n => n.id === conn.sourceId);
      const destNode = nodes.find(n => n.id === conn.targetId);

      if (!srcNode || !destNode) return null;

      // Output point coordinate approximation
      const isStartNode = srcNode.type === 'start_flow';
      let x1 = srcNode.x + 280; // Node card width is 280px
      let y1 = srcNode.y + 40;

      if (isStartNode) {
        y1 = srcNode.y + 60;
      } else if (srcNode.type === 'interactive_msg') {
        if (conn.sourceOutput === 'next') {
          y1 = srcNode.y + 75; // Next port position
        } else if (conn.sourceOutput === 'interactiveOutputButton') {
          y1 = srcNode.y + 115; // Buttons port position
        } else {
          y1 = srcNode.y + 155;
        }
      } else if (srcNode.type === 'button') {
        y1 = srcNode.y + 75; // Next/buttonOutput port position
      } else {
        y1 = srcNode.y + 75;
      }

      // Input point coordinate approximation (Left middle of dest node card)
      const x2 = destNode.x;
      let y2 = destNode.y + 40;

      if (destNode.type === 'interactive_msg' || destNode.type === 'button') {
        y2 = destNode.y + 75;
      }

      // Beautiful Bezier Curve paths
      const controlX = x1 + Math.abs(x2 - x1) * 0.5;
      const pathData = `M ${x1} ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, ${x2} ${y2}`;

      return (
        <g key={conn.id}>
          {/* Main curve */}
          <path
            d={pathData}
            fill="none"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth="3"
            style={{ transition: 'stroke 0.2s' }}
          />
          {/* Interaction wrapper/hover helper */}
          <path
            d={pathData}
            fill="none"
            stroke="transparent"
            strokeWidth="10"
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
          >
            <title>Click connection to delete</title>
          </path>
          {/* Connector circle marker */}
          <circle cx={x2} cy={y2} r="4" fill="#3b82f6" />
        </g>
      );
    });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <Bot size={48} style={{ animation: 'spin 1.5s linear infinite', color: '#3b82f6', marginBottom: 16 }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading Canvas Editor...</span>
        <style>{`
          @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }
          @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px rgba(16,185,129,0.4)} 50%{box-shadow:0 0 20px rgba(16,185,129,0.8)} }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className={isDarkMode ? '' : 'light-theme'} style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, overflow: 'hidden', background: 'var(--fb-bg-sidebar)', zIndex: 1000 }}>
        {/* Hidden file input for media uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        {/* Animations */}
        <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px rgba(16,185,129,0.3)} 50%{box-shadow:0 0 22px rgba(16,185,129,0.8)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:translateX(-50%) scale(1)} 50%{opacity:0.9;transform:translateX(-50%) scale(1.02)} }
      `}</style>
        {/* Header Panel */}
        <header style={{ height: 60, borderBottom: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-card)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate('/bot-reply')} style={{ border: 'none', background: 'var(--fb-bg-card-header)', width: 34, height: 34, borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Enter flow name..."
                  title="Click to edit flow name"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--fb-text-primary)',
                    background: 'transparent',
                    border: '1px dashed transparent',
                    borderBottom: '1px dashed var(--fb-border-card)',
                    padding: '2px 4px',
                    margin: 0,
                    outline: 'none',
                    width: Math.max(150, (flowName.length + 1) * 9),
                    transition: 'border 0.2s',
                    cursor: 'text'
                  }}
                  onFocus={(e) => (e.target.style.border = '1px dashed var(--fb-text-secondary)')}
                  onBlur={(e) => (e.target.style.border = '1px dashed transparent', e.target.style.borderBottom = '1px dashed var(--fb-border-card)')}
                />
                <Edit3 size={14} color="var(--fb-text-secondary)" style={{ marginLeft: 4, cursor: 'pointer' }} />
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--fb-text-secondary)', marginLeft: 8 }}>/ Visual Flow Builder</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Audience Label:</span>
                <input
                  value={flowLabel}
                  onChange={(e) => setFlowLabel(e.target.value)}
                  placeholder="Optional flow label"
                  style={{
                    background: 'var(--fb-bg-sidebar)',
                    border: '1px solid var(--fb-border-card)',
                    borderRadius: 8,
                    color: 'var(--fb-text-primary)',
                    padding: '6px 10px',
                    fontSize: 12,
                    width: 220
                  }}
                />
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  style={{ marginLeft: 16, background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: '6px 12px', color: 'var(--fb-text-primary)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            </div>
          </div>

          {/* Message notification */}
          {message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: message.type === 'success' ? '#064e3b' : '#7f1d1d', border: `1px solid ${message.type === 'success' ? '#059669' : '#dc2626'}`, color: 'var(--fb-text-primary)', padding: '6px 16px', borderRadius: 8, fontSize: 13 }}>
              {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            {saving ? 'Saving...' : 'Save Flow'}
            <Save size={16} />
          </button>
        </header>

        {/* Main workspace */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>

          {/* Left Side toolbar */}
          <aside style={{ width: 260, borderRight: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-sidebar)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: 13, color: 'var(--fb-text-secondary)', fontWeight: 700, padding: '20px 20px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Flow blocks
            </h2>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
              {(['MESSAGES', 'DATA COLLECTION', 'INTERACTIVE', 'SEQUENCES', 'LOGIC'] as const).map(cat => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 8, letterSpacing: '0.02em' }}>{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SIDEBAR_BLOCKS.filter(b => b.category === cat).map(block => (
                      <button
                        key={block.type}
                        onClick={() => addBlockToCanvas(block)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: 'var(--fb-bg-card)',
                          border: '1px solid var(--fb-border-card)',
                          borderRadius: 8,
                          color: 'var(--fb-text-tertiary)',
                          cursor: 'pointer',
                          fontSize: 13,
                          textAlign: 'left',
                          transition: 'background 0.2s, color 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--fb-bg-card-header)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'var(--fb-bg-card)'; e.currentTarget.style.color = 'var(--fb-text-tertiary)'; }}
                      >
                        <span style={{ display: 'flex', color: '#60a5fa' }}>{block.icon}</span>
                        {block.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Canvas Area */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              background: 'var(--fb-bg-main)',
              backgroundImage: 'var(--fb-canvas-dots)',
              backgroundSize: '20px 20px',
              userSelect: 'none',
            }}
          >
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => { setSelectedNodeId(null); setConnectingFrom(null); }}
              style={{ position: 'relative', width: 3000, height: 2000 }}
            >
              {/* Connecting mode banner */}
              {connectingFrom && (
                <div style={{
                  position: 'fixed',
                  top: 70,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: 30,
                  fontSize: 13,
                  fontWeight: 700,
                  zIndex: 9999,
                  boxShadow: '0 4px 20px rgba(16,185,129,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  letterSpacing: '0.01em',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}>
                  <span style={{ fontSize: 18 }}>🔗</span>
                  Now click the <strong>← Input</strong> zone on any target node to connect — or press <kbd style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>Esc</kbd> to cancel
                </div>
              )}

              {/* Connector Wires rendering */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                {renderConnections()}
              </svg>

              {/* Node Cards */}
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const isStart = node.type === 'start_flow';

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: 280,
                      background: 'var(--fb-bg-card)',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
                      borderRadius: 12,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      cursor: 'move',
                      zIndex: isSelected ? 4 : 2,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {/* Node Header */}
                    <div style={{
                      padding: '10px 14px',
                      background: isStart ? 'rgba(59,130,246,0.15)' : 'var(--fb-bg-card-header)',
                      borderBottom: '1px solid #475569',
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bot size={14} color={isStart ? '#60a5fa' : 'var(--fb-text-secondary)'} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{node.name}</span>
                      </div>
                      {!isStart && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Node Content / Summary */}
                    <div style={{ padding: 14, fontSize: 12, color: 'var(--fb-text-tertiary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {isStart && (
                        <>
                          <div style={{ color: 'var(--fb-text-secondary)' }}>Keywords: <strong style={{ color: '#fff' }}>{node.data.trigger_keywords || 'None'}</strong></div>
                          <div style={{ color: 'var(--fb-text-secondary)' }}>Match: <span style={{ color: '#38bdf8' }}>{node.data.match_type}</span></div>
                          {node.data.add_labels && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              <span style={{ color: 'var(--fb-text-secondary)' }}>Labels:</span>
                              {String(node.data.add_labels).split(',').map((label: string, idx: number) => (
                                <span key={idx} style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(59,130,246,0.16)', color: '#bfdbfe', fontSize: 11 }}>
                                  {label.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          {node.data.subscribe_sequence && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(96,165,250,0.16)', color: '#bfdbfe', fontSize: 11, fontWeight: 600 }}>
                                Subscribe: {node.data.subscribe_sequence}
                              </span>
                            </div>
                          )}
                          {node.data.unsubscribe_sequence && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(248,113,113,0.16)', color: '#fecaca', fontSize: 11, fontWeight: 600 }}>
                                Unsubscribe: {node.data.unsubscribe_sequence}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {node.type === 'text' && <div style={{ color: 'var(--fb-text-tertiary)', fontStyle: 'italic' }}>"{node.data.text}"</div>}
                      {node.type === 'image' && (() => {
                        let previewUrl = node.data.url;
                        if (previewUrl && previewUrl.includes('ngrok-free.dev')) {
                          try {
                            const urlObj = new URL(previewUrl);
                            previewUrl = `http://localhost:8000${urlObj.pathname}`;
                          } catch (e) { }
                        }
                        return (
                          <div style={{ color: 'var(--fb-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {previewUrl ? (
                              <img src={previewUrl} alt="attachment" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : null}
                            <div>🖼️ Image Attachment: <span style={{ color: 'var(--fb-text-secondary)' }}>{node.data.caption || 'No Caption'}</span></div>
                          </div>
                        );
                      })()}
                      {node.type === 'audio' && (() => {
                        let previewUrl = node.data.url;
                        if (previewUrl && previewUrl.includes('ngrok-free.dev')) {
                          try {
                            const urlObj = new URL(previewUrl);
                            previewUrl = `http://localhost:8000${urlObj.pathname}`;
                          } catch (e) { }
                        }
                        return (
                          <div style={{ color: 'var(--fb-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {previewUrl ? (
                              <audio controls src={previewUrl} style={{ width: '100%', maxHeight: '40px', borderRadius: '4px' }} />
                            ) : null}
                            <div>🎵 Audio Attachment: <span style={{ color: 'var(--fb-text-secondary)' }}>{node.data.url ? 'Attached' : 'None'}</span></div>
                          </div>
                        );
                      })()}
                      {node.type === 'video' && (() => {
                        let previewUrl = node.data.url;
                        if (previewUrl && previewUrl.includes('ngrok-free.dev')) {
                          try {
                            const urlObj = new URL(previewUrl);
                            previewUrl = `http://localhost:8000${urlObj.pathname}`;
                          } catch (e) { }
                        }
                        return (
                          <div style={{ color: 'var(--fb-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {previewUrl ? (
                              <video controls src={previewUrl} style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : null}
                            <div>📹 Video Attachment: <span style={{ color: 'var(--fb-text-secondary)' }}>{node.data.url ? 'Attached' : 'None'}</span></div>
                          </div>
                        );
                      })()}
                      {node.type === 'file' && (() => {
                        let previewUrl = node.data.url;
                        if (previewUrl && previewUrl.includes('ngrok-free.dev')) {
                          try {
                            const urlObj = new URL(previewUrl);
                            previewUrl = `http://localhost:8000${urlObj.pathname}`;
                          } catch (e) { }
                        }
                        return (
                          <div style={{ color: 'var(--fb-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>📄 File Attachment:</div>
                            {previewUrl ? (
                              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '12px', wordBreak: 'break-all' }}>
                                {node.data.filename || node.data.caption || 'Download File'}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--fb-text-secondary)', fontSize: '12px' }}>{node.data.filename || 'None'}</span>
                            )}
                          </div>
                        );
                      })()}
                      {node.type === 'location' && <div style={{ color: 'var(--fb-text-tertiary)' }}>📍 Location: {node.data.name}</div>}
                      {node.type === 'user_input' && <div style={{ color: 'var(--fb-text-tertiary)' }}>📥 Question: "{node.data.question}" → Save as <code style={{ color: '#fbbf24', background: 'var(--fb-bg-card-header)', padding: '1px 4px', borderRadius: 4 }}>{node.data.variable}</code></div>}
                      {node.type === 'whatsapp_flow' && <div style={{ color: 'var(--fb-text-tertiary)' }}>⚙️ Interactive Form Flow</div>}
                      {node.type === 'interactive_msg' && (
                        <>
                          <div style={{ color: 'var(--fb-text-tertiary)', fontWeight: 600 }}>{node.data.text}</div>
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* 1. Reply / Input Port & Next Content Port */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div
                                onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                                  background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                                  border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                  color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)'
                                }}
                              >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                                Reply
                              </div>
                              <div
                                onClick={(e) => startConnection(e, node.id, 'next')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  cursor: 'crosshair',
                                  background: 'rgba(59,130,246,0.1)',
                                  border: '1px solid rgba(59,130,246,0.3)',
                                  color: '#60a5fa'
                                }}
                              >
                                Next
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                              </div>
                            </div>

                            {/* 2. Buttons Port */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <div
                                onClick={(e) => startConnection(e, node.id, 'interactiveOutputButton')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  cursor: 'crosshair',
                                  background: hasOutputConnection(node.id, 'interactiveOutputButton') ? 'rgba(16,185,129,0.14)' : 'rgba(59,130,246,0.1)',
                                  border: hasOutputConnection(node.id, 'interactiveOutputButton') ? '1px solid #10b981' : '1px solid rgba(59,130,246,0.3)',
                                  color: hasOutputConnection(node.id, 'interactiveOutputButton') ? '#10b981' : '#60a5fa'
                                }}
                              >
                                Buttons
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasOutputConnection(node.id, 'interactiveOutputButton') ? '#10b981' : '#3b82f6' }} />
                              </div>
                            </div>

                            {/* 3. List Messages Port */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <div
                                onClick={(e) => startConnection(e, node.id, 'interactiveOutputList')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  cursor: 'crosshair',
                                  background: hasOutputConnection(node.id, 'interactiveOutputList') ? 'rgba(16,185,129,0.14)' : 'rgba(59,130,246,0.1)',
                                  border: hasOutputConnection(node.id, 'interactiveOutputList') ? '1px solid #10b981' : '1px solid rgba(59,130,246,0.3)',
                                  color: hasOutputConnection(node.id, 'interactiveOutputList') ? '#10b981' : '#60a5fa'
                                }}
                              >
                                List Messages
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasOutputConnection(node.id, 'interactiveOutputList') ? '#10b981' : '#3b82f6' }} />
                              </div>
                            </div>

                            {/* 4. E-commerce Port */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <div style={{ fontSize: 10, color: 'var(--fb-text-secondary)', marginRight: 6 }}>E-commerce</div>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                            </div>
                          </div>
                        </>
                      )}
                      {node.type === 'button' && (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ color: 'var(--fb-text-tertiary)', fontSize: 11, background: 'var(--fb-bg-card-header)', padding: '6px 10px', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #475569' }}>
                              {node.data.buttonText || 'Button'}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                              <div
                                onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                  cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                                  background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                                  border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                  color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)'
                                }}
                              >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                                Reply
                              </div>
                              <div
                                onClick={(e) => startConnection(e, node.id, 'next')}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                  cursor: 'crosshair', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa'
                                }}
                              >
                                Next
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <div
                                onClick={(e) => startConnection(e, node.id, 'subscribe')}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                  cursor: 'crosshair', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa'
                                }}
                              >
                                Subscribe to Sequence
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {node.type === 'list_message' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ color: 'var(--fb-text-tertiary)', fontSize: 11, background: 'var(--fb-bg-card-header)', padding: '6px 10px', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #475569' }}>
                            {node.data.buttonText || 'View Options'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <div
                              onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                                background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                                border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)'
                              }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                              Input
                            </div>
                            <div
                              onClick={(e) => startConnection(e, node.id, 'sections')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: 'crosshair', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa'
                              }}
                            >
                              Sections
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      {node.type === 'section' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ color: 'var(--fb-text-tertiary)', fontSize: 11, background: 'var(--fb-bg-card-header)', padding: '6px 10px', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #475569' }}>
                            {node.data.title || 'Section Title'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <div
                              onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                                background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                                border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)'
                              }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                              Input
                            </div>
                            <div
                              onClick={(e) => startConnection(e, node.id, 'rows')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: 'crosshair', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa'
                              }}
                            >
                              Rows
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      {node.type === 'row' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ color: 'var(--fb-text-tertiary)', fontSize: 11, background: 'var(--fb-bg-card-header)', padding: '6px 10px', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #475569' }}>
                            {node.data.title || 'Row Title'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <div
                              onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                                background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                                border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)'
                              }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                              Input
                            </div>
                            <div
                              onClick={(e) => startConnection(e, node.id, 'next')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 10,
                                cursor: 'crosshair',
                                background: hasOutputConnection(node.id, 'next') ? 'rgba(16,185,129,0.14)' : 'rgba(59,130,246,0.1)',
                                border: hasOutputConnection(node.id, 'next') ? '1px solid #10b981' : '1px solid rgba(59,130,246,0.3)',
                                color: hasOutputConnection(node.id, 'next') ? '#10b981' : '#60a5fa'
                              }}
                            >
                              Next
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasOutputConnection(node.id, 'next') ? '#10b981' : '#3b82f6' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      {node.type === 'template_msg' && <div style={{ color: 'var(--fb-text-tertiary)' }}>📄 Template name: {node.data.template_name}</div>}
                      {node.type === 'cta_button' && <div style={{ color: 'var(--fb-text-tertiary)' }}>🔗 Button: <strong style={{ color: '#60a5fa' }}>{node.data.text}</strong></div>}

                      {/* Condition node */}
                      {node.type === 'condition' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <GitBranch size={13} color="#a78bfa" />
                            <span style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Match: <strong style={{ color: 'var(--fb-text-primary)' }}>{node.data.match_type === 'any' ? 'Any Rule' : 'All Rules'}</strong></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <div onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default', background: connectingFrom && connectingFrom.nodeId !== node.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', border: connectingFrom && connectingFrom.nodeId !== node.id ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)', color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : 'var(--fb-text-tertiary)' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} /> Input
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div onClick={(e) => startConnection(e, node.id, 'true')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'crosshair', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}>
                                True <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                              </div>
                              <div onClick={(e) => startConnection(e, node.id, 'false')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'crosshair', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                                False <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sequence Campaign node */}
                      {node.type === 'new_sequence_campaign' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>📅</span>
                            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{node.data.sequence_name || 'Select Sequence'}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--fb-text-secondary)' }}>Subscribes user to the selected sequence.</p>
                        </div>
                      )}

                      {/* Label Assign node */}
                      {node.type === 'label_assign' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>🏷️</span>
                            <span style={{ color: '#a78bfa', fontWeight: 700 }}>{node.data.assign_label || 'Select Label'}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--fb-text-secondary)' }}>Assigns selected label to this contact.</p>
                        </div>
                      )}

                      {/* Random Number node */}
                      {node.type === 'random_number' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>🔢</span>
                            <span style={{ color: '#3b82f6', fontWeight: 700 }}>Length: {node.data.length || 5}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--fb-text-secondary)' }}>
                            {node.data.custom_field ? `Saves to: ${node.data.custom_field}` : 'Not saving to any field'}
                          </p>
                        </div>
                      )}

                      {/* Send Message After node */}
                      {node.type === 'send_message_after' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 20,
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            alignSelf: 'center'
                          }}>
                            <span style={{ color: '#60a5fa', fontSize: 14 }}>🕒</span>
                            <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>
                              {node.data.seq_schedule || '5 mins'} : Send Messages
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fb-text-secondary)', borderTop: '1px dashed #334155', paddingTop: 8, marginTop: 4 }}>
                            <span>Frequency</span>
                            <span>Compose and Schedule Message</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Connection Ports Row — excluded for nodes with custom port layouts */}
                    {node.type !== 'interactive_msg' && node.type !== 'button' && node.type !== 'list_message' && node.type !== 'section' && node.type !== 'row' && node.type !== 'condition' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', gap: 6 }}>
                        {/* INPUT PORT — left side, click when connecting */}
                        <div
                          onClick={(e) => { e.stopPropagation(); completeConnection(node.id); }}
                          title="Click here to connect from another node's output"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: connectingFrom && connectingFrom.nodeId !== node.id ? 'crosshair' : 'default',
                            background: connectingFrom && connectingFrom.nodeId !== node.id
                              ? 'rgba(16,185,129,0.2)'
                              : 'rgba(255,255,255,0.04)',
                            border: connectingFrom && connectingFrom.nodeId !== node.id
                              ? '1.5px solid #10b981'
                              : '1px solid rgba(255,255,255,0.08)',
                            color: connectingFrom && connectingFrom.nodeId !== node.id ? '#34d399' : '#64748b',
                            transition: 'all 0.2s',
                            boxShadow: connectingFrom && connectingFrom.nodeId !== node.id
                              ? '0 0 12px rgba(16,185,129,0.4)'
                              : 'none',
                            animation: connectingFrom && connectingFrom.nodeId !== node.id ? 'glowPulse 1s ease-in-out infinite' : 'none',
                          }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: connectingFrom && connectingFrom.nodeId !== node.id ? '#10b981' : '#475569', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                          ← Input
                        </div>

                        {/* OUTPUT PORT — right side, click to START a connection */}
                        <div
                          onClick={(e) => startConnection(e, node.id, 'next')}
                          title="Click to start a connection from this node"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'crosshair',
                            background: connectingFrom?.nodeId === node.id
                              ? 'rgba(59,130,246,0.3)'
                              : 'rgba(59,130,246,0.1)',
                            border: connectingFrom?.nodeId === node.id
                              ? '1.5px solid #60a5fa'
                              : '1px solid rgba(59,130,246,0.3)',
                            color: '#60a5fa',
                            transition: 'all 0.2s',
                            boxShadow: connectingFrom?.nodeId === node.id ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
                          }}
                        >
                          Output →
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', border: '2px solid rgba(255,255,255,0.5)', flexShrink: 0 }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side Settings Pane */}
          {selectedNode && (
            <aside style={{ width: sidebarWidth, position: 'relative', borderLeft: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-sidebar)', display: 'flex', flexDirection: 'column', padding: (selectedNode?.type === 'text' || selectedNode?.type === 'image' || selectedNode?.type === 'audio' || selectedNode?.type === 'video' || selectedNode?.type === 'file' || selectedNode?.type === 'location' || selectedNode?.type === 'whatsapp_flow' || selectedNode?.type === 'user_input' || selectedNode?.type === 'interactive_msg' || selectedNode?.type === 'template_msg' || selectedNode?.type === 'cta_button' || selectedNode?.type === 'condition') ? 0 : 24, zIndex: 5, overflowY: 'auto', boxShadow: '-4px 0 15px rgba(0,0,0,0.2)' }}>
              {/* Resize Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = sidebarWidth;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const diff = startX - moveEvent.clientX;
                    setSidebarWidth(Math.max(300, Math.min(800, startWidth + diff)));
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '6px',
                  cursor: 'col-resize',
                  backgroundColor: 'transparent',
                  zIndex: 10,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              />

              {selectedNode.type !== 'text' && selectedNode.type !== 'image' && selectedNode.type !== 'audio' && selectedNode.type !== 'video' && selectedNode.type !== 'file' && selectedNode.type !== 'location' && selectedNode.type !== 'whatsapp_flow' && selectedNode.type !== 'user_input' && selectedNode.type !== 'interactive_msg' && selectedNode.type !== 'template_msg' && selectedNode.type !== 'cta_button' && selectedNode.type !== 'condition' && selectedNode.type !== 'label_assign' && selectedNode.type !== 'random_number' && (
                <>
                  <h3 style={{ fontSize: 15, color: 'var(--fb-text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Settings size={16} /> {selectedNode.type === 'start_flow' ? 'Configure Reference' : selectedNode.type === 'new_sequence_campaign' ? 'Configure New Sequence' : 'Block Settings'}
                  </h3>
                  {selectedNode.type === 'start_flow' && (
                    <p style={{ margin: '0 0 20px 0', fontSize: 11, color: 'var(--fb-text-secondary)', borderBottom: '1px solid var(--fb-border-card)', paddingBottom: 12 }}>Define how the bot should identify and respond to user inputs.</p>
                  )}
                  {selectedNode.type === 'new_sequence_campaign' && (
                    <p style={{ margin: '0 0 20px 0', fontSize: 11, color: 'var(--fb-text-secondary)', borderBottom: '1px solid var(--fb-border-card)', paddingBottom: 12 }}>Set up a series of timed messages delivered outside the 24-hour window.</p>
                  )}
                  {selectedNode.type !== 'start_flow' && selectedNode.type !== 'new_sequence_campaign' && (
                    <div style={{ marginBottom: 20, borderBottom: '1px solid var(--fb-border-card)', paddingBottom: 12 }} />
                  )}
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: (selectedNode.type === 'text' || selectedNode.type === 'image' || selectedNode.type === 'audio' || selectedNode.type === 'video' || selectedNode.type === 'file' || selectedNode.type === 'location' || selectedNode.type === 'whatsapp_flow' || selectedNode.type === 'user_input' || selectedNode.type === 'interactive_msg' || selectedNode.type === 'template_msg' || selectedNode.type === 'cta_button' || selectedNode.type === 'condition') ? 0 : 14 }}>
                {selectedNode.type !== 'start_flow' && selectedNode.type !== 'new_sequence_campaign' && selectedNode.type !== 'text' && selectedNode.type !== 'image' && selectedNode.type !== 'audio' && selectedNode.type !== 'video' && selectedNode.type !== 'file' && selectedNode.type !== 'location' && selectedNode.type !== 'whatsapp_flow' && selectedNode.type !== 'user_input' && selectedNode.type !== 'interactive_msg' && selectedNode.type !== 'template_msg' && selectedNode.type !== 'cta_button' && selectedNode.type !== 'condition' && selectedNode.type !== 'label_assign' && selectedNode.type !== 'random_number' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Block Name</label>
                    <input
                      value={selectedNode.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, name: val } : n));
                      }}
                      style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* Start node inputs */}
                {selectedNode.type === 'start_flow' && (
                  <>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Settings size={14} color="#60a5fa" />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Basic Setup</span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Essential settings to trigger this reference.</p>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Trigger Keywords</label>
                        <textarea
                          value={selectedNode.data.trigger_keywords || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, trigger_keywords: val } } : n));
                          }}
                          placeholder="e.g. hello, hi, 26062026,"
                          rows={3}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Keyword matching type</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div
                            onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, match_type: 'Exact keyword match' } } : n))}
                            style={{
                              flex: 1, padding: 10, borderRadius: 6, cursor: 'pointer', border: '1px solid',
                              borderColor: (!selectedNode.data.match_type || selectedNode.data.match_type === 'Exact keyword match') ? '#3b82f6' : 'var(--fb-bg-card-header)',
                              background: (!selectedNode.data.match_type || selectedNode.data.match_type === 'Exact keyword match') ? 'rgba(59, 130, 246, 0.1)' : 'var(--fb-bg-sidebar)'
                            }}
                          >
                            <div style={{ fontSize: 12, color: 'var(--fb-text-primary)', fontWeight: 500, marginBottom: 2 }}>Exact keyword match</div>
                            <div style={{ fontSize: 10, color: 'var(--fb-text-secondary)' }}>Match exact keywords</div>
                          </div>
                          <div
                            onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, match_type: 'String match' } } : n))}
                            style={{
                              flex: 1, padding: 10, borderRadius: 6, cursor: 'pointer', border: '1px solid',
                              borderColor: selectedNode.data.match_type === 'String match' ? '#3b82f6' : 'var(--fb-bg-card-header)',
                              background: selectedNode.data.match_type === 'String match' ? 'rgba(59, 130, 246, 0.1)' : 'var(--fb-bg-sidebar)'
                            }}
                          >
                            <div style={{ fontSize: 12, color: 'var(--fb-text-primary)', fontWeight: 500, marginBottom: 2 }}>String match</div>
                            <div style={{ fontSize: 10, color: 'var(--fb-text-secondary)' }}>Match similar keywords</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Subscribe to Sequence</label>
                        <select
                          value={selectedNode.data.subscribe_sequence || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, subscribe_sequence: val } } : n));
                          }}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        >
                          <option value="">Select a Sequence</option>
                          {sequences.map((s: any) => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Title *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            value={selectedNode.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, name: val } : n));
                            }}
                            placeholder="e.g. test bot for sequence"
                            maxLength={200}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                          />
                          <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 10, color: 'var(--fb-text-secondary)' }}>
                            {(selectedNode.name || '').length}/200
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 20, background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#a78bfa', fontSize: 14 }}>⚡</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Automation Actions <span style={{ fontSize: 10, background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 10, marginLeft: 6, fontWeight: 500 }}>Optional</span></span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Manage labels, sequences and team assignment.</p>

                      {/* Labels Row */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Add Label(s)</label>
                          <select
                            value={selectedNode.data.add_labels || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, add_labels: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box', appearance: 'auto' }}
                          >
                            <option value="">Select a label...</option>
                            {availableLabels.map(lbl => (
                              <option key={lbl.id} value={lbl.name}>{lbl.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Remove Label(s)</label>
                          <select
                            value={selectedNode.data.remove_labels || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, remove_labels: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box', appearance: 'auto' }}
                          >
                            <option value="">Select a label...</option>
                            {availableLabels.map(lbl => (
                              <option key={lbl.id} value={lbl.name}>{lbl.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Sequences Row */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Subscribe to Sequence</label>
                          <select
                            value={selectedNode.data.subscribe_sequence || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, subscribe_sequence: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                          >
                            <option value="">Select a Sequence</option>
                            {sequences.map((s: any) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Unsubscribe from Sequence</label>
                          <select
                            value={selectedNode.data.unsubscribe_sequence || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, unsubscribe_sequence: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                          >
                            <option value="">Select a Sequence</option>
                            {sequences.map((s: any) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Assignment Row */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Assign Conversation to a group</label>
                          <select
                            value={selectedNode.data.assign_group || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, assign_group: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                          >
                            <option value="">Select Team Role</option>
                            {/* Placeholder for groups until API is connected */}
                            <option value="sales">Sales</option>
                            <option value="support">Support</option>
                            <option value="marketing">Marketing</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Assign conversation to a user</label>
                          <select
                            value={selectedNode.data.assign_user || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, assign_user: val } } : n));
                            }}
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                          >
                            <option value="">Select Team Member</option>
                            {/* Placeholder for users until API is connected */}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 20, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Database size={14} color="#10b981" />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Data & Integrations <span style={{ fontSize: 10, background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 6px', borderRadius: 10, marginLeft: 6, fontWeight: 500 }}>Optional</span></span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Store data in custom fields or send to external tools.</p>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label style={{ fontSize: 11, color: 'var(--fb-text-tertiary)' }}>Save to Custom Field</label>
                          <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>+ Add new field</span>
                        </div>
                        <select
                          value={selectedNode.data.save_custom_field || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, save_custom_field: val } } : n));
                          }}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        >
                          <option value="">Select</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Forward Data to Webhook</label>
                        <input
                          value={selectedNode.data.webhook_url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, webhook_url: val } } : n));
                          }}
                          placeholder="🔗 https://your-webhook-url.com"
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Sync Data to Google Sheets</label>
                        <input
                          value={selectedNode.data.google_sheets_sync || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, google_sheets_sync: val } } : n));
                          }}
                          placeholder="G"
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Text node inputs */}
                {selectedNode.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Text Message</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Compose your reply message with variables and emojis.</p>
                        </div>
                      </div>

                      {/* Reply Message Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 16 }}>≡</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Reply message <span style={{ color: '#ef4444' }}>*</span></h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Main text content sent to the subscriber.</p>
                          </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button onClick={() => { const val = (selectedNode.data.text || '') + '{{name}}'; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n)); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={selectedNode.data.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n));
                            }}
                            rows={6}
                            style={{ width: '100%', padding: '12px 12px 30px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--fb-text-secondary)', cursor: 'pointer' }}>
                            <span style={{ fontSize: 18 }}>🙂</span>
                          </div>
                          <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 11, color: 'var(--fb-text-secondary)' }}>
                            {(selectedNode.data.text || '').length}/4096
                          </div>
                        </div>
                      </div>

                      {/* Delivery Options Card */}
                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Image node inputs */}
                {selectedNode.type === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <ImageIcon size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Image</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Upload an image or use a custom field URL in your reply.</p>
                        </div>
                      </div>

                      {/* How to Send Media Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>i</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>How to send media</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose a custom field URL or upload a new image.</p>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--fb-text-primary)' }}>
                          <strong style={{ display: 'block', marginBottom: 4 }}>Choose How to Send Media</strong>
                          <span style={{ color: 'var(--fb-text-secondary)', display: 'block', marginBottom: 12 }}>You can deliver media to users in two ways:</span>

                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Use Custom Field</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Select this option if the file URL is already stored in a custom field. This is useful for dynamic or previously uploaded content.</span>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Upload New Media</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Upload a new file directly from your device. This media will be sent with the message immediately upon upload.</span>
                          </div>
                        </div>
                      </div>

                      {/* Upload Image Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <UploadCloud size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Upload image</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Upload a PNG or JPG file from your device.</p>
                          </div>
                        </div>
                        <div
                          onClick={() => triggerFileUpload(selectedNode.id)}
                          style={{ border: '2px dashed var(--fb-border-card)', borderRadius: 8, padding: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'var(--fb-bg-sidebar)', marginBottom: 8 }}
                        >
                          {uploadingNodeId === selectedNode.id ? (
                            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Uploading...</div>
                          ) : (
                            <div style={{ background: '#3b82f6', width: 48, height: 32, borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                              <UploadCloud size={18} />
                            </div>
                          )}
                        </div>
                        {uploadError && uploadingNodeId === null && (
                          <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 8 }}>⚠️ {uploadError}</div>
                        )}
                        {selectedNode.data.media_id && (
                          <div style={{ color: '#10b981', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Successfully uploaded to Meta (ID: {selectedNode.data.media_id})
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Supported types: png, jpg</div>
                      </div>

                      {/* Image URL Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Link2 size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Image URL</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Paste a URL or insert a custom field variable.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                        </div>
                        <input
                          value={selectedNode.data.url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, url: val, media_id: '' } } : n));
                          }}
                          placeholder="You can either upload an image or use a custom field..."
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        />

                        <div style={{ marginTop: 16 }}>
                          <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6, fontWeight: 600 }}>Caption</label>
                          <input
                            value={selectedNode.data.caption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, caption: val } } : n));
                            }}
                            placeholder="Optional caption for the image"
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Delivery Options Card */}
                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Audio node inputs */}
                {selectedNode.type === 'audio' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Music size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Audio</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Upload an audio file or use a custom field URL in your reply.</p>
                        </div>
                      </div>

                      {/* How to Send Media Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>i</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>How to send media</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose a custom field URL or upload a new audio file.</p>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--fb-text-primary)' }}>
                          <strong style={{ display: 'block', marginBottom: 4 }}>Choose How to Send Media</strong>
                          <span style={{ color: 'var(--fb-text-secondary)', display: 'block', marginBottom: 12 }}>You can deliver media to users in two ways:</span>

                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Use Custom Field</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Select this option if the file URL is already stored in a custom field. This is useful for dynamic or previously uploaded content.</span>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Upload New Media</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Upload a new file directly from your device. This media will be sent with the message immediately upon upload.</span>
                          </div>
                        </div>
                      </div>

                      {/* Upload Audio Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <UploadCloud size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Upload audio</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Upload an audio file from your device.</p>
                          </div>
                        </div>
                        <div
                          onClick={() => triggerFileUpload(selectedNode.id)}
                          style={{ border: '2px dashed var(--fb-border-card)', borderRadius: 8, padding: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'var(--fb-bg-sidebar)', marginBottom: 8 }}
                        >
                          {uploadingNodeId === selectedNode.id ? (
                            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Uploading...</div>
                          ) : (
                            <div style={{ background: '#3b82f6', width: 48, height: 32, borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                              <UploadCloud size={18} />
                            </div>
                          )}
                        </div>
                        {uploadError && uploadingNodeId === null && (
                          <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 8 }}>⚠️ {uploadError}</div>
                        )}
                        {selectedNode.data.media_id && (
                          <div style={{ color: '#10b981', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Successfully uploaded to Meta (ID: {selectedNode.data.media_id})
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Supported types: amr, mp3, ogg(OPUS codecs only, base audio/ogg not supported.)</div>
                      </div>

                      {/* Audio URL Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Link2 size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Audio URL</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Paste a URL or insert a custom field variable.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                        </div>
                        <input
                          value={selectedNode.data.url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, url: val, media_id: '' } } : n));
                          }}
                          placeholder="You can either upload an audio or use a custom field..."
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Delivery Options Card */}
                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Video node inputs */}
                {selectedNode.type === 'video' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Video size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Video</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Upload a video file or use a custom field URL in your reply.</p>
                        </div>
                      </div>

                      {/* How to Send Media Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>i</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>How to send media</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose a custom field URL or upload a new video file.</p>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--fb-text-primary)' }}>
                          <strong style={{ display: 'block', marginBottom: 4 }}>Choose How to Send Media</strong>
                          <span style={{ color: 'var(--fb-text-secondary)', display: 'block', marginBottom: 12 }}>You can deliver media to users in two ways:</span>
                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Use Custom Field</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Select this option if the file URL is already stored in a custom field. This is useful for dynamic or previously uploaded content.</span>
                          </div>
                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Upload New Media</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Upload a new file directly from your device. This media will be sent with the message immediately upon upload.</span>
                          </div>
                        </div>
                      </div>

                      {/* Upload Video Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <UploadCloud size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Upload video</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Upload a video file from your device.</p>
                          </div>
                        </div>
                        <div
                          onClick={() => triggerFileUpload(selectedNode.id)}
                          style={{ border: '2px dashed var(--fb-border-card)', borderRadius: 8, padding: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'var(--fb-bg-sidebar)', marginBottom: 8 }}
                        >
                          {uploadingNodeId === selectedNode.id ? (
                            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Uploading...</div>
                          ) : (
                            <div style={{ background: '#3b82f6', width: 48, height: 32, borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                              <UploadCloud size={18} />
                            </div>
                          )}
                        </div>
                        {uploadError && uploadingNodeId === null && (
                          <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 8 }}>⚠️ {uploadError}</div>
                        )}
                        {selectedNode.data.media_id && (
                          <div style={{ color: '#10b981', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Successfully uploaded to Meta (ID: {selectedNode.data.media_id})
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Supported types: mp4, flv, wmv</div>
                      </div>

                      {/* Video URL Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Link2 size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Video URL</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Paste a URL or insert a custom field variable.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                        </div>
                        <input
                          value={selectedNode.data.url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, url: val, media_id: '' } } : n));
                          }}
                          placeholder="You can either upload a video or use a custom field..."
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Delivery Options Card */}
                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* File inputs */}
                {selectedNode.type === 'file' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure File</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Upload a file or use a custom field URL in your reply.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>i</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>How to send media</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose a custom field URL or upload a new file.</p>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--fb-text-primary)' }}>
                          <strong style={{ display: 'block', marginBottom: 4 }}>Choose How to Send Media</strong>
                          <span style={{ color: 'var(--fb-text-secondary)', display: 'block', marginBottom: 12 }}>You can deliver media to users in two ways:</span>
                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Use Custom Field</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Select this option if the file URL is already stored in a custom field.</span>
                          </div>
                          <div style={{ borderTop: '1px solid rgba(59,130,246,0.1)', paddingTop: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Upload New Media</strong>
                            <span style={{ color: 'var(--fb-text-secondary)' }}>Upload a new file directly from your device.</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <UploadCloud size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Upload file</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Upload a file from your device.</p>
                          </div>
                        </div>
                        <div onClick={() => triggerFileUpload(selectedNode.id)} style={{ border: '2px dashed var(--fb-border-card)', borderRadius: 8, padding: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'var(--fb-bg-sidebar)', marginBottom: 8 }}>
                          {uploadingNodeId === selectedNode.id ? (
                            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}><span>⏳</span> Uploading...</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <div style={{ background: 'rgba(59,130,246,0.1)', width: 48, height: 48, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#3b82f6' }}>
                                <FileText size={22} />
                              </div>
                            </div>
                          )}
                        </div>
                        {uploadError && uploadingNodeId === null && <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 8 }}>⚠️ {uploadError}</div>}
                        {selectedNode.data.media_id && <div style={{ color: '#10b981', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Uploaded (ID: {selectedNode.data.media_id})</div>}
                        <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Supported media types: doc, docx, pdf, txt, ppt, pptx, xls, xlsx</div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Link2 size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>File URL</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Paste a URL or insert a custom field variable.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                        </div>
                        <input
                          value={selectedNode.data.url || ''}
                          onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, url: val, media_id: '' } } : n)); }}
                          placeholder="You can either upload a file or use a custom field..."
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }}
                        />
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6, fontWeight: 600 }}>File Display Name</label>
                        <input
                          value={selectedNode.data.filename || ''}
                          onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, filename: val } } : n)); }}
                          placeholder="document.pdf"
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Location node inputs */}
                {selectedNode.type === 'location' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Location Template</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Set the body text for your location quick reply template.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <span style={{ fontSize: 14 }}>≡</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Body text <span style={{ color: '#ef4444' }}>*</span></h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Message shown with the location request button.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>
                        <textarea
                          value={selectedNode.data.text || ''}
                          onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n)); }}
                          rows={5}
                          placeholder="Type # for custom fields and name"
                          style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>

                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* User Input Flow node inputs */}
                {selectedNode.type === 'user_input' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Database size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure User-Input-Flow</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Set up a multi-question campaign and how responses are stored.</p>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--fb-text-primary)', marginBottom: 16 }}>
                        Name your User Input Campaign to reflect its purpose, whether it's for surveys, order collection, reservations, appointments, or other interactive processes. This campaign type enables you to create a sequence of questions, with the collected data saved as a consolidated set. You can easily export this combined data to a CSV file for analysis and management. Choose a name that defines the essence of your campaign and aids in efficient organization of the gathered insights.
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Database size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>User Input Flow</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Select an existing flow or create a new campaign.</p>
                          </div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>User input flow</label>
                        <select
                          value={selectedNode.data.campaign || ''}
                          onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, campaign: val } } : n)); }}
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        >
                          <option value="">Select Flow Campaign</option>
                        </select>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                            <Settings size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Labels</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Add or remove subscriber labels when this flow runs.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Add Label(s)</label>
                              <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> New</button>
                            </div>
                            <input
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Remove Label(s)</label>
                            <input
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>🔌</span>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Integrations</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Webhook and Google Sheets options.</p>
                          </div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Forward Data to Webhook</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: '0 12px', marginBottom: 12 }}>
                          <Link2 size={14} color="#9ca3af" />
                          <input placeholder="https://your-webhook-url.com" style={{ width: '100%', padding: '10px 8px', background: 'transparent', border: 'none', color: 'var(--fb-text-primary)', fontSize: 13, outline: 'none' }} />
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Sync Data to Google Sheets</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: '0 12px' }}>
                          <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', height: 14 }}>G</span>
                          <input placeholder="" style={{ width: '100%', padding: '10px 8px', background: 'transparent', border: 'none', color: 'var(--fb-text-primary)', fontSize: 13, outline: 'none' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* WhatsApp Flow node inputs */}
                {selectedNode.type === 'whatsapp_flow' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Grid size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Whatsapp Flows</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Select a flow and configure the message shown to subscribers.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Grid size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Choose a flow <span style={{ color: '#ef4444' }}>*</span></h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Select the WhatsApp Flow to send when this step runs.</p>
                          </div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Choose a flow</label>
                        <select
                          value={selectedNode.data.flow_id || ''}
                          onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, flow_id: val } } : n)); }}
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        >
                          <option value="">Select a Flow</option>
                        </select>
                      </div>

                      {[{ icon: 'H', label: 'Message Header', required: true, subtitle: 'Header text displayed at the top of the flow message.', field: 'header', placeholder: 'Enter message header' },
                      { icon: '≡', label: 'Message Body', required: true, subtitle: 'Main message content shown above the flow button.', field: 'body', placeholder: 'Enter message body', multiline: true },
                      { icon: '≣', label: 'Message Footer', required: false, subtitle: 'Optional text displayed at the bottom of the message.', field: 'footer', placeholder: 'Enter message footer (optional)' },
                      { icon: '✓', label: 'Footer Button Text', required: true, subtitle: 'Label on the button that opens the flow.', field: 'button_text', placeholder: 'Enter button text' }
                      ].map(field => (
                        <div key={field.field} style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                              {field.icon}
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>
                                {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                {!field.required && <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, marginLeft: 6 }}>Optional</span>}
                              </h3>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>{field.subtitle}</p>
                            </div>
                          </div>
                          {field.multiline ? (
                            <textarea
                              value={(selectedNode.data as any)[field.field] || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field.field]: val } } : n)); }}
                              placeholder={field.placeholder}
                              rows={4}
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                            />
                          ) : (
                            <input
                              value={(selectedNode.data as any)[field.field] || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field.field]: val } } : n)); }}
                              placeholder={field.placeholder}
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          )}
                        </div>
                      ))}

                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* User input parameters (old - kept for backward compat, now replaced above) */}

                {/* Button node inputs */}
                {selectedNode.type === 'button' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Button Text / Label</label>
                      <input
                        value={selectedNode.data.buttonText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, buttonText: val } } : n));
                        }}
                        style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Action Subtitle</label>
                      <input
                        value={selectedNode.data.text || 'Send Message'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n));
                        }}
                        style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}

                {/* List Message, Section, Row inputs */}
                {selectedNode.type === 'list_message' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Action Button Text</label>
                    <input
                      value={selectedNode.data.buttonText || 'View Options'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, buttonText: val } } : n));
                      }}
                      placeholder="e.g. View Options"
                      maxLength={20}
                      style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                {selectedNode.type === 'section' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Section Title</label>
                    <input
                      value={selectedNode.data.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, title: val } } : n));
                      }}
                      placeholder="e.g. Category 1"
                      maxLength={24}
                      style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                {selectedNode.type === 'row' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Row Title</label>
                      <input
                        value={selectedNode.data.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, title: val } } : n));
                        }}
                        placeholder="e.g. Option 1"
                        maxLength={24}
                        style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Row Description (Optional)</label>
                      <textarea
                        value={selectedNode.data.description || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, description: val } } : n));
                        }}
                        placeholder="Optional details..."
                        maxLength={72}
                        rows={2}
                        style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* Interactive Message node inputs */}
                {selectedNode.type === 'interactive_msg' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Bot size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Interactive Message</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Configure your interactive message header, body and footer.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Interactive Type</h3>
                              <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Required</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose how this interactive node should send content.</p>
                          </div>
                        </div>
                        <select
                          value={selectedNode.data.interactive_type || 'button'}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNodes(prev => prev.map(n => {
                              if (n.id === selectedNode.id) {
                                const dataUpdate: any = { ...n.data, interactive_type: value };
                                if (value === 'list' || value === 'cta_url') {
                                  if (['media', 'image_url', 'image_id'].includes(dataUpdate.header_type)) {
                                    dataUpdate.header_type = 'text';
                                    dataUpdate.header_image_url = '';
                                    dataUpdate.header_image_id = '';
                                  }
                                }
                                return { ...n, data: dataUpdate };
                              }
                              return n;
                            }));
                          }}
                          style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                        >
                          {INTERACTIVE_SEND_TYPES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <p style={{ margin: '12px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>
                          {selectedNode.data.interactive_type === 'list'
                            ? 'Connect this node to a List Message node, plus Section and Row nodes, to build a list message.'
                            : selectedNode.data.interactive_type === 'cta_url'
                              ? 'Use a CTA URL button to send a single link button. Header supports text only.'
                              : selectedNode.data.interactive_type === 'flow'
                                ? 'Send a WhatsApp Flow message by configuring the Flow ID below.'
                                : 'Use reply buttons by connecting Quick Reply Button nodes to this message.'}
                        </p>
                      </div>

                      {/* Message Header */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                            H
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Message Header</h3>
                              <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>
                              {selectedNode.data.interactive_type === 'list' || selectedNode.data.interactive_type === 'cta_url'
                                ? 'List and CTA messages support header text only. Leave blank to omit the header.'
                                : 'Optional text or media displayed at the top of the message.'}
                            </p>
                          </div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Header Type</label>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <div
                            onClick={() => { setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_type: 'none' } } : n)); }}
                            style={{ flex: 1, padding: '12px', border: selectedNode.data.header_type === 'none' ? '2px solid #3b82f6' : '1px solid var(--fb-border-card)', borderRadius: 8, cursor: 'pointer', background: 'var(--fb-bg-card)' }}
                          >
                            <strong style={{ display: 'block', fontSize: 13, color: 'var(--fb-text-primary)', marginBottom: 4 }}>None</strong>
                            <span style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>No header</span>
                          </div>
                          <div
                            onClick={() => { setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_type: 'text' } } : n)); }}
                            style={{ flex: 1, padding: '12px', border: selectedNode.data.header_type === 'text' ? '2px solid #3b82f6' : '1px solid var(--fb-border-card)', borderRadius: 8, cursor: 'pointer', background: 'var(--fb-bg-card)' }}
                          >
                            <strong style={{ display: 'block', fontSize: 13, color: 'var(--fb-text-primary)', marginBottom: 4 }}>Text</strong>
                            <span style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Text-only header</span>
                          </div>
                          {(['button', 'flow'] as const).includes(selectedNode.data.interactive_type || 'button') && (
                            <div
                              onClick={() => { setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_type: 'media' } } : n)); }}
                              style={{ flex: 1, padding: '12px', border: selectedNode.data.header_type === 'media' || selectedNode.data.header_type === 'image_url' || selectedNode.data.header_type === 'image_id' ? '2px solid #3b82f6' : '1px solid var(--fb-border-card)', borderRadius: 8, cursor: 'pointer', background: 'var(--fb-bg-card)' }}
                            >
                              <strong style={{ display: 'block', fontSize: 13, color: 'var(--fb-text-primary)', marginBottom: 4 }}>Media</strong>
                              <span style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Image, video or file</span>
                            </div>
                          )}
                        </div>

                        {selectedNode.data.header_type === 'text' && (
                          <div>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Text</label>
                            <div style={{ position: 'relative' }}>
                              <input
                                value={selectedNode.data.header_text || ''}
                                onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_text: val } } : n)); }}
                                placeholder="Provide text for header"
                                maxLength={60}
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                              />
                              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.header_text || '').length}/60</span>
                            </div>
                          </div>
                        )}

                        {(selectedNode.data.header_type === 'media' || selectedNode.data.header_type === 'image_url' || selectedNode.data.header_type === 'image_id') && (['button', 'flow'] as const).includes(selectedNode.data.interactive_type || 'button') && (
                          <div>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Media URL</label>
                            <input
                              value={selectedNode.data.header_image_url || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_image_url: val, header_type: 'image_url' } } : n)); }}
                              placeholder="https://..."
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }}
                            />
                            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 12 }}>— or upload media —</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                value={selectedNode.data.header_image_id || ''}
                                onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_image_id: val, header_type: 'image_id' } } : n)); }}
                                placeholder="Media ID"
                                style={{ flex: 1, padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                              />
                              <button
                                onClick={() => triggerFileUpload(selectedNode.id + '_header')}
                                disabled={uploadingNodeId === selectedNode.id + '_header'}
                                style={{ padding: '0 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                {uploadingNodeId === selectedNode.id + '_header' ? '⏳' : <><UploadCloud size={14} /> Upload</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Message Body */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                            ≡
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Message Body <span style={{ color: '#ef4444' }}>*</span></h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Main message content shown to the user.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={selectedNode.data.text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n)); }}
                            rows={6}
                            placeholder="Type # for custom fields and name"
                            maxLength={1024}
                            style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <span style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.text || '').length}/1024</span>
                        </div>
                      </div>

                      {/* CTA URL / Flow settings */}
                      {selectedNode.data.interactive_type === 'cta_url' && (
                        <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: 14, fontWeight: 'bold' }}>
                              <MousePointerClick size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>CTA Button Settings</h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Configure the button label and target URL for the CTA.</p>
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Button Text</label>
                            <input
                              value={selectedNode.data.button_text || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_text: val } } : n)); }}
                              placeholder="e.g. Visit Website"
                              maxLength={20}
                              style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Button URL</label>
                            <input
                              value={selectedNode.data.button_url || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_url: val } } : n)); }}
                              placeholder="https://example.com"
                              style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}

                      {selectedNode.data.interactive_type === 'flow' && (
                        <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                              <Grid size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Flow Message Settings</h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Provide the native WhatsApp Flow ID to send a flow message.</p>
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Flow ID</label>
                            <input
                              value={selectedNode.data.flow_id || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, flow_id: val } } : n)); }}
                              placeholder="Enter WhatsApp Flow ID"
                              style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Trigger Button Text</label>
                            <input
                              value={selectedNode.data.button_text || ''}
                              onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_text: val } } : n)); }}
                              placeholder="e.g. Open Flow"
                              maxLength={20}
                              style={{ width: '100%', padding: 8, background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Message Footer */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 14, fontWeight: 'bold' }}>
                            ≣
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Message Footer</h3>
                              <span style={{ background: '#d1fae5', color: '#059669', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Optional text displayed at the bottom of the message.</p>
                          </div>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Message Footer (Optional)</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            value={selectedNode.data.footer_text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, footer_text: val } } : n)); }}
                            placeholder="Provide text for footer"
                            maxLength={60}
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                          />
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.footer_text || '').length}/60</span>
                        </div>
                      </div>

                      <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Message node inputs */}
                {selectedNode.type === 'template_msg' && (() => {
                  const selectedTpl = templates.find(t => t.name === selectedNode.data.template_name);
                  let hasHeaderParams = false;
                  let headerParamsCount = 0;
                  let headerExampleArray: string[] = [];

                  let hasHeaderMediaParams = false;
                  let headerMediaType = '';

                  let hasBodyParams = false;
                  let bodyParamsCount = 0;
                  let bodyExampleArray: string[] = [];

                  let hasUrlParams = false;

                  if (selectedTpl && selectedTpl.data && selectedTpl.data.components) {
                    const headerComponent = selectedTpl.data.components.find((c: any) => c.type === 'HEADER');
                    if (headerComponent) {
                      if ((!headerComponent.format || headerComponent.format === 'TEXT') && headerComponent.text && /\{\{\d+\}\}/.test(headerComponent.text)) {
                        hasHeaderParams = true;
                        if (headerComponent.example && headerComponent.example.header_text && headerComponent.example.header_text.length > 0) {
                          headerExampleArray = [headerComponent.example.header_text[0]];
                          headerParamsCount = 1; // Headers usually have 1 var max
                        } else {
                          const matches = headerComponent.text.match(/\{\{\d+\}\}/g);
                          if (matches) headerParamsCount = new Set(matches).size;
                        }
                      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format)) {
                        hasHeaderMediaParams = true;
                        headerMediaType = headerComponent.format;

                        // Auto-save the header_media_type so backend knows what type of media it is
                        if (selectedNode.data.header_media_type !== headerMediaType) {
                          // Using setTimeout to prevent infinite loop during render, though ideally this is set on template selection
                          setTimeout(() => {
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_media_type: headerMediaType } } : n));
                          }, 0);
                        }
                      }
                    }

                    const bodyComponent = selectedTpl.data.components.find((c: any) => c.type === 'BODY');
                    if (bodyComponent && bodyComponent.text && /\{\{\d+\}\}/.test(bodyComponent.text)) {
                      hasBodyParams = true;
                      if (bodyComponent.example && bodyComponent.example.body_text && bodyComponent.example.body_text.length > 0) {
                        bodyExampleArray = bodyComponent.example.body_text[0];
                        bodyParamsCount = bodyExampleArray.length;
                      } else {
                        const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
                        if (matches) bodyParamsCount = new Set(matches).size;
                      }
                    }

                    const buttonsComponent = selectedTpl.data.components.find((c: any) => c.type === 'BUTTONS');
                    if (buttonsComponent && buttonsComponent.buttons) {
                      const urlButton = buttonsComponent.buttons.find((b: any) => b.type === 'URL' && b.url && /\{\{\d+\}\}/.test(b.url));
                      if (urlButton) {
                        hasUrlParams = true;
                      }
                    }
                  }

                  const currentHeaderParams = (selectedNode.data.header_params || '').split(',');
                  for (let i = 0; i < headerParamsCount; i++) if (currentHeaderParams[i] === undefined) currentHeaderParams[i] = '';

                  const currentBodyParams = (selectedNode.data.template_params || '').split(',');
                  for (let i = 0; i < bodyParamsCount; i++) if (currentBodyParams[i] === undefined) currentBodyParams[i] = '';

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <FileText size={24} />
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Template Message</h2>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Select an approved WhatsApp template and configure buttons or media as needed.</p>
                          </div>
                        </div>

                        <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Select template <span style={{ color: '#ef4444' }}>*</span></h3>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose the approved template message to send at this step.</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Select template</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={fetchTemplatesAndSequences}
                                title="Refresh Templates"
                                style={{ padding: '6px 8px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <RefreshCw size={14} />
                              </button>
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={() => setShowCreateTemplateDropdown(prev => !prev)}
                                  title="Create Template"
                                  style={{ padding: '6px 10px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                >
                                  <Plus size={14} /> Create <span style={{ fontSize: 10 }}>▼</span>
                                </button>
                                {showCreateTemplateDropdown && (
                                  <>
                                    <div
                                      onClick={() => setShowCreateTemplateDropdown(false)}
                                      style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                    />
                                    <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 170, overflow: 'hidden' }}>
                                      <div
                                        onClick={() => { setShowCreateTemplateDropdown(false); setTplName(''); setTplCategory('MARKETING'); setTplLanguage('en_US'); setTplHeaderType('NONE'); setTplHeaderText(''); setTplBody(''); setTplFooter(''); setTplButtons([]); setTplBtnType('NONE'); setTplBtnText(''); setTplBtnUrl(''); setShowTplModal(true); }}
                                        style={{ padding: '10px 16px', fontSize: 13, color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                      >
                                        Mixed Template
                                      </div>
                                      <div
                                        onClick={() => { setShowCreateTemplateDropdown(false); window.open('/template-manager?type=wp', '_blank'); }}
                                        style={{ padding: '10px 16px', fontSize: 13, color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                      >
                                        WP Template
                                      </div>
                                      <div
                                        onClick={() => { setShowCreateTemplateDropdown(false); window.open('/template-manager?type=default', '_blank'); }}
                                        style={{ padding: '10px 16px', fontSize: 13, color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                      >
                                        Default Template
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <select
                            value={selectedNode.data.template_name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNodes(prev => prev.map(n => {
                                if (n.id === selectedNode.id) {
                                  return {
                                    ...n,
                                    data: {
                                      ...n.data,
                                      template_name: val,
                                      header_params: '',
                                      header_media_url: '',
                                      template_params: '',
                                      button_params: ''
                                    }
                                  };
                                }
                                return n;
                              }));
                            }}
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                          >
                            <option value="">No templates available</option>
                            {templates.map((tpl: any, idx: number) => (
                              <option key={idx} value={tpl.name}>{tpl.name}</option>
                            ))}
                          </select>

                          {hasHeaderParams && (
                            <div style={{ marginTop: 16 }}>
                              <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Header Parameters</label>
                              {Array.from({ length: headerParamsCount }).map((_, i) => (
                                <input
                                  key={i}
                                  value={currentHeaderParams[i]}
                                  onChange={(e) => {
                                    const newArr = [...currentHeaderParams];
                                    newArr[i] = e.target.value;
                                    const joined = newArr.join(',');
                                    setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_params: joined } } : n));
                                  }}
                                  placeholder={headerExampleArray[i] ? `e.g. ${headerExampleArray[i]}` : `{{${i + 1}}}`}
                                  style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                                />
                              ))}
                            </div>
                          )}

                          {hasHeaderMediaParams && (
                            <div style={{ marginTop: 16 }}>
                              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>
                                <span>Header {headerMediaType} URL</span>
                                <span style={{ color: '#fbbf24', fontSize: 11 }}>Requires media link</span>
                              </label>
                              <input
                                value={selectedNode.data.header_media_url || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_media_url: val } } : n));
                                }}
                                placeholder={`e.g. https://example.com/file.${headerMediaType === 'IMAGE' ? 'jpg' : headerMediaType === 'VIDEO' ? 'mp4' : 'pdf'}`}
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                              />
                              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 12 }}>— or upload header media —</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => triggerFileUpload(selectedNode.id + '_header')}
                                  disabled={uploadingNodeId === selectedNode.id + '_header'}
                                  style={{ flex: 1, padding: '0 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                                >
                                  {uploadingNodeId === selectedNode.id + '_header' ? '⏳ Uploading…' : <><UploadCloud size={14} /> Upload header media</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {hasBodyParams && (
                            <div style={{ marginTop: 16 }}>
                              <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>Body Parameters</label>
                              {Array.from({ length: bodyParamsCount }).map((_, i) => (
                                <input
                                  key={i}
                                  value={currentBodyParams[i]}
                                  onChange={(e) => {
                                    const newArr = [...currentBodyParams];
                                    newArr[i] = e.target.value;
                                    const joined = newArr.join(',');
                                    setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, template_params: joined } } : n));
                                  }}
                                  placeholder={bodyExampleArray[i] ? `e.g. ${bodyExampleArray[i]}` : `{{${i + 1}}}`}
                                  style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                                />
                              ))}
                            </div>
                          )}

                          {hasUrlParams && (
                            <div style={{ marginTop: 16 }}>
                              <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)', marginBottom: 6 }}>URL Button Parameters (comma-separated, optional)</label>
                              <input
                                value={selectedNode.data.button_params || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_params: val } } : n));
                                }}
                                placeholder="e.g. tracking_id_123"
                                style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                              />
                              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>For dynamic URL buttons. Enter the dynamic part of the URL.</p>
                            </div>
                          )}
                        </div>

                        {/* Delivery Options */}
                        <FbDeliveryOptions selectedNode={selectedNode} setNodes={setNodes} />
                      </div>
                      <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          <span style={{ fontSize: 14 }}>×</span> Close
                        </button>
                        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                          <Save size={14} /> Save Changes
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* CTA URL Button node inputs */}
                {selectedNode.type === 'cta_button' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <ExternalLink size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure CTA URL Button</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Set up the message and call-to-action button that opens a URL.</p>
                        </div>
                      </div>

                      {/* Header Message */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                            H
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Header Message</h3>
                              <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Optional text displayed at the top of the message.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={selectedNode.data.header_text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, header_text: val } } : n)); }}
                            rows={3}
                            placeholder="Type # for custom fields and name"
                            maxLength={60}
                            style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <span style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.header_text || '').length}/60</span>
                        </div>
                      </div>

                      {/* Body Message */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }}>
                            ≡
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Body Message <span style={{ color: '#ef4444' }}>*</span></h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Main message content shown above the button.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={selectedNode.data.text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, text: val } } : n)); }}
                            rows={6}
                            placeholder="Type # for custom fields and name"
                            maxLength={1024}
                            style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <span style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.text || '').length}/1024</span>
                        </div>
                      </div>

                      {/* Footer Message */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 14, fontWeight: 'bold' }}>
                            ≣
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Footer Message</h3>
                              <span style={{ background: '#d1fae5', color: '#059669', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Optional text displayed below the body and above the button.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <Settings size={14} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--fb-bg-card)', border: '1px dashed var(--fb-border-card)', borderRadius: 4, color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            👤 Name
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={selectedNode.data.footer_text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, footer_text: val } } : n)); }}
                            rows={3}
                            placeholder="Type # for custom fields and name"
                            maxLength={60}
                            style={{ width: '100%', padding: '12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <span style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 10, color: '#9ca3af' }}>{(selectedNode.data.footer_text || '').length}/60</span>
                        </div>
                      </div>

                      {/* Call to Action Button */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: 14, fontWeight: 'bold' }}>
                            <MousePointerClick size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Call to Action Button</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Label and destination URL for the button.</p>
                          </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Button Text <span style={{ color: '#ef4444' }}>*</span></label>
                            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <Settings size={12} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                            </button>
                          </div>
                          <input
                            value={selectedNode.data.button_text || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_text: val } } : n)); }}
                            placeholder="Type # for custom fields and name"
                            maxLength={20}
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Button URL <span style={{ color: '#ef4444' }}>*</span></label>
                            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--fb-bg-card)', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <Settings size={12} /> Custom <span style={{ fontSize: 10 }}>▼</span>
                            </button>
                          </div>
                          <input
                            value={selectedNode.data.button_url || ''}
                            onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, button_url: val } } : n)); }}
                            placeholder="Type # for custom fields and name"
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Delivery Options */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><Clock size={16} /></div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Delivery Options</h3>
                                <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Optional</span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Typing indicator and reply delay settings.</p>
                            </div>
                          </div>
                          <span style={{ color: 'var(--fb-text-secondary)', cursor: 'pointer' }}>▼</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Condition node inputs */}
                {selectedNode.type === 'condition' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <GitBranch size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Condition</h2>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>Define rules to branch the flow when subscriber data matches.</p>
                        </div>
                      </div>

                      {/* Match Type Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Filter size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Match type</h3>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Choose whether all rules or any single rule must pass.</p>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div
                            onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, match_type: 'all' } } : n))}
                            style={{ padding: '14px 16px', borderRadius: 8, border: `2px solid ${selectedNode.data.match_type === 'any' ? 'var(--fb-border-card)' : '#3b82f6'}`, background: selectedNode.data.match_type === 'any' ? 'var(--fb-bg-card)' : 'rgba(59,130,246,0.08)', cursor: 'pointer', transition: 'all 0.2s' }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fb-text-primary)', marginBottom: 4 }}>All Match</div>
                            <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>Every rule below must be true.</div>
                          </div>
                          <div
                            onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, match_type: 'any' } } : n))}
                            style={{ padding: '14px 16px', borderRadius: 8, border: `2px solid ${selectedNode.data.match_type === 'any' ? '#3b82f6' : 'var(--fb-border-card)'}`, background: selectedNode.data.match_type === 'any' ? 'rgba(59,130,246,0.08)' : 'var(--fb-bg-card)', cursor: 'pointer', transition: 'all 0.2s' }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fb-text-primary)', marginBottom: 4 }}>Any Match</div>
                            <div style={{ fontSize: 11, color: 'var(--fb-text-secondary)' }}>At least one rule below must be true.</div>
                          </div>
                        </div>
                      </div>

                      {/* System Field Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                              <Users size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>System Field</h3>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Rules based on subscriber profile data.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const conds = [...(selectedNode.data.system_conditions || []), { variable: '', operator: '' }];
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, system_conditions: conds } } : n));
                            }}
                            style={{ width: 28, height: 28, borderRadius: 6, background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}
                          >+</button>
                        </div>
                        {(selectedNode.data.system_conditions || [{ variable: '', operator: '', value: '' }]).map((cond: any, idx: number) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Variable</label>
                              <FbCustomSelect
                                value={cond.variable || ''}
                                onChange={(val) => {
                                  const conds = [...(selectedNode.data.system_conditions || [])];
                                  conds[idx] = { ...conds[idx], variable: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, system_conditions: conds } } : n));
                                }}
                                placeholder="Select Variable"
                                options={systemFields.length > 0 ? systemFields : [{ label: 'Loading...', value: '' }]}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Operator</label>
                              <FbCustomSelect
                                value={cond.operator || ''}
                                onChange={(val) => {
                                  const conds = [...(selectedNode.data.system_conditions || [])];
                                  conds[idx] = { ...conds[idx], operator: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, system_conditions: conds } } : n));
                                }}
                                placeholder="Select Operator"
                                options={[
                                  { label: 'Equals (=)', value: 'equals' },
                                  { label: 'Not Equals (≠)', value: 'not_equals' },
                                  { label: 'Contains', value: 'contains' },
                                  { label: 'Not Contains', value: 'not_contains' },
                                  { label: 'Start With', value: 'start_with' },
                                  { label: 'End With', value: 'end_with' },
                                  { label: 'Has Value (Is Set)', value: 'is_set' },
                                  { label: 'Is Not Set', value: 'is_not_set' },
                                  { label: 'Less Than (<)', value: 'less_than' },
                                  { label: 'Greater Than (>)', value: 'greater_than' },
                                  { label: 'Less Than or Equal (≤)', value: 'less_than_equal' },
                                  { label: 'Greater Than or Equal (≥)', value: 'greater_than_equal' }
                                ]}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Value</label>
                              <input
                                value={cond.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const conds = [...(selectedNode.data.system_conditions || [])];
                                  conds[idx] = { ...conds[idx], value: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, system_conditions: conds } } : n));
                                }}
                                placeholder="Value"
                                style={{ width: '100%', padding: '8px 10px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const conds = [...(selectedNode.data.system_conditions || [])];
                                conds.splice(idx, 1);
                                setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, system_conditions: conds } } : n));
                              }}
                              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(156,163,175,0.2)', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
                              title="Remove Condition"
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>−</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Field Card */}
                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                              <Database size={16} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Custom Field</h3>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Rules based on custom field values.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const conds = [...(selectedNode.data.custom_conditions || []), { variable: '', operator: '', value: '' }];
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_conditions: conds } } : n));
                            }}
                            style={{ width: 28, height: 28, borderRadius: 6, background: '#a855f7', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}
                          >+</button>
                        </div>
                        {(selectedNode.data.custom_conditions || [{ variable: '', operator: '', value: '' }]).map((cond: any, idx: number) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 12, alignItems: 'end' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Variable</label>
                              <FbCustomSelect
                                value={cond.variable || ''}
                                onChange={(val) => {
                                  const conds = [...(selectedNode.data.custom_conditions || [])];
                                  conds[idx] = { ...conds[idx], variable: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_conditions: conds } } : n));
                                }}
                                placeholder="Select Variable"
                                options={customFields.length > 0 ? customFields : [{ label: 'No Custom Fields yet', value: '' }]}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Operator</label>
                              <FbCustomSelect
                                value={cond.operator || ''}
                                onChange={(val) => {
                                  const conds = [...(selectedNode.data.custom_conditions || [])];
                                  conds[idx] = { ...conds[idx], operator: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_conditions: conds } } : n));
                                }}
                                placeholder="Select Operator"
                                options={[
                                  { label: 'Equals (=)', value: 'equals' },
                                  { label: 'Not Equals (≠)', value: 'not_equals' },
                                  { label: 'Contains', value: 'contains' },
                                  { label: 'Not Contains', value: 'not_contains' },
                                  { label: 'Start With', value: 'start_with' },
                                  { label: 'End With', value: 'end_with' },
                                  { label: 'Has Value', value: 'is_set' },
                                  { label: 'Less Than (<)', value: 'less_than' },
                                  { label: 'Greater Than (>)', value: 'greater_than' },
                                  { label: 'Less Than or Equal (≤)', value: 'less_than_equal' },
                                  { label: 'Greater Than or Equal (≥)', value: 'greater_than_equal' }
                                ]}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-secondary)', marginBottom: 4 }}>Value</label>
                              <input
                                value={cond.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const conds = [...(selectedNode.data.custom_conditions || [])];
                                  conds[idx] = { ...conds[idx], value: val };
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_conditions: conds } } : n));
                                }}
                                placeholder="Value"
                                style={{ width: '100%', padding: '8px 10px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-card)', borderRadius: 8, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const conds = [...(selectedNode.data.custom_conditions || [])];
                                conds.splice(idx, 1);
                                setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_conditions: conds } } : n));
                              }}
                              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(156,163,175,0.2)', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
                              title="Remove Condition"
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>−</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Label Assign node inputs */}
                {selectedNode.type === 'label_assign' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0, boxShadow: '0 4px 10px rgba(139,92,246,0.15)' }}>
                          <Tag size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Label Assign</h2>
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)', lineHeight: 1.4 }}>Assign a label to the subscriber when this step is reached.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Tag size={12} />
                          </div>
                          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Labels <span style={{ color: '#ef4444' }}>*</span></label>
                        </div>
                        <p style={{ margin: '0 0 16px 32px', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Choose which label to assign before the flow continues.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 32 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                             <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Add Label(s)</label>
                             <button
                                onClick={async () => {
                                  const newLabel = window.prompt("Enter new label name:");
                                  if (newLabel && newLabel.trim()) {
                                    try {
                                      const res = await whatsappAPI.createLabel(newLabel.trim());
                                      setAvailableLabels(prev => {
                                          if (prev.find(l => l.name === res.data.name)) return prev;
                                          return [...prev, res.data];
                                      });
                                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, assign_label: res.data.name } } : n));
                                    } catch (error) {
                                      console.error("Failed to create label:", error);
                                      alert("Failed to create label.");
                                    }
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                             >
                               <Plus size={14} /> New
                             </button>
                           </div>
                           <select
                              value={selectedNode.data.assign_label || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, assign_label: val } } : n));
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', appearance: 'auto' }}
                            >
                              <option value="">Select a label...</option>
                              {availableLabels.map(lbl => (
                                <option key={lbl.id} value={lbl.name}>{lbl.name}</option>
                              ))}
                            </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Random Number node inputs */}
                {selectedNode.type === 'random_number' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)' }}>
                    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                          <Hash size={24} />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Configure Random Number Generator</h2>
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--fb-text-secondary)', lineHeight: 1.4 }}>Generate a random value and save it to a custom field.</p>
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                            <Type size={12} />
                          </div>
                          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Character set <span style={{ color: '#ef4444' }}>*</span></label>
                        </div>
                        <p style={{ margin: '0 0 16px 32px', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Choose which character types to include in the generated value.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingLeft: 32 }}>
                          {Object.entries({
                            use_numbers: 'Use numbers',
                            use_upper: 'Use upper case letters',
                            use_lower: 'Use lower case letters',
                            use_special: 'Use special characters'
                          }).map(([key, label]) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fb-text-primary)', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={selectedNode.data[key] || false}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: val } } : n));
                                }}
                                style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid var(--fb-border-card)', cursor: 'pointer' }}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Ruler size={12} />
                          </div>
                          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Value length <span style={{ color: '#ef4444' }}>*</span></label>
                        </div>
                        <p style={{ margin: '0 0 16px 32px', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Minimum length is 1 character.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 32 }}>
                           <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-secondary)' }}>Length of random value</label>
                           <input
                              type="number"
                              min="1"
                              value={selectedNode.data.length || 5}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, length: val } } : n));
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                           />
                        </div>
                      </div>

                      <div style={{ background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Database size={12} />
                          </div>
                          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--fb-text-primary)' }}>Custom field <span style={{ color: '#ef4444' }}>*</span></label>
                        </div>
                        <p style={{ margin: '0 0 16px 32px', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Assign the generated value to a custom field.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 32 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                             <label style={{ fontSize: 12, color: 'var(--fb-text-secondary)' }}>Save to custom field</label>
                             <button
                                onClick={async () => {
                                  const newField = window.prompt("Enter new custom field name (e.g. tracking_code):");
                                  if (newField && newField.trim()) {
                                    try {
                                      const res = await whatsappAPI.createCustomField({ name: newField.trim() });
                                      setCustomFields(prev => {
                                          if (prev.find(f => f.value === res.data.field_key)) return prev;
                                          return [...prev, { label: res.data.name, value: res.data.field_key }];
                                      });
                                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_field: res.data.field_key } } : n));
                                    } catch (error) {
                                      console.error("Failed to create custom field:", error);
                                      alert("Failed to create custom field.");
                                    }
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                             >
                               <Plus size={14} /> Add new
                             </button>
                           </div>
                           <select
                              value={selectedNode.data.custom_field || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, custom_field: val } } : n));
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 13, boxSizing: 'border-box', appearance: 'auto' }}
                            >
                              <option value="">Select a field...</option>
                              {customFields.map(cf => (
                                <option key={cf.value} value={cf.value}>{cf.label}</option>
                              ))}
                            </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--fb-bg-card)', borderTop: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setSelectedNodeId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--fb-bg-card)', border: '1px solid var(--fb-border-main)', borderRadius: 6, color: 'var(--fb-text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <span style={{ fontSize: 14 }}>×</span> Close
                      </button>
                      <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                )}


                {/* Sequence Campaign node inputs */}
                {selectedNode.type === 'new_sequence_campaign' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 14 }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--fb-text-secondary)', lineHeight: 1.5 }}>
                        Effortlessly engage your audience with a Sequence Message Campaign. Set up a series of messages to be delivered at specific time intervals, ensuring timely and relevant communication. Whether it's delivering valuable content, nurturing leads, or guiding users through a process, this campaign type lets you create a seamless and automated journey that keeps your audience informed and engaged.
                      </p>
                    </div>

                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Settings size={14} color="#818cf8" />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Campaign details <span style={{ color: '#ef4444' }}>*</span></span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Give this sequence a name to identify it in your flow.</p>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Sequence Campaign Name</label>
                      <input
                        value={selectedNode.data.sequence_name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, sequence_name: val } } : n));
                        }}
                        placeholder="e.g. Marketing"
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#c084fc', fontSize: 14 }}>🕒</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Delivery schedule</span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Preferred delivery time and timezone for messages outside the 24-hour window.</p>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Preferred delivery time for messages scheduled outside the 24-hour window</label>
                        <select
                          value={selectedNode.data.delivery_time || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, delivery_time: val } } : n));
                          }}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        >
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hours = Math.floor(i / 2).toString().padStart(2, '0');
                            const mins = (i % 2 === 0) ? '00' : '30';
                            const time = `${hours}:${mins}`;
                            return <option key={time} value={time}>{time}</option>;
                          })}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Time Zone</label>
                        <select
                          value={selectedNode.data.timezone || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, timezone: val } } : n));
                          }}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                        >
                          <option value="Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                          <option value="UTC">(GMT+00:00) UTC</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#34d399', fontSize: 14 }}>↻</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Re-entry rules</span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Control when subscribers can enter this sequence again.</p>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={selectedNode.data.allow_reentry || false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, allow_reentry: val } } : n));
                          }}
                          style={{ marginTop: 2, cursor: 'pointer' }}
                        />
                        <label style={{ fontSize: 11, color: 'var(--fb-text-tertiary)', lineHeight: 1.5 }}>
                          Allow re-entry only after completion — subscribers won't be added again while the sequence is running. If triggered after completion, the sequence will restart from the beginning
                        </label>
                      </div>
                    </div>

                  </div>
                )}

                {/* Send Message After node inputs */}
                {selectedNode.type === 'send_message_after' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18 }}>✉️</span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14, color: 'var(--fb-text-primary)', fontWeight: 700 }}>Configure Sequence Message</h4>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--fb-text-secondary)' }}>Choose message type, schedule delivery, and configure template or conditions.</p>
                      </div>
                    </div>

                    {/* Info box */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 8, padding: '10px 14px', margin: '14px 0' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--fb-text-secondary)', lineHeight: 1.6 }}>
                        Customize sequences for campaign goals and choose preferred scheduling.
                      </p>
                    </div>

                    {/* Message type */}
                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700 }}>⇄</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Message type <span style={{ color: '#ef4444' }}>*</span></span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>Send a regular message inside 24h or a template message anytime.</p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div
                          onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, seq_message_type: 'regular' } } : n))}
                          style={{
                            flex: 1, padding: 12, borderRadius: 8, cursor: 'pointer', border: '2px solid',
                            borderColor: (!selectedNode.data.seq_message_type || selectedNode.data.seq_message_type === 'regular') ? '#3b82f6' : 'var(--fb-bg-card-header)',
                            background: (!selectedNode.data.seq_message_type || selectedNode.data.seq_message_type === 'regular') ? 'rgba(59, 130, 246, 0.07)' : 'var(--fb-bg-sidebar)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fb-text-primary)', marginBottom: 6 }}>Send Regular Message (Inside 24h)</div>
                          <div style={{ fontSize: 10, color: 'var(--fb-text-secondary)', lineHeight: 1.5 }}>Option 1 – Regular Message (24-Hour Window) Send a standard message to your subscriber, but it must be delivered within 24 hours of their last interaction. Best for quick follow-ups, reminders, or conversational replies.</div>
                        </div>
                        <div
                          onClick={() => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, seq_message_type: 'template' } } : n))}
                          style={{
                            flex: 1, padding: 12, borderRadius: 8, cursor: 'pointer', border: '2px solid',
                            borderColor: selectedNode.data.seq_message_type === 'template' ? '#3b82f6' : 'var(--fb-bg-card-header)',
                            background: selectedNode.data.seq_message_type === 'template' ? 'rgba(59, 130, 246, 0.07)' : 'var(--fb-bg-sidebar)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fb-text-primary)', marginBottom: 6 }}>Send Template Message (Anytime)</div>
                          <div style={{ fontSize: 10, color: 'var(--fb-text-secondary)', lineHeight: 1.5 }}>Option 2 – Template Message (Anytime) Send an approved template message at any time you want — minutes, hours, or even days later. Perfect for sequences, offers, updates, or re-engagement beyond the 24-hour window.</div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#c084fc', fontSize: 13 }}>🕒</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Schedule <span style={{ color: '#ef4444' }}>*</span></span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--fb-text-secondary)' }}>When this message should be sent after the previous step.</p>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--fb-text-tertiary)', marginBottom: 6 }}>Schedule Message After</label>
                      <select
                        value={selectedNode.data.seq_schedule || '5 mins'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, seq_schedule: val } } : n));
                        }}
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-card)', borderRadius: 6, color: 'var(--fb-text-primary)', fontSize: 12, boxSizing: 'border-box' }}
                      >
                        <option value="10 secs">10 secs</option>
                        <option value="1 min">1 min</option>
                        <option value="5 mins">5 mins</option>
                        <option value="10 mins">10 mins</option>
                        <option value="15 mins">15 mins</option>
                        <option value="30 mins">30 mins</option>
                        <option value="1 hour">1 hour</option>
                        <option value="2 hours">2 hours</option>
                        <option value="6 hours">6 hours</option>
                        <option value="12 hours">12 hours</option>
                        <option value="1 day">1 day</option>
                        <option value="2 days">2 days</option>
                        <option value="3 days">3 days</option>
                        <option value="7 days">7 days</option>
                      </select>
                    </div>

                    {/* Enable Condition */}
                    <div style={{ border: '1px solid var(--fb-border-card)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#818cf8', fontSize: 13 }}>⟐</span>
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--fb-text-primary)', fontWeight: 600 }}>Enable Condition <span style={{ fontSize: 10, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '2px 6px', borderRadius: 10, marginLeft: 4 }}>Optional</span></span>
                        </div>
                        <span style={{ color: 'var(--fb-text-secondary)', fontSize: 16 }}>⌄</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'var(--fb-text-secondary)', lineHeight: 1.5 }}>Add conditions to control when this sequence should be triggered based on user data.</p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ====== Inline Create Template Modal ====== */}
      {showTplModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--fb-bg-card)', borderRadius: 12, width: '90%', maxWidth: 860, maxHeight: '92vh', display: 'flex', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid var(--fb-border-main)' }}>
            {/* Left: Form */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fb-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--fb-text-primary)' }}>Message Template</h2>
                <button onClick={() => setShowTplModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fb-text-secondary)', fontSize: 20 }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>
                {/* Row 1: Name + Locale */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Template Name *</label>
                    <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Put a name to track it later" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Locale *</label>
                    <select value={tplLanguage} onChange={e => setTplLanguage(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                      <option value="en_US">English (US)</option>
                      <option value="ar">Arabic</option>
                      <option value="hi">Hindi</option>
                      <option value="es_ES">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Category + Header Type */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Template Category *</label>
                    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--fb-border-main)' }}>
                      {(['UTILITY', 'MARKETING', 'AUTHENTICATION'] as const).map(cat => (
                        <div key={cat} onClick={() => setTplCategory(cat)} style={{ flex: 1, textAlign: 'center', padding: '9px 0', fontSize: 12, cursor: 'pointer', background: tplCategory === cat ? '#3b82f6' : 'var(--fb-bg-main)', color: tplCategory === cat ? '#fff' : 'var(--fb-text-secondary)', fontWeight: tplCategory === cat ? 600 : 400, borderRight: '1px solid var(--fb-border-main)' }}>
                          {cat === 'AUTHENTICATION' ? 'Auth/OTP' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Header Type *</label>
                    <select value={tplHeaderType} onChange={e => setTplHeaderType(e.target.value as any)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                      <option value="NONE">No Header</option>
                      <option value="TEXT">Text Header</option>
                      <option value="IMAGE">Image Media</option>
                      <option value="VIDEO">Video Media</option>
                      <option value="DOCUMENT">Document Media</option>
                    </select>
                    {tplHeaderType === 'TEXT' && (
                      <input value={tplHeaderText} onChange={e => setTplHeaderText(e.target.value)} placeholder="Enter header text..." style={{ width: '100%', marginTop: 8, padding: '9px 12px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Message Body (1024) *</label>
                  <div style={{ border: '1px solid var(--fb-border-main)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', background: 'var(--fb-bg-sidebar)', borderBottom: '1px solid var(--fb-border-main)' }}>
                      <button style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--fb-border-main)', color: 'var(--fb-text-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>⚙️ Custom Fields ▼</button>
                      <button onClick={() => setTplBody(prev => prev + '{{1}}')} style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--fb-border-main)', color: 'var(--fb-text-secondary)', fontSize: 12, cursor: 'pointer' }}>⌨️ Variables ▼</button>
                      <button onClick={() => setTplBody(prev => prev + '{{first_name}}')} style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--fb-border-main)', color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>👤 First Name</button>
                      <button onClick={() => setTplBody(prev => prev + '{{last_name}}')} style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--fb-border-main)', color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>👤 Last Name</button>
                      <button style={{ padding: '7px 12px', background: 'transparent', border: 'none', color: '#10b981', fontSize: 12, cursor: 'pointer' }}>🤖 AI Re-write</button>
                    </div>
                    <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} placeholder="Type # for custom fields and name, # for variables" style={{ width: '100%', height: 120, padding: 14, border: 'none', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ textAlign: 'right', padding: '4px 12px', fontSize: 11, color: 'var(--fb-text-tertiary)', borderTop: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)' }}>{tplBody.length}/1024</div>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Footer Text</label>
                  <input value={tplFooter} onChange={e => setTplFooter(e.target.value)} placeholder="Provide text for footer (60)" maxLength={60} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Buttons */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fb-text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Buttons</label>
                  {tplButtons.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {tplButtons.map((b, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-main)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--fb-text-primary)' }}>
                          <span>{b.type}: <strong>{b.text}</strong>{b.url ? ` → ${b.url}` : ''}{b.phone ? ` → ${b.phone}` : ''}</span>
                          <button onClick={() => setTplButtons(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: 'var(--fb-bg-sidebar)', border: '1px solid var(--fb-border-main)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--fb-text-primary)', marginBottom: 8, fontWeight: 500 }}>Quick reply buttons</div>
                    <div
                      onClick={() => { if (tplBtnType !== 'QUICK_REPLY') setTplBtnType('QUICK_REPLY'); else setTplBtnType('NONE'); }}
                      style={{ padding: '7px 14px', background: 'var(--fb-bg-main)', border: `1px solid ${tplBtnType === 'QUICK_REPLY' ? '#3b82f6' : 'var(--fb-border-main)'}`, borderRadius: 5, fontSize: 12, cursor: 'pointer', marginBottom: 10, color: tplBtnType === 'QUICK_REPLY' ? '#3b82f6' : 'var(--fb-text-primary)' }}
                    >Custom</div>
                    <div style={{ fontSize: 12, color: 'var(--fb-text-primary)', marginBottom: 8, fontWeight: 500 }}>Call to action buttons</div>
                    <div
                      onClick={() => { if (tplBtnType !== 'URL') setTplBtnType('URL'); else setTplBtnType('NONE'); }}
                      style={{ padding: '7px 14px', background: 'var(--fb-bg-main)', border: `1px solid ${tplBtnType === 'URL' ? '#3b82f6' : 'var(--fb-border-main)'}`, borderRadius: 5, fontSize: 12, cursor: 'pointer', marginBottom: 4, color: tplBtnType === 'URL' ? '#3b82f6' : 'var(--fb-text-primary)', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>Visit website</span><span style={{ color: 'var(--fb-text-tertiary)' }}>2 buttons maximum</span>
                    </div>
                    <div
                      onClick={() => { if (tplBtnType !== 'PHONE_NUMBER') setTplBtnType('PHONE_NUMBER'); else setTplBtnType('NONE'); }}
                      style={{ padding: '7px 14px', background: 'var(--fb-bg-main)', border: `1px solid ${tplBtnType === 'PHONE_NUMBER' ? '#3b82f6' : 'var(--fb-border-main)'}`, borderRadius: 5, fontSize: 12, cursor: 'pointer', marginBottom: 4, color: tplBtnType === 'PHONE_NUMBER' ? '#3b82f6' : 'var(--fb-text-primary)', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>Call phone number</span><span style={{ color: 'var(--fb-text-tertiary)' }}>1 button maximum</span>
                    </div>
                    {(tplBtnType === 'QUICK_REPLY' || tplBtnType === 'URL' || tplBtnType === 'PHONE_NUMBER') && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <input value={tplBtnText} onChange={e => setTplBtnText(e.target.value)} placeholder="Button Text" style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 5, fontSize: 12, outline: 'none' }} />
                        {tplBtnType === 'URL' && <input value={tplBtnUrl} onChange={e => setTplBtnUrl(e.target.value)} placeholder="https://example.com" style={{ flex: 2, padding: '8px 10px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 5, fontSize: 12, outline: 'none' }} />}
                        {tplBtnType === 'PHONE_NUMBER' && <input value={tplBtnUrl} onChange={e => setTplBtnUrl(e.target.value)} placeholder="+1234567890" style={{ flex: 2, padding: '8px 10px', border: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-main)', color: 'var(--fb-text-primary)', borderRadius: 5, fontSize: 12, outline: 'none' }} />}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!tplBtnText.trim()) return;
                        const btn: any = { type: tplBtnType, text: tplBtnText };
                        if (tplBtnType === 'URL') btn.url = tplBtnUrl;
                        if (tplBtnType === 'PHONE_NUMBER') btn.phone = tplBtnUrl;
                        setTplButtons(prev => [...prev, btn]);
                        setTplBtnText(''); setTplBtnUrl('');
                      }}
                      style={{ marginTop: 10, padding: '7px 16px', background: 'var(--fb-bg-main)', border: '1px solid var(--fb-border-main)', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: 'var(--fb-text-secondary)' }}
                    >+ Add button</button>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--fb-border-main)', background: 'var(--fb-bg-sidebar)' }}>
                <button
                  disabled={tplCreating}
                  onClick={async () => {
                    if (!tplName.trim() || !tplBody.trim()) { alert('Template name and body are required'); return; }
                    setTplCreating(true);
                    try {
                      const components: any[] = [];
                      if (tplHeaderType !== 'NONE') {
                        const hc: any = { type: 'HEADER', format: tplHeaderType };
                        if (tplHeaderType === 'TEXT' && tplHeaderText) hc.text = tplHeaderText;
                        components.push(hc);
                      }
                      components.push({ type: 'BODY', text: tplBody });
                      if (tplFooter.trim()) components.push({ type: 'FOOTER', text: tplFooter });
                      if (tplButtons.length > 0) {
                        components.push({
                          type: 'BUTTONS', buttons: tplButtons.map(b => {
                            const btn: any = { type: b.type, text: b.text };
                            if (b.url) btn.url = b.url;
                            if (b.phone) btn.phone_number = b.phone;
                            return btn;
                          })
                        });
                      }
                      const res = await whatsappAPI.createTemplate({ name: tplName, language: tplLanguage, category: tplCategory, components });
                      if (res.data.success) {
                        alert('✅ Template created successfully!');
                        setShowTplModal(false);
                        fetchTemplatesAndSequences();
                      }
                    } catch (err: any) {
                      const msg = err.response?.data?.error || 'Failed to create template';
                      alert(`❌ Error: ${msg}`);
                    } finally {
                      setTplCreating(false);
                    }
                  }}
                  style={{ padding: '9px 24px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: tplCreating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  💾 {tplCreating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Right: Phone Preview */}
            <div style={{ width: 260, background: 'var(--fb-bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, borderLeft: '1px solid var(--fb-border-main)' }}>
              <div style={{ width: 200, background: '#fff', borderRadius: 28, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '6px solid #1f2937' }}>
                <div style={{ background: '#075e54', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>B</div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Business</div>
                </div>
                <div style={{ background: '#ece5dd', minHeight: 180, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ background: '#fff', borderRadius: '0 8px 8px 8px', padding: 10, maxWidth: '90%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {tplHeaderText && <div style={{ fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 4 }}>{tplHeaderText}</div>}
                    <div style={{ fontSize: 11, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{tplBody || 'Enter message body'}</div>
                    {tplFooter && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{tplFooter}</div>}
                    {tplButtons.map((b, i) => (
                      <div key={i} style={{ marginTop: 4, padding: '4px 8px', background: '#f0f9ff', borderRadius: 4, fontSize: 10, color: '#3b82f6', textAlign: 'center', border: '1px solid #bfdbfe' }}>{b.text}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlowBuilder;
