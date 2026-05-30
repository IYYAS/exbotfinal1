import axios from 'axios';

export const BACKEND_URL = 'http://localhost:8000';
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
  syncTemplates: () => api.post('/whatsapp/templates/sync/'),
  createTemplate: (templateData: any) => api.post('/whatsapp/templates/create/', templateData),
  deleteContact: (id: number) => api.delete(`/whatsapp/contacts/${id}/`),
  deleteTemplate: (templateName: string) => api.delete(`/whatsapp/templates/${templateName}/delete/`),
  sendReaction: (to_number: string, message_id: string, emoji: string) =>
    api.post('/whatsapp/send-reaction/', { to_number, message_id, emoji }),
};

export default api;
