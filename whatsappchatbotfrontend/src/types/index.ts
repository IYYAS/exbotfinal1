export interface ContactInfo {
  id: number;
  wa_id: string;
  first_name: string;
  last_name?: string;
  unread_messages_count: number;
  last_messaged_at?: string;
}

export interface MessageLog {
  id: number;
  contact_wa_id: string;
  wamid?: string;
  is_incoming: boolean;
  status: string;
  message_body: string;
  message_type: string;
  attachment?: string;
  messaged_at: string;
  data: any;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  language: string;
  category?: string;
  status?: string;
  data: any;
}
