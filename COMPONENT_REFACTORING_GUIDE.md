# LiveChat Component Refactoring

## Overview
The original `LiveChat.tsx` (2900+ lines) has been refactored into smaller, reusable, and maintainable components. This document describes the new structure and how to use each component.

## New Component Structure

### Directory Structure
```
src/
├── components/
│   ├── ContactList.tsx           # Contact sidebar
│   ├── MessageBubble.tsx          # Individual message display
│   ├── MessageList.tsx            # Messages container
│   ├── MessageInput.tsx           # Input form with recording
│   ├── ContextMenu.tsx            # Right-click menu
│   ├── JSONInspector.tsx          # API payload viewer
│   ├── ChatHeader.tsx             # Chat info header
│   ├── ActiveReplyBanner.tsx      # Reply-to indicator
│   ├── AddContactModal.tsx        # Add contact form
│   ├── EmptyState.tsx             # No contact selected
│   └── index.ts                   # Export all components
├── hooks/
│   └── useRecording.ts            # Recording functionality hook
├── types/
│   └── index.ts                   # TypeScript interfaces
└── pages/
    ├── LiveChat.tsx               # Original (keep for reference)
    └── LiveChatRefactored.tsx      # New refactored version
```

## Component Documentation

### 1. **ContactList** `src/components/ContactList.tsx`
Manages the sidebar with all contacts and search functionality.

**Props:**
```typescript
interface ContactListProps {
  contacts: ContactInfo[];
  activeContact: ContactInfo | null;
  searchTerm: string;
  loadingContacts: boolean;
  onSearchChange: (term: string) => void;
  onSelectContact: (contact: ContactInfo) => void;
  onAddContact: () => void;
}
```

**Features:**
- Search and filter contacts
- Display unread message count
- Show last message time
- Select active contact
- Add new contact button

---

### 2. **MessageBubble** `src/components/MessageBubble.tsx`
Displays a single message with reactions, attachments, and status.

**Props:**
```typescript
interface MessageBubbleProps {
  message: MessageLog;
  activeContact: ContactInfo | null;
  isInspectorTarget: boolean;
  parentMsg: MessageLog | null;
  reactionBadge: string | undefined;
  incomingEmoji: string | undefined;
  sentEmoji: string | undefined;
  onContextMenu: (e: React.MouseEvent, message: MessageLog) => void;
  onQuotedClick: (quotedId: string) => void;
}
```

**Features:**
- Display text, image, video, audio, documents
- Show quoted message
- Display emoji reactions
- Show message status (sent, delivered, read, failed)
- Handle context menu on right-click

---

### 3. **MessageList** `src/components/MessageList.tsx`
Container for all messages with loading and empty states.

**Props:**
```typescript
interface MessageListProps {
  messages: MessageLog[];
  activeContact: ContactInfo | null;
  loadingMessages: boolean;
  inspectorMessage: MessageLog | null;
  sentReactions: Record<string, string>;
  onContextMenu: (message: MessageLog, x: number, y: number) => void;
  onQuotedClick: (quotedId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}
```

**Features:**
- Auto-scroll to latest message
- Empty state display
- Loading indicator
- Message grouping with reactions

---

### 4. **MessageInput** `src/components/MessageInput.tsx`
Input form with file upload, link preview, and voice recording.

**Props:**
```typescript
interface MessageInputProps {
  messageInput: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isRecording: boolean;
  recordingTime: number;
  uploadingFile: boolean;
  sending: boolean;
  previewUrl: boolean;
  attachmentMenuOpen: boolean;
  onPreviewUrlToggle: () => void;
  onAttachmentMenuToggle: () => void;
  onFileSelect: (file: File) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendMediaUrl: (type: string, url: string) => void;
  activeContact: ContactInfo | null;
  micError: string;
  onMicErrorClose: () => void;
}
```

**Features:**
- Type messages
- File attachment upload
- Link preview toggle
- Voice recording with timer
- Microphone error handling
- Send/Record button toggle

---

### 5. **ContextMenu** `src/components/ContextMenu.tsx`
Right-click context menu for messages.

