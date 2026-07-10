import axios from 'axios';

// Backend URL - use ngrok for production
export const BACKEND_URL = 'https://lanette-unmonarchic-contradictorily.ngrok-free.dev';
export const NGROK_URL = 'https://lanette-unmonarchic-contradictorily.ngrok-free.dev';
const API_BASE_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const whatsappAPI = {
  fetchSettings: () => api.get('/whatsapp/settings/'),
  saveSettings: (settingsData: any) => api.post('/whatsapp/settings/', settingsData),
  testConnection: (credentials: any) => api.post('/whatsapp/test-connection/', credentials),
  fetchAccountStatus: () => api.get('/whatsapp/account-status/'),

  // Live Chat API endpoints
  fetchContacts: () => api.get('/whatsapp/contacts/'),
  addContact: (contactData: any) => api.post('/whatsapp/contacts/', contactData),
  updateContact: (id: number, contactData: any) => api.put(`/whatsapp/contacts/${id}/`, contactData),
  fetchMessages: (contact?: string) => api.get('/whatsapp/messages/', { params: contact ? { contact } : {} }),
  fetchTemplates: () => api.get('/whatsapp/templates/'),
  sendMessage: (to_number: string, body: string, extraData: any = {}) =>
    api.post('/whatsapp/send/', { to_number, body, ...extraData }),
  sendTemplate: (to_number: string, template: any, imageUrl?: string) => {
    const data: any = { to_number, template };
    if (imageUrl) {
      data.image_url = imageUrl;
    }
    return api.post('/whatsapp/send-template/', data);
  },
  uploadMedia: (formData: FormData) =>
    api.post('/whatsapp/media/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  uploadTemplateMedia: (formData: FormData) =>
    api.post('/whatsapp/templates/media/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  syncTemplates: () => api.post('/whatsapp/templates/sync/'),
  createTemplate: (templateData: any) => api.post('/whatsapp/templates/create/', templateData),
  deleteContact: (id: number) => api.delete(`/whatsapp/contacts/${id}/`),
  deleteTemplate: (templateName: string) => api.delete(`/whatsapp/templates/${templateName}/delete/`),
  sendReaction: (to_number: string, message_id: string, emoji: string) =>
    api.post('/whatsapp/send-reaction/', { to_number, message_id, emoji }),

  // Interactive button message (header image optional, up to 3 reply buttons)
  sendInteractiveButtons: (payload: {
    to_number: string;
    body_text: string;
    footer_text?: string;
    header_image_url?: string;
    header_image_id?: string;
    buttons: { id: string; title: string }[];
    reply_to?: string;
  }) => api.post('/whatsapp/send-interactive-buttons/', payload),

  // Chatbot Flow APIs
  fetchFlows: (params: any = {}) => api.get('/whatsapp/flows/', { params }),
  getFlow: (id: number) => api.get(`/whatsapp/flows/${id}/`),
  createFlow: (data: any) => api.post('/whatsapp/flows/', data),
  updateFlow: (id: number, data: any) => api.put(`/whatsapp/flows/${id}/`, data),
  deleteFlow: (id: number) => api.delete(`/whatsapp/flows/${id}/`),
  fetchSequenceFlows: () => api.get('/whatsapp/flows/', { params: { has_sequence: true } }),

  // Template Variable APIs
  fetchTemplateVariables: () => api.get('/whatsapp/template-variables/'),
  createTemplateVariable: (name: string) => api.post('/whatsapp/template-variables/', { name }),
  deleteTemplateVariable: (id: number) => api.delete(`/whatsapp/template-variables/${id}/`),

  // Sequence APIs (legacy — sequence objects in DB)
  fetchSequences: () => api.get('/whatsapp/sequences/'),
  getSequence: (id: number) => api.get(`/whatsapp/sequences/${id}/`),
  createSequence: (data: any) => api.post('/whatsapp/sequences/', data),
  updateSequence: (id: number, data: any) => api.put(`/whatsapp/sequences/${id}/`, data),
  deleteSequence: (id: number) => api.delete(`/whatsapp/sequences/${id}/`),

  fetchSequenceMessages: (sequenceId: number) => api.get(`/whatsapp/sequences/${sequenceId}/messages/`),
  createSequenceMessage: (sequenceId: number, data: any) => api.post(`/whatsapp/sequences/${sequenceId}/messages/`, data),
  updateSequenceMessage: (sequenceId: number, msgId: number, data: any) => api.put(`/whatsapp/sequences/${sequenceId}/messages/${msgId}/`, data),
  deleteSequenceMessage: (sequenceId: number, msgId: number) => api.delete(`/whatsapp/sequences/${sequenceId}/messages/${msgId}/`),

  // Field APIs
  fetchSystemFields: () => api.get('/whatsapp/system-fields/'),
  fetchCustomFields: () => api.get('/whatsapp/custom-fields/'),
  createCustomField: (data: any) => api.post('/whatsapp/custom-fields/', data),

  // Label APIs
  fetchLabels: () => api.get('/whatsapp/labels/'),
  createLabel: (name: string) => api.post('/whatsapp/labels/', { name }),

  // New Flow-based Sequence Enrollment & Delivery APIs
  fetchSequenceEnrollments: () => api.get('/whatsapp/sequence-enrollments/'),
  cancelSequenceEnrollment: (enrollmentId: number) => api.patch(`/whatsapp/sequence-enrollments/${enrollmentId}/cancel/`),
  fetchSequenceDeliveries: (enrollmentId: number) => api.get(`/whatsapp/sequence-enrollments/${enrollmentId}/deliveries/`),
};

export default api;
