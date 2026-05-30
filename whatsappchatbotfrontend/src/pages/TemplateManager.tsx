import React, { useState, useEffect } from 'react';
import type { WhatsAppTemplate } from '../types';
import { whatsappAPI } from '../api';

const TemplateManager: React.FC = () => {
  // ============ State Management ============
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  // Create template form
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('MARKETING');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [parameterFormat, setParameterFormat] = useState<'NAMED' | 'POSITIONAL'>('POSITIONAL');
  
  // Header
  const [headerType, setHeaderType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'>('TEXT');
  const [headerText, setHeaderText] = useState('');
  const [headerVariables, setHeaderVariables] = useState<Array<{ name: string; example: string }>>([]);
  
  // Body
  const [templateBody, setTemplateBody] = useState('');
  const [bodyVariables, setBodyVariables] = useState<Array<{ name: string; example: string }>>([]);
  
  // Footer
  const [templateFooter, setTemplateFooter] = useState('');
  
  // Buttons
  const [buttons, setButtons] = useState<Array<any>>([]);
  const [buttonType, setButtonType] = useState<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE'>('QUICK_REPLY');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonPhone, setButtonPhone] = useState('');
  const [buttonCopyCode, setButtonCopyCode] = useState('');
  
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
      alert('Template name and body are required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: templateName,
        language: templateLanguage,
        category: templateCategory,
        components: buildComponents(),
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

  const buildComponents = () => {
    const components = [];

    // Header component
    if (headerText.trim() || headerType !== 'TEXT') {
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

      if ((headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && headerVariables.length > 0) {
        headerComponent.example = {
          header_handle: [headerVariables[0]?.example || '']
        };
      }

      components.push(headerComponent);
    }

    // Body component (required)
    const bodyComponent: any = {
      type: 'BODY',
      text: templateBody,
    };

    if (bodyVariables.length > 0) {
      bodyComponent.example = {
        [parameterFormat === 'NAMED' ? 'body_text_named_params' : 'body_text']:
          parameterFormat === 'NAMED'
            ? bodyVariables.map(v => ({ param_name: v.name, example: v.example }))
            : [bodyVariables.map(v => v.example)]
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
      components.push({
        type: 'BUTTONS',
        buttons: buttons,
      });
    }

    return components;
  };

  const handleDeleteTemplate = async (templateName: string) => {
    try {
      await whatsappAPI.deleteTemplate(templateName);
      alert('✅ Template deleted successfully!');
      setShowDeleteConfirm(null);
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
    setHeaderType('TEXT');
    setHeaderText('');
    setHeaderVariables([]);
    setTemplateBody('');
    setBodyVariables([]);
    setTemplateFooter('');
    setButtons([]);
    setButtonType('QUICK_REPLY');
    setButtonText('');
    setButtonUrl('');
    setButtonPhone('');
    setButtonCopyCode('');
  };

  const addButton = () => {
    const newButton: any = {
      type: buttonType,
      text: buttonText,
    };

    if (buttonType === 'URL' && buttonUrl) {
      newButton.url = buttonUrl;
    }
    if (buttonType === 'PHONE_NUMBER' && buttonPhone) {
      newButton.phone_number = buttonPhone;
    }
    if (buttonType === 'COPY_CODE' && buttonCopyCode) {
      newButton.example = buttonCopyCode;
    }

    if (buttonText || (buttonType === 'COPY_CODE' && buttonCopyCode)) {
      setButtons([...buttons, newButton]);
      setButtonText('');
      setButtonUrl('');
      setButtonPhone('');
      setButtonCopyCode('');
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const addHeaderVariable = () => {
    setHeaderVariables([...headerVariables, { name: '', example: '' }]);
  };

  const updateHeaderVariable = (index: number, field: 'name' | 'example', value: string) => {
    const updated = [...headerVariables];
    updated[index][field] = value;
    setHeaderVariables(updated);
  };

  const removeHeaderVariable = (index: number) => {
    setHeaderVariables(headerVariables.filter((_, i) => i !== index));
  };

  const addBodyVariable = () => {
    setBodyVariables([...bodyVariables, { name: '', example: '' }]);
  };

  const updateBodyVariable = (index: number, field: 'name' | 'example', value: string) => {
    const updated = [...bodyVariables];
    updated[index][field] = value;
    setBodyVariables(updated);
  };

  const removeBodyVariable = (index: number) => {
    setBodyVariables(bodyVariables.filter((_, i) => i !== index));
  };

  // ============ Render ============
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b141a',
        padding: '24px',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>
          WhatsApp Templates
        </h1>
        <p style={{ color: '#999', margin: '0', fontSize: '14px' }}>
          Create, manage, and sync your WhatsApp message templates
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          style={{
            background: '#53bdeb',
            border: 'none',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ➕ Create New Template
        </button>
        <button
          onClick={syncTemplates}
          style={{
            background: 'rgba(83, 189, 235, 0.1)',
            border: '1px solid #53bdeb',
            color: '#53bdeb',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          🔄 Sync from Meta
        </button>
      </div>

      {/* Templates List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {loading ? (
          <div style={{ color: '#999', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div style={{ color: '#999', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            <p>No templates yet</p>
            <p style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
              Create one or sync from Meta WhatsApp Business Account
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(83, 189, 235, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              {/* Template Name */}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '8px',
                  wordBreak: 'break-word',
                }}
              >
                {template.name}
              </div>

              {/* Template Meta */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(83, 189, 235, 0.1)',
                    color: '#53bdeb',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  📋 {template.language || 'en_US'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    background:
                      template.status === 'APPROVED'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    color: template.status === 'APPROVED' ? '#10b981' : '#f59e0b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {template.status || 'PENDING'}
                </span>
                {template.data?.category && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#a78bfa',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    🏷️ {template.data.category}
                  </span>
                )}
              </div>

              {/* Template Preview */}
              {template.data?.components && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#bbb',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    maxHeight: '80px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {template.data.components
                    .filter((c: any) => c.type === 'body')
                    .map((c: any) => c.text)
                    .join('\n') || 'No body text'}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button
                  onClick={() => {
                    const templatePreview = JSON.stringify(template.data, null, 2);
                    navigator.clipboard.writeText(templatePreview);
                    alert('Template data copied to clipboard!');
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(83, 189, 235, 0.1)',
                    border: '1px solid rgba(83, 189, 235, 0.3)',
                    color: '#53bdeb',
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  📋 Copy JSON
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(template.name)}
                  style={{
                    flex: 1,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
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
              background: '#1a2332',
              border: '1px solid rgba(83, 189, 235, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginTop: 0 }}>
              Create New Template
            </h2>

            <form onSubmit={handleCreateTemplate} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Template Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., welcome_message"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Language, Category & Parameter Format */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>
                    Language
                  </label>
                  <select
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Spanish</option>
                    <option value="fr_FR">French</option>
                    <option value="de_DE">German</option>
                    <option value="pt_BR">Portuguese</option>
                    <option value="hi_IN">Hindi</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>
                    Parameter Format
                  </label>
                  <select
                    value={parameterFormat}
                    onChange={(e) => setParameterFormat(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="POSITIONAL">Positional (numbered)</option>
                    <option value="NAMED">Named (by variable name)</option>
                  </select>
                </div>
              </div>

              {/* ===== HEADER ===== */}
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <h4 style={{ color: '#a78bfa', margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600' }}>📌 HEADER (Optional)</h4>
                
                <select
                  value={headerType}
                  onChange={(e) => setHeaderType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    fontSize: '12px',
                    marginBottom: '10px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="TEXT">📝 Text Header</option>
                  <option value="IMAGE">🖼️ Image Header</option>
                  <option value="VIDEO">🎥 Video Header</option>
                  <option value="DOCUMENT">📄 Document Header</option>
                  <option value="LOCATION">📍 Location Header</option>
                </select>

                {headerType === 'TEXT' && (
                  <>
                    <input
                      type="text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="Header text (max 60 chars)"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '12px',
                        marginBottom: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {headerVariables.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        {headerVariables.map((v, i) => (
                          <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateHeaderVariable(i, 'name', e.target.value)}
                              placeholder={parameterFormat === 'NAMED' ? 'Param name' : 'Value'}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#ffffff',
                                fontSize: '11px',
                                boxSizing: 'border-box',
                              }}
                            />
                            <input
                              type="text"
                              value={v.example}
                              onChange={(e) => updateHeaderVariable(i, 'example', e.target.value)}
                              placeholder="Example"
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#ffffff',
                                fontSize: '11px',
                                boxSizing: 'border-box',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeHeaderVariable(i)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: 'none',
                                color: '#f87171',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {headerText.includes('{{') && (
                      <button
                        type="button"
                        onClick={addHeaderVariable}
                        style={{
                          width: '100%',
                          background: 'rgba(83, 189, 235, 0.1)',
                          border: '1px solid rgba(83, 189, 235, 0.3)',
                          color: '#53bdeb',
                          padding: '6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        + Add Variable
                      </button>
                    )}
                  </>
                )}

                {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                  <input
                    type="text"
                    value={headerVariables[0]?.example || ''}
                    onChange={(e) => {
                      if (headerVariables[0]) {
                        updateHeaderVariable(0, 'example', e.target.value);
                      } else {
                        addHeaderVariable();
                        setTimeout(() => updateHeaderVariable(0, 'example', e.target.value), 0);
                      }
                    }}
                    placeholder="Media asset handle (e.g., 4::aW...)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              {/* ===== BODY ===== */}
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <h4 style={{ color: '#86efac', margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600' }}>✏️ BODY * (Required)</h4>
                
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Hi {{name}}, your order {{order_id}} is ready!"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    fontSize: '12px',
                    minHeight: '60px',
                    marginBottom: '10px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />

                {bodyVariables.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateBodyVariable(i, 'name', e.target.value)}
                      placeholder={parameterFormat === 'NAMED' ? 'Param name (e.g., name)' : 'Value'}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '11px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="text"
                      value={v.example}
                      onChange={(e) => updateBodyVariable(i, 'example', e.target.value)}
                      placeholder="Example"
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '11px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeBodyVariable(i)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {templateBody.includes('{{') && (
                  <button
                    type="button"
                    onClick={addBodyVariable}
                    style={{
                      width: '100%',
                      background: 'rgba(83, 189, 235, 0.1)',
                      border: '1px solid rgba(83, 189, 235, 0.3)',
                      color: '#53bdeb',
                      padding: '6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    + Add Variable
                  </button>
                )}
              </div>

              {/* ===== FOOTER ===== */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>
                  📎 Footer (Optional - max 60 chars)
                </label>
                <input
                  type="text"
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.target.value)}
                  placeholder="Use the buttons below to manage your subscriptions"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* ===== BUTTONS ===== */}
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <h4 style={{ color: '#fb923c', margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600' }}>🔘 BUTTONS (Optional - max 10)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <select
                    value={buttonType}
                    onChange={(e) => setButtonType(e.target.value as any)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="QUICK_REPLY">Quick Reply</option>
                    <option value="URL">URL Button</option>
                    <option value="PHONE_NUMBER">Phone Button</option>
                    <option value="COPY_CODE">Copy Code</option>
                  </select>

                  {buttonType === 'QUICK_REPLY' && (
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Button text (max 25 chars)"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  {buttonType === 'URL' && (
                    <>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Button text"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#ffffff',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        type="text"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="URL"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#ffffff',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </>
                  )}
                  {buttonType === 'PHONE_NUMBER' && (
                    <>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Button text"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#ffffff',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        type="tel"
                        value={buttonPhone}
                        onChange={(e) => setButtonPhone(e.target.value)}
                        placeholder="Phone number"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#ffffff',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </>
                  )}
                  {buttonType === 'COPY_CODE' && (
                    <input
                      type="text"
                      value={buttonCopyCode}
                      onChange={(e) => setButtonCopyCode(e.target.value)}
                      placeholder="Code to copy (max 15 chars)"
                      style={{
                        gridColumn: '1 / -1',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={addButton}
                  disabled={buttons.length >= 10}
                  style={{
                    width: '100%',
                    background: buttons.length < 10 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: buttons.length < 10 ? '#86efac' : '#999',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: buttons.length < 10 ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '10px',
                  }}
                >
                  + Add Button ({buttons.length}/10)
                </button>

                {buttons.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {buttons.map((btn, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#ddd' }}>
                          {btn.type === 'QUICK_REPLY' && `📌 ${btn.text}`}
                          {btn.type === 'URL' && `🔗 ${btn.text} → ${btn.url}`}
                          {btn.type === 'PHONE_NUMBER' && `☎️ ${btn.text} → ${btn.phone_number}`}
                          {btn.type === 'COPY_CODE' && `📋 Copy: ${btn.example}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeButton(i)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.3)',
                            border: 'none',
                            color: '#f87171',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== SUBMIT ===== */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '12px' }}>
                <button
                  type="submit"
                  disabled={creating || !templateName.trim() || !templateBody.trim()}
                  style={{
                    flex: 1,
                    background: '#53bdeb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    opacity: creating || !templateName.trim() || !templateBody.trim() ? 0.5 : 1,
                  }}
                >
                  {creating ? 'Creating...' : '✅ Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 1001,
          }}
        >
          <div
            style={{
              background: '#1a2332',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#ffffff', marginTop: 0 }}>Delete Template?</h3>
            <p style={{ color: '#999', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>{showDeleteConfirm}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                style={{
                  flex: 1,
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
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
            zIndex: 1002,
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            style={{
              background: '#1a2332',
              border: '1px solid rgba(83, 189, 235, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Metadata Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(83, 189, 235, 0.1)',
                  color: '#53bdeb',
                  padding: '6px 12px',
                  borderRadius: '4px',
                }}
              >
                📋 {selectedTemplate.language || 'en_US'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background:
                    selectedTemplate.status === 'APPROVED'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                  color: selectedTemplate.status === 'APPROVED' ? '#10b981' : '#f59e0b',
                  padding: '6px 12px',
                  borderRadius: '4px',
                }}
              >
                {selectedTemplate.status || 'PENDING'}
              </span>
              {selectedTemplate.data?.category && (
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#a78bfa',
                    padding: '6px 12px',
                    borderRadius: '4px',
                  }}
                >
                  🏷️ {selectedTemplate.data.category}
                </span>
              )}
            </div>

            {/* JSON Display */}
            <div
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '16px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#d1d5db',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(selectedTemplate, null, 2)}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedTemplate, null, 2));
                  alert('Template JSON copied to clipboard!');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(83, 189, 235, 0.1)',
                  border: '1px solid rgba(83, 189, 235, 0.3)',
                  color: '#53bdeb',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                📋 Copy Full JSON
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(selectedTemplate.data, null, 2);
                  const link = document.createElement('a');
                  link.href = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                  link.download = `${selectedTemplate.name}.json`;
                  link.click();
                }}
                style={{
                  flex: 1,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#86efac',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                ⬇️ Download JSON
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