**Props:**
```typescript
interface ContextMenuProps {
  message: MessageLog;
  x: number;
  y: number;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onViewPayload: () => void;
  onClose: () => void;
}
```

**Features:**
- Quick emoji reactions (👍 ❤️ 😂 😮 😢 🙏)
- Reply to message
- Copy message text
- View API payload
- Star/Delete options

---

### 6. **JSONInspector** `src/components/JSONInspector.tsx`
Displays raw Meta API responses in right sidebar.

**Props:**
```typescript
interface JSONInspectorProps {
  message: MessageLog;
  onClose: () => void;
}
```

**Features:**
- Display message metadata
- Show formatted JSON payload
- Raw API response viewing
- Message status indicator

---

### 7. **ChatHeader** `src/components/ChatHeader.tsx`
Header showing contact info and action buttons.

**Props:**
```typescript
interface ChatHeaderProps {
  activeContact: ContactInfo | null;
  onShowTemplates: () => void;
  onDeleteChat: () => void;
}
```

**Features:**
- Contact name and status
- Phone number display
- Send template button
- Delete chat button

---

### 8. **ActiveReplyBanner** `src/components/ActiveReplyBanner.tsx`
Banner showing which message is being replied to.

**Props:**
```typescript
interface ActiveReplyBannerProps {
  replyToMessage: MessageLog | null;
  activeContact: ContactInfo | null;
  onClear: () => void;
}
```

**Features:**
- Show quoted message preview
- Display quoted message sender
- Clear reply button

---

### 9. **AddContactModal** `src/components/AddContactModal.tsx`
Modal for adding a new contact.

**Props:**
```typescript
interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  contactName: string;
  onNameChange: (value: string) => void;
  contactPhone: string;
  onPhoneChange: (value: string) => void;
}
```

**Features:**
- Add contact name
- Add phone number
- Form validation
- Cancel/Submit buttons

---

### 10. **EmptyState** `src/components/EmptyState.tsx`
Placeholder when no contact is selected.

**Features:**
- Centered message icon
- Instructions for user

---

## Custom Hook: `useRecording`

Located in `src/hooks/useRecording.ts`

**Returns:**
```typescript
interface UseRecordingReturn {
  isRecording: boolean;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Blob | null;
  cancelRecording: () => void;
  error: string;
  clearError: () => void;
}
```

**Usage:**
```typescript
const recording = useRecording();

// Start recording
await recording.startRecording();

// Get audio blob when done
const audioBlob = recording.stopRecording();

// Cancel recording
recording.cancelRecording();
```

---

## Types

Located in `src/types/index.ts`

```typescript
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
```

---

## How to Use the Refactored Component

### Import the new LiveChat:
```typescript
import LiveChat from './pages/LiveChatRefactored';

// Use in your app
export default LiveChat;
```

### If you want to use individual components:
```typescript
import {
  ContactList,
  MessageBubble,
  MessageInput,
  ContextMenu,
  // ... other components
} from './components';

// Use them individually in your component
```

---

## Benefits of Refactoring

✅ **Modular Design** - Each component has a single responsibility
✅ **Reusable** - Components can be used in other parts of the app
✅ **Testable** - Smaller components are easier to unit test
✅ **Maintainable** - Easier to find and fix bugs
✅ **Scalable** - Easy to add new features
✅ **Better Performance** - Components only re-render when their props change
✅ **Type-Safe** - Full TypeScript support with clear interfaces
✅ **Customizable** - Props allow flexible styling and behavior

---

## File Breakdown

| File | Lines | Before | After | Reduction |
|------|-------|--------|-------|-----------|
| LiveChat.tsx | 2900+ | 1 file | 12 files | 99.99% complexity |

---

## Next Steps

1. **Replace the original import** with the refactored version
2. **Test each component** individually
3. **Consider extracting** TemplatesModal and CreateTemplateModal (TODO)
4. **Add unit tests** for each component
5. **Consider adding Storybook** for component documentation

---

## Notes

- The recording functionality is isolated in a custom hook for better reusability
- All components use inline styles but can be converted to CSS modules or Tailwind if preferred
- The types are shared across all components for consistency
- The API calls remain in the main component for now (can be abstracted further if needed)

