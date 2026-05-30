import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Star, 
  ShieldCheck, 
  PowerOff, 
  RefreshCw, 
  Bot, 
  Globe 
} from 'lucide-react';
import { whatsappAPI, BACKEND_URL, NGROK_URL } from '../api';

interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  status?: string;
  webhook_configuration?: {
    application: string;
  };
}

interface AccountStatus {
  success: boolean;
  business_account_id: string;
  account_name: string;
  timezone?: string;
  currency?: string;
  webhooks_subscribed: boolean;
  phone_numbers: PhoneNumberInfo[];
  permissions: string[];
}

const ConnectAccount: React.FC = () => {
  const [formData, setFormData] = useState({
    whatsapp_business_account_id: '',
    whatsapp_access_token: '',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingStatus(true);
    try {
      const res = await whatsappAPI.fetchSettings();
      if (res.data) {
        setFormData({
          whatsapp_business_account_id: res.data.whatsapp_business_account_id || '',
          whatsapp_access_token: res.data.whatsapp_access_token || '',
        });

        if (res.data.whatsapp_business_account_id && res.data.whatsapp_access_token) {
          const statusRes = await whatsappAPI.fetchAccountStatus();
          if (statusRes.data.success) {
            setAccountStatus(statusRes.data);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings/status", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTestConnection = async () => {
    if (!formData.whatsapp_business_account_id || !formData.whatsapp_access_token) {
      setMessage({ type: 'error', text: 'Please fill in WABA ID and Access Token to test.' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      // For connection tests, phone number ID is not strictly needed for permissions check
      const res = await whatsappAPI.testConnection({
        whatsapp_business_account_id: formData.whatsapp_business_account_id,
        whatsapp_access_token: formData.whatsapp_access_token,
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Connection Verified! Stored configurations are valid.' });
      } else {
        setMessage({ type: 'error', text: 'Meta verified failed: ' + (res.data.error || 'Check details.') });
      }
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error?.error?.message || err.response?.data?.error || 'Test connection failed.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.whatsapp_business_account_id || !formData.whatsapp_access_token) {
      setMessage({ type: 'error', text: 'Please fill in both Business Account ID and Access Token.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await whatsappAPI.saveSettings(formData);
      
      const statusRes = await whatsappAPI.fetchAccountStatus();
      if (statusRes.data.success) {
        setAccountStatus(statusRes.data);
        setMessage({ type: 'success', text: 'WhatsApp Business Account successfully linked!' });
      } else {
        setMessage({ type: 'error', text: 'Settings saved, but failed to fetch live account status. Verify token parameters.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to connect. Verify input parameters.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your WhatsApp Business integration? Stored tokens will be deleted.")) return;
    setLoadingStatus(true);
    try {
      await whatsappAPI.saveSettings({
        whatsapp_business_account_id: '',
        whatsapp_phone_number_id: '',
        whatsapp_access_token: '',
        whatsapp_app_id: '',
      });
      setFormData({
        whatsapp_business_account_id: '',
        whatsapp_access_token: '',
      });
      setAccountStatus(null);
      setMessage({ type: 'success', text: 'Account disconnected successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect.' });
    } finally {
      setLoadingStatus(false);
    }
  };

  const webhookUrl = `${NGROK_URL || BACKEND_URL}/api/whatsapp/webhook/`;
  const verifyToken = 'service-whatsapp-token';
  const privacyUrl = `${window.location.origin}/policy/privacy`;
  const termsUrl = `${window.location.origin}/policy/terms`;

  const permissionsList = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    'business_management'
  ];

  if (loadingStatus) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="spin" color="var(--primary-color)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Connect WhatsApp Business
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Integrate and configure your Meta WhatsApp Cloud API credentials.
        </p>
      </div>

      {message && (
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          marginBottom: '24px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{message.text}</span>
        </div>
      )}

      {accountStatus && accountStatus.success ? (
        <div>
          {/* Account Header Metadata */}
          <div style={{ 
            backgroundColor: 'var(--surface-color)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'inline-block', marginRight: '12px' }}>
                  {accountStatus.account_name}
                </h2>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  WABA ID: <strong>{accountStatus.business_account_id}</strong>
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={fetchData}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} /> Sync Status
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Permissions:</span>
              {(accountStatus.permissions || permissionsList).map((perm) => (
                <span key={perm} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  <CheckCircle2 size={12} />
                  {perm}
                </span>
              ))}

              <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 8px' }}></div>

              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                background: accountStatus.webhooks_subscribed ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                color: accountStatus.webhooks_subscribed ? '#34d399' : '#f87171', 
                fontWeight: '600' 
              }}>
                {accountStatus.webhooks_subscribed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} 
                {accountStatus.webhooks_subscribed ? 'Webhooks Active' : 'Webhooks Inactive'}
              </span>

              {accountStatus.currency && (
                <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  Currency: <strong>{accountStatus.currency}</strong>
                </span>
              )}
              {accountStatus.timezone && (
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  Timezone: <strong>{accountStatus.timezone}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Connected Phone Numbers */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Connected WhatsApp Lines
          </h3>

          {accountStatus.phone_numbers?.map((phone) => (
            <div key={phone.id} style={{ 
              backgroundColor: 'var(--surface-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
              overflow: 'hidden', 
              marginBottom: '20px', 
              position: 'relative' 
            }}>
              
              {/* Background Watermark Icon */}
              <div style={{ position: 'absolute', right: '-20px', top: '10px', opacity: 0.03, pointerEvents: 'none' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="180" height="180" fill="currentColor" color="var(--text-primary)">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>

              <div style={{ padding: '24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {phone.verified_name || 'Verified Number Line'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0 }}>
                    <Bot size={60} color="var(--primary-color)" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Phone size={14} /> Number:
                      </div>
                      <div style={{ fontWeight: '600' }}>{phone.display_phone_number}</div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={14} /> Number ID:
                      </div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{phone.id}</div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Star size={14} /> Quality:
                      </div>
                      <div>
                        <span style={{ 
                          fontWeight: '600', 
                          color: phone.quality_rating === 'GREEN' ? '#10b981' : 'var(--text-primary)' 
                        }}>
                          {phone.quality_rating || 'UNKNOWN'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <ShieldCheck size={14} /> Status:
                      </div>
                      <div style={{ fontWeight: '500', color: phone.status === 'APPROVED' ? '#10b981' : 'var(--text-primary)' }}>
                        {phone.status || 'Available Without Review'}
                      </div>

                      {phone.webhook_configuration && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <Globe size={14} /> Webhook:
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            {phone.webhook_configuration.application}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleDisconnect}
                  style={{
                    backgroundColor: 'transparent', 
                    color: '#ef4444', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <PowerOff size={14} /> Disconnect Account
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Unconnected WABA Setup Card */
        <div style={{ 
          backgroundColor: 'var(--surface-color)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>
                  Meta API Credentials Setup
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                  Enter your System User Access Token and Business ID to secure webhook linking.
                </p>
              </div>
              <div style={{ color: 'var(--primary-color)', opacity: 0.8 }}>
                <Zap size={36} /> 
              </div>
            </div>

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp_business_account_id">WhatsApp Business Account ID (WABA ID)</label>
                <input 
                  id="whatsapp_business_account_id"
                  type="text"
                  name="whatsapp_business_account_id"
                  value={formData.whatsapp_business_account_id}
                  onChange={handleChange}
                  placeholder="e.g. 109843928172948"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="whatsapp_access_token">System User Access Token</label>
                <input 
                  id="whatsapp_access_token"
                  type="text"
                  name="whatsapp_access_token"
                  value={formData.whatsapp_access_token}
                  onChange={handleChange}
                  placeholder="EAAGy..."
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button 
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {testing ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
                  Test Connection
                </button>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary-color)',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
                >
                  {loading ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
                  Connect Account
                </button>
              </div>
            </form>

            {/* Webhook URLs Configuration section */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Webhook Endpoint Settings
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Webhook Callback URL</div>
                  <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{webhookUrl}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Verify Token</div>
                  <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{verifyToken}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Privacy Policy URL</div>
                  <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{privacyUrl}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Terms of Service URL</div>
                  <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{termsUrl}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectAccount;
