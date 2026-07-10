import React, { useState, useEffect } from 'react';
import type { WhatsAppTemplate } from '../types';
import { whatsappAPI } from '../api';
import { useNavigate } from 'react-router-dom';

const TemplateManager: React.FC = () => {
  const navigate = useNavigate();
  // ============ State Management ============
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  // Create template form
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('MARKETING');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [parameterFormat, setParameterFormat] = useState<'NAMED' | 'POSITIONAL'>('POSITIONAL');

  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerVariables, setHeaderVariables] = useState<Array<{ name: string; example: string }>>([]);

  // Body
  const [templateBody, setTemplateBody] = useState('');
  const [bodyVariables, setBodyVariables] = useState<Array<{ name: string; example: string }>>([]);

  // Footer
  const [templateFooter, setTemplateFooter] = useState('');

  // Buttons
  const [buttons, setButtons] = useState<Array<any>>([]);
  const [showButtonDropdown, setShowButtonDropdown] = useState(false);
  const [openUrlVarsIndex, setOpenUrlVarsIndex] = useState<number | null>(null);

  const [creating, setCreating] = useState(false);

  // ============ Effects ============
  useEffect(() => {
    fetchTemplates();
  }, []);

  // ============ API Methods ============
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await whatsappAPI.fetchTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates', err);
      alert('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const syncTemplates = async () => {
    try {
      const res = await whatsappAPI.syncTemplates();
      if (res.data.success) {
        await fetchTemplates();
        alert(`✅ Successfully synchronized ${res.data.count} templates from Meta!`);
      }
    } catch (err) {
      console.error('Sync failed', err);
      alert('Failed to sync templates from Meta');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      alert('Template name and body are required.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(templateName.trim())) {
      alert('Template name can only contain lowercase letters, numbers, and underscores.');
      return;
    }
    const trimmedBody = templateBody.trim();
    if (trimmedBody.startsWith('{{') || trimmedBody.endsWith('}}')) {
      alert('❌ Meta does not allow variables at the very beginning or end of the message body.\n\nExample: "Hello {{name}}, how are you?"');
      return;
    }
    if (/\}\}\s*\{\{/.test(trimmedBody)) {
      alert('❌ Meta does not allow consecutive variables without text between them.\n\nInvalid: hello {{1}}{{2}} world\nValid: hello {{1}}, your order {{2}} is ready.');
      return;
    }
    if (headerType === 'TEXT' && !headerText.trim()) {
      alert('Header text is required when Header Type is Text.');
      return;
    }

    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && !headerFile) {
      alert('Media file is required for this header type.');
      return;
    }

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

      const payload = {
        name: templateName,
        language: templateLanguage,
        category: templateCategory,
        components: buildComponents(headerHandle),
      };

      const res = await whatsappAPI.createTemplate(payload);
      if (res.data.success) {
        alert('✅ Template created successfully!');
        resetForm();
        setShowCreateModal(false);
        await fetchTemplates();
      }
    } catch (err: any) {
      console.error('Create template failed', err);
      const errMsg = err.response?.data?.error || 'Failed to create template';
      alert(`❌ Error: ${errMsg}`);
    } finally {
      setCreating(false);
    }
  };

  const buildComponents = (headerHandle: string | null = null) => {
    const components: any[] = [];

    // Header component
    if (headerType !== 'NONE') {
      const headerComponent: any = {
        type: 'HEADER',
        format: headerType,
      };

      if (headerType === 'TEXT' && headerText.trim()) {
        headerComponent.text = headerText;
        if (headerVariables.length > 0) {
          headerComponent.example = {
            [parameterFormat === 'NAMED' ? 'header_text_named_params' : 'header_text']:
              parameterFormat === 'NAMED'
                ? headerVariables.map(v => ({ param_name: v.name, example: v.example }))
                : headerVariables.map(v => v.example)
          };
        }
      }

      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerHandle) {
        headerComponent.example = {
          header_handle: [headerHandle]
        };
      }

      components.push(headerComponent);
    }

    let finalBodyText = templateBody;
    const bodyTextExamples: string[] = [];
    let counter = 1;
    let matchIndex = 0;

    finalBodyText = finalBodyText.replace(/\{\{([^}]+)\}\}/g, () => {
      const v = bodyVariables[matchIndex];
      bodyTextExamples.push(v && v.example ? v.example : 'sample');
      matchIndex++;
      return `{{${counter++}}}`;
    });

    const bodyComponent: any = {
      type: 'BODY',
      text: finalBodyText,
    };

    if (bodyTextExamples.length > 0) {
      bodyComponent.example = {
        body_text: [bodyTextExamples]
      };
    }

    components.push(bodyComponent);

    // Footer component
    if (templateFooter.trim()) {
      components.push({
        type: 'FOOTER',
        text: templateFooter,
      });
    }

    // Buttons component
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
      components.push({
        type: 'BUTTONS',
        buttons: cleanButtons,
      });
    }

    return components;
  };

  const handleDeleteTemplate = async (templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) return;
    try {
      await whatsappAPI.deleteTemplate(templateName);
      alert('✅ Template deleted successfully!');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Delete failed', err);
      const errMsg = err.response?.data?.error || 'Failed to delete template';
      alert(`❌ Delete Error: ${errMsg}`);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateCategory('MARKETING');
    setTemplateLanguage('en_US');
    setParameterFormat('POSITIONAL');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderFile(null);
    setHeaderVariables([]);
    setTemplateBody('');
    setBodyVariables([]);
    setTemplateFooter('');
    setButtons([]);
    setShowButtonDropdown(false);
    setOpenUrlVarsIndex(null);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Variables functions unused.

  // ============ Render ============
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 120px)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Column 1: Bots List */}
      <div style={{ width: 260, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-color)' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Bots</h2>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 14 }}>🔍</span>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>WhatsApp Business Account</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+1 (555) 123-4567</div>
          </div>
        </div>
      </div>

      {/* Column 2: Bot Menu */}
      <div style={{ width: 220, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WhatsApp Business Account</div>
        </div>
        <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Bot Reply', active: false, desc: 'Change Settings', path: '/bot-reply' },
            { label: 'Chat Widget', active: false, desc: 'Change Settings', path: '' },
            { label: 'Sequence', active: false, desc: 'Change Settings', path: '' },
            { label: 'Input Flow', active: false, desc: 'Change Settings', path: '' },
            { label: 'Message Template', active: true, desc: 'Change Settings', path: '/templates' },
            { label: 'WC/Shopify Automation', active: false, desc: 'Change Settings', path: '' },
            { label: 'Out-bound Webhook', active: false, desc: 'Change Settings', path: '' },
            { label: 'Action Buttons', active: false, desc: 'Change Settings', path: '' },
            { label: 'Configuration', active: false, desc: 'Change Settings', path: '' },
          ].map(item => (
            <div 
              key={item.label}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: item.active ? 'var(--surface-color)' : 'transparent',
                border: item.active ? '1px solid var(--border-color)' : '1px solid transparent',
                borderBottom: item.active ? '2px solid #10b981' : '1px solid transparent',
                cursor: item.path ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}
            >
              <div style={{ color: item.active ? '#10b981' : 'var(--text-secondary)', marginTop: 2, fontSize: 16 }}>
                ⚙️
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

      {/* Column 3: Main Content (Template Manager) */}
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--surface-color)' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Message Template Settings
            </h1>
          </div>
          <button style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            Options <span>▼</span>
          </button>
        </div>

        {/* Success Banner (Mocked like screenshot) */}
        <div style={{ background: '#10b981', color: '#fff', padding: '16px 20px', borderRadius: 8, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Successful</div>
          <div style={{ fontSize: 13 }}>Message templates status have been synchronized successfully.</div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 14 }}>🔍</span>
            <input
              placeholder="Search..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={syncTemplates} style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 6, color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
            ✓ Check Status
          </button>
          <button style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
            + Create Default
          </button>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid #3b82f6', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}
          >
            + Create
          </button>
        </div>

        {/* Table Container */}
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 160px 120px 160px', padding: '12px 16px', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>#</div>
            <div>Template Name</div>
            <div>Type</div>
            <div>Status</div>
            <div style={{ textAlign: 'center' }}>Actions</div>
            <div>Updated at</div>
          </div>

          {/* Table Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>No templates found.</div>
            ) : (
              templates.map((template, idx) => (
                <div
                  key={template.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 120px 160px 120px 160px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{template.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({template.data?.category || 'Custom'})</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{template.data?.components?.find((c: any) => c.type === 'BODY')?.type.toLowerCase() || 'text'}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: template.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}></span>
                    <span style={{ fontSize: 12, color: template.status === 'APPROVED' ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                      {template.status === 'APPROVED' ? 'Approved' : template.status || 'Pending'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setSelectedTemplate(template)} style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👁️</button>
                    <button onClick={() => handleDeleteTemplate(template.name)} style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {(template as any).updated_at ? new Date((template as any).updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Unknown'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Footer */}
          {!loading && templates.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--surface-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Show</span>
                <select style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: 4 }}>
                  <option>10</option>
                  <option>25</option>
                </select>
                <span>entries</span>
              </div>
              <span>Showing 1 to {templates.length} of {templates.length} entries</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ padding: '4px 10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>Previous</button>
                <button style={{ padding: '4px 10px', border: 'none', background: '#3b82f6', borderRadius: 4, color: '#fff', fontSize: 11, cursor: 'pointer' }}>1</button>
                <button style={{ padding: '4px 10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Create Modal - Redesigned to match screenshot */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Message Template</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Template Name *</label>
                  <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Put a name to track it later" style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Locale *</label>
                  <select value={templateLanguage} onChange={(e) => setTemplateLanguage(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Spanish</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Template Category *</label>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {['UTILITY', 'MARKETING', 'AUTHENTICATION'].map(cat => (
                      <div key={cat} onClick={() => setTemplateCategory(cat)} style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 13, cursor: 'pointer', background: templateCategory === cat ? '#3b82f6' : 'var(--bg-color)', color: templateCategory === cat ? '#fff' : 'var(--text-secondary)', fontWeight: templateCategory === cat ? 600 : 400, borderRight: '1px solid var(--border-color)' }}>
                        {cat === 'AUTHENTICATION' ? 'Auth/OTP' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Header Type *</label>
                  <select value={headerType} onChange={(e) => setHeaderType(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}>
                    <option value="NONE">No Header</option>
                    <option value="TEXT">Text Header</option>
                    <option value="IMAGE">Image Media</option>
                    <option value="VIDEO">Video Media</option>
                    <option value="DOCUMENT">Document Media</option>
                  </select>
                  {headerType === 'TEXT' && (
                    <input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Enter header text..." style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                  )}
                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                    <input type="file" onChange={e => setHeaderFile(e.target.files ? e.target.files[0] : null)} style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} accept={headerType === 'IMAGE' ? 'image/*' : headerType === 'VIDEO' ? 'video/*' : '*/*'} />
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Message Body (1024) *</label>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>⚙️ Custom Fields ▼</button>
                    <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setTemplateBody(prev => prev + '{{1}}')}>⌨️ Variables ▼</button>
                    <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setTemplateBody(prev => prev + '{{name}}')}>👤 Name</button>
                  </div>
                  <textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} style={{ width: '100%', height: 120, padding: 16, background: 'var(--surface-color)', border: 'none', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'none' }} />
                </div>
                {/* Dynamically show inputs for body variables if they exist in the text */}
                {(templateBody.match(/\{\{([^}]+)\}\}/g) || []).map((match, idx) => {
                  const paramName = match.replace(/[{}]/g, '');
                  return (
                    <div key={idx} style={{ marginTop: 8 }}>
                      <input type="text" placeholder={`Example for ${paramName}`} value={bodyVariables[idx]?.example || ''} onChange={(e) => {
                        const newVars = [...bodyVariables];
                        newVars[idx] = { name: paramName, example: e.target.value };
                        setBodyVariables(newVars);
                      }} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  );
                })}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Footer Text</label>
                <input type="text" value={templateFooter} onChange={(e) => setTemplateFooter(e.target.value)} placeholder="Provide text for footer (60)" style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Buttons</label>
                <div style={{ position: 'relative', width: 'fit-content' }}>
                  <button type="button" onClick={() => setShowButtonDropdown(!showButtonDropdown)} style={{ padding: '8px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    + Add button
                  </button>
                  {showButtonDropdown && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowButtonDropdown(false)} />
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, width: 240, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, padding: 8, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '4px 8px' }}>Quick reply buttons</div>
                        <button type="button" onClick={() => { setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]); setShowButtonDropdown(false); }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Custom</button>
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
                              <button type="button" disabled={urlDisabled} onClick={() => { if (!urlDisabled) { setButtons([...buttons, { type: 'URL', text: '', url: '', urlType: 'Static' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: urlDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: urlDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: urlDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!urlDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <span>Visit website</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>2 buttons maximum</span>
                              </button>
                              <button type="button" disabled={phoneDisabled} onClick={() => { if (!phoneDisabled) { setButtons([...buttons, { type: 'PHONE_NUMBER', text: '', countryCode: '+91', phone_number: '' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: phoneDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: phoneDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: phoneDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!phoneDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <span>Call phone number</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>1 button maximum</span>
                              </button>
                              <button type="button" disabled={copyDisabled} onClick={() => { if (!copyDisabled) { setButtons([...buttons, { type: 'COPY_CODE', text: 'Copy Code', example: '' }]); setShowButtonDropdown(false); } }} style={{ padding: '8px', background: 'transparent', border: 'none', textAlign: 'left', color: copyDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: 12, cursor: copyDisabled ? 'not-allowed' : 'pointer', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: copyDisabled ? 0.5 : 1 }} onMouseEnter={e => { if (!copyDisabled) e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                        <button type="button" onClick={() => removeButton(i)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                          {b.type === 'QUICK_REPLY' ? 'Quick Reply • Optional' : b.type === 'URL' ? 'Call to Action • Visit Website' : b.type === 'PHONE_NUMBER' ? 'Call to Action • Phone Number' : 'Call to Action • Copy Code'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Type of Action</label>
                            <input disabled value={b.type === 'QUICK_REPLY' ? 'Custom' : b.type === 'URL' ? 'Visit website' : b.type === 'PHONE_NUMBER' ? 'Call phone number' : 'Copy offer code'} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Button Text</label>
                            <input value={b.text} onChange={e => { const nb = [...buttons]; nb[i].text = e.target.value; setButtons(nb); }} placeholder="Button Text" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                          {b.type === 'URL' && (
                            <>
                              <div>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL Type</label>
                                <select value={b.urlType || 'Static'} onChange={e => { const nb = [...buttons]; nb[i].urlType = e.target.value; setButtons(nb); }} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                                  <option value="Static">Static</option>
                                  <option value="Dynamic">Dynamic</option>
                                </select>
                              </div>
                              <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>Website URL</span>
                                  {b.urlType === 'Dynamic' && (
                                    <span style={{ color: '#3b82f6', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => setOpenUrlVarsIndex(openUrlVarsIndex === i ? null : i)}>
                                      ⌨️ Variables ▼
                                    </span>
                                  )}
                                </label>
                                <input value={b.url} onChange={e => { const nb = [...buttons]; nb[i].url = e.target.value; setButtons(nb); }} placeholder={b.urlType === 'Dynamic' ? 'https://example.com/{{1}}' : 'https://example.com'} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                                {openUrlVarsIndex === i && (
                                  <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpenUrlVarsIndex(null)} />
                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 160, background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 300, padding: 6 }}>
                                      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                                        <button type="button" onClick={() => { const nb = [...buttons]; nb[i].url = (nb[i].url || '') + '{{1}}'; setButtons(nb); setOpenUrlVarsIndex(null); }} style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', textAlign: 'left', color: '#8b5cf6', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>{'+ Insert {{1}}'}</button>
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
                                <select value={b.countryCode || '+91'} onChange={e => { const nb = [...buttons]; nb[i].countryCode = e.target.value; setButtons(nb); }} style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}>
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
                                <input value={b.phone_number} onChange={e => { const nb = [...buttons]; nb[i].phone_number = e.target.value; setButtons(nb); }} placeholder="Phone Number" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                            </>
                          )}
                          {b.type === 'COPY_CODE' && (
                            <div style={{ gridColumn: '1 / span 2' }}>
                              <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Offer Code</label>
                              <input value={b.example} onChange={e => { const nb = [...buttons]; nb[i].example = e.target.value; setButtons(nb); }} placeholder="e.g. 25OFF" style={{ width: '100%', padding: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
              <button onClick={handleCreateTemplate} disabled={creating} style={{ padding: '10px 24px', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Detail Drawer (Simplified for space) */}
      {selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedTemplate(null)}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 12, width: '100%', maxWidth: '600px', maxHeight: '80vh', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{selectedTemplate.name}</h2>
              <button onClick={() => setSelectedTemplate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>
            
            {selectedTemplate.status === 'REJECTED' && (selectedTemplate.data?.rejected_reason || selectedTemplate.data?.reason) && (
              <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                <strong>Rejection Reason: </strong> {selectedTemplate.data.rejected_reason || selectedTemplate.data.reason}
              </div>
            )}

            <pre style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-color)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}>
              {JSON.stringify(selectedTemplate, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
