# WhatsApp Template Management System - Complete Documentation

**Project:** WhatsApp Chatbot (Frontend + Backend)  
**Date:** May 26, 2026  
**Status:** Fully Implemented with Meta Cloud API v25.0 Compliance

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Complete Code Reference](#complete-code-reference)
7. [Meta Payload Structure](#meta-payload-structure)
8. [Usage Flows](#usage-flows)

---

## 🏗️ System Architecture

### Component Layers

```
┌─────────────────────────────────────────────────────────┐
│         React Frontend (TypeScript)                     │
│      TemplateManager.tsx + Components                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
                     ▼
┌─────────────────────────────────────────────────────────┐
│     Django REST Framework Backend (Python)              │
│      Views + Client + Serializers                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    Meta WhatsApp Cloud API (graph.facebook.com)         │
│    Create/Read/Delete Templates via WABA                │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│    Local SQLite Database                                │
│    Template Cache (WhatsAppTemplate model)              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Implementation

### 1. Main Component: TemplateManager.tsx

**Location:** `whatsappchatbotfrontend/src/pages/TemplateManager.tsx`

#### State Management (All 24 States)

```typescript
// Template list
const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
const [loading, setLoading] = useState(true);

// UI Modal Controls
const [showCreateModal, setShowCreateModal] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

// Form Basic Information
const [templateName, setTemplateName] = useState('');
const [templateCategory, setTemplateCategory] = useState('MARKETING');
const [templateLanguage, setTemplateLanguage] = useState('en_US');
const [parameterFormat, setParameterFormat] = useState<'NAMED' | 'POSITIONAL'>('POSITIONAL');

// Header Component
const [headerType, setHeaderType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'>('TEXT');
const [headerText, setHeaderText] = useState('');
const [headerVariables, setHeaderVariables] = useState<Array<{ name: string; example: string }>>([]);

// Body Component
const [templateBody, setTemplateBody] = useState('');
const [bodyVariables, setBodyVariables] = useState<Array<{ name: string; example: string }>>([]);

// Footer Component
const [templateFooter, setTemplateFooter] = useState('');

// Buttons Component
const [buttons, setButtons] = useState<Array<any>>([]);
const [buttonType, setButtonType] = useState<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE'>('QUICK_REPLY');
const [buttonText, setButtonText] = useState('');
const [buttonUrl, setButtonUrl] = useState('');
const [buttonPhone, setButtonPhone] = useState('');
const [buttonCopyCode, setButtonCopyCode] = useState('');

// Form State
const [creating, setCreating] = useState(false);
```

#### Key Functions

##### 1. fetchTemplates()
Loads all templates from the backend for the current vendor.

```typescript
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
```

**API Call:** `GET /api/whatsapp/templates/`  
**Returns:** Array of WhatsAppTemplate objects

---

##### 2. syncTemplates()
Syncs templates from Meta WABA to local database.

```typescript
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
```

**API Call:** `POST /api/whatsapp/templates/sync/`  
**Returns:** `{ success: true, count: number }`

---

##### 3. handleCreateTemplate(e)
Main form submission handler. Validates inputs and sends template creation request to backend.

```typescript
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
```

**API Call:** `POST /api/whatsapp/templates/create/`  
**Payload Example:**
```json
{
  "name": "order_confirmation_v1",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}}, your order {{2}} is confirmed!"
    }
  ]
}
```

---

##### 4. buildComponents()
Constructs the Meta-compliant components array. Handles both NAMED and POSITIONAL parameter formats.

```typescript
const buildComponents = () => {
  const components = [];

  // Header component (optional)
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

  // Footer component (optional)
  if (templateFooter.trim()) {
    components.push({
      type: 'FOOTER',
      text: templateFooter,
    });
  }

  // Buttons component (optional)
  if (buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: buttons,
    });
  }

  return components;
};
```

**Output Example (POSITIONAL):**
```json
[
  {
    "type": "BODY",
    "text": "Hi {{1}}, your order {{2}} is ready!",
    "example": {
      "body_text": [["John", "ORD123"]]
    }
  },
  {
    "type": "BUTTONS",
    "buttons": [
      { "type": "QUICK_REPLY", "text": "Yes" },
      { "type": "QUICK_REPLY", "text": "No" }
    ]
  }
]
```

---

##### 5. handleDeleteTemplate(templateName)
Deletes a template from Meta and local cache.

```typescript
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
```

**API Call:** `DELETE /api/whatsapp/templates/{template_name}/delete/`

---

##### 6. resetForm()
Clears all form state to default values.

```typescript
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
```

---

##### 7. Button Management Functions

###### addButton()
Adds a new button to the buttons array with the current button configuration.

```typescript
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
```

###### removeButton(index)
Removes a button at the specified index.

```typescript
const removeButton = (index: number) => {
  setButtons(buttons.filter((_, i) => i !== index));
};
```

---

##### 8. Variable Management Functions

###### Header Variables

```typescript
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
```

###### Body Variables

```typescript
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
```

---

### 2. UI Components

#### Main Page Layout

**Features:**
- **Header Section**: Title "WhatsApp Templates" with description
- **Action Buttons**: 
  - ➕ Create New Template
  - 🔄 Sync from Meta
- **Template Grid**: Responsive grid (auto-fill, 320px minimum)
- **Template Cards**: 
  - Template name
  - Language badge
  - Status badge (APPROVED/PENDING with color coding)
  - Category badge
  - Body preview
  - Action buttons (Copy JSON, Delete)

---

#### Create Template Modal

**Sections:**

1. **Basic Information** (3-column layout)
   - Template Name * (required)
   - Language dropdown
   - Category dropdown
   - Parameter Format selector

2. **Header Section** (Purple themed)
   - Header Type selector (5 options)
   - Conditional inputs based on type:
     - TEXT: Text input + variable management
     - IMAGE/VIDEO/DOCUMENT: Media handle input
     - LOCATION: No input needed
   - Add Variable button (appears when `{{` detected)

3. **Body Section** (Green themed)
   - Textarea for body text * (required)
   - Dynamic variable UI with add/remove
   - Variable name and example inputs

4. **Footer Section**
   - Optional text input (max 60 chars)

5. **Buttons Section** (Orange themed)
   - Button type selector
   - Conditional input fields:
     - QUICK_REPLY: Text only
     - URL: Text + URL + optional variables
     - PHONE_NUMBER: Text + Phone number
     - COPY_CODE: Code (max 15 chars)
   - Add Button button (disabled at 10 buttons)
   - Live button list with remove options

6. **Submit Section**
   - ✅ Create Template button (disabled if invalid)
   - Cancel button

---

#### Delete Confirmation Modal

```
┌─────────────────────────────────┐
│  Delete Template?               │
│                                 │
│  Are you sure you want to       │
│  delete [template_name]?        │
│  This action cannot be undone.  │
│                                 │
│  [🗑️ Delete]  [Cancel]         │
└─────────────────────────────────┘
```

---

#### Template Detail Modal

**Features:**
- Template name header
- Metadata badges (Language, Status, Category)
- Full JSON display with:
  - Monospace font
  - Syntax highlighting (light colored text)
  - Scrollable area
- Action buttons:
  - 📋 Copy Full JSON
  - ⬇️ Download JSON
  - Close

---

### 3. Frontend API Client

**File:** `whatsappchatbotfrontend/src/api.ts`

```typescript
export const whatsappAPI = {
  // Fetch all templates
  fetchTemplates: () => api.get('/whatsapp/templates/'),
  
  // Sync templates from Meta
  syncTemplates: () => api.post('/whatsapp/templates/sync/'),
  
  // Create new template
  createTemplate: (templateData: any) => 
    api.post('/whatsapp/templates/create/', templateData),
  
  // Delete template
  deleteTemplate: (templateName: string) => 
    api.delete(`/whatsapp/templates/${templateName}/delete/`),
  
  // Send template message
  sendTemplate: (to_number: string, template: any, imageUrl?: string) => {
    const data: any = { to_number, template };
    if (imageUrl) {
      data.image_url = imageUrl;
    }
    return api.post('/whatsapp/send-template/', data);
  }
};
```

---

## ⚙️ Backend Implementation

### 1. Django REST Framework Views

**File:** `whatsappchatbotbackend/whatsapp_service/views.py`

#### TemplateSyncAPIView

```python
class TemplateSyncAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = request.user.vendor
        client = WhatsAppClient(vendor=vendor)
        result = client.get_templates()
        
        if "error" in result: 
            return Response(result, status=status.HTTP_502_BAD_GATEWAY)
        
        synced_count = 0
        for t_data in result.get('data', []):
            WhatsAppTemplate.objects.update_or_create(
                vendor=vendor,
                name=t_data.get('name'),
                defaults={
                    'language': t_data.get('language'), 
                    'category': t_data.get('category'),
                    'status': t_data.get('status'), 
                    'data': t_data,
                }
            )
            synced_count += 1
        
        return Response({"success": True, "count": synced_count})
```

**Endpoint:** `POST /api/whatsapp/templates/sync/`  
**Purpose:** Syncs templates from Meta WABA to local database  
**Returns:** `{ success: true, count: number }`

---

#### TemplateCreateAPIView

```python
class TemplateCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vendor = request.user.vendor
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
            
        client = WhatsAppClient(vendor=vendor)
        result = client.create_template(request.data)

        if "error" in result:
            return Response({
                "success": False, 
                "error": result.get("error")
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Automatically cache/save locally in DB on successful creation
        try:
            WhatsAppTemplate.objects.update_or_create(
                vendor=vendor,
                name=request.data.get('name'),
                defaults={
                    'language': request.data.get('language'), 
                    'category': request.data.get('category'),
                    'status': result.get('status', 'PENDING'), 
                    'data': request.data,
                }
            )
        except Exception as e:
            logger.warning(f"Could not auto-save created template to DB: {e}")

        return Response({
            "success": True, 
            "data": result,
            "request_data": request.data,
        }, status=status.HTTP_201_CREATED)
```

**Endpoint:** `POST /api/whatsapp/templates/create/`  
**Purpose:** Creates a new template in Meta WABA  
**Payload:**
```json
{
  "name": "template_name",
  "language": "en_US",
  "category": "MARKETING",
  "components": [...]
}
```
**Returns:** `{ success: true, data: meta_response, request_data: sent_data }`

---

#### TemplateDeleteAPIView

```python
class TemplateDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, template_name):
        vendor = request.user.vendor
        if not vendor:
            return Response({"error": "No vendor linked to user"}, status=400)
            
        client = WhatsAppClient(vendor=vendor)
        result = client.delete_template(template_name)
        
        if "error" in result:
            return Response({
                "success": False, 
                "error": result.get("error")
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            WhatsAppTemplate.objects.filter(vendor=vendor, name=template_name).delete()
        except Exception as e:
            logger.warning(f"Could not auto-delete template from DB: {e}")

        return Response({
            "success": True, 
            "data": result
        }, status=status.HTTP_200_OK)
```

**Endpoint:** `DELETE /api/whatsapp/templates/{template_name}/delete/`  
**Purpose:** Deletes a template from Meta WABA  
**Returns:** `{ success: true, data: meta_response }`

---

#### TemplateListAPIView

```python
class TemplateListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = WhatsAppTemplate.objects.filter(
            vendor=request.user.vendor
        ).order_by('name')
        return Response(WhatsAppTemplateSerializer(templates, many=True).data)
```

**Endpoint:** `GET /api/whatsapp/templates/`  
**Purpose:** Fetches all templates for the authenticated user's vendor  
**Returns:** Array of template objects

---

### 2. WhatsApp Client

**File:** `whatsappchatbotbackend/whatsapp_service/client.py`

```python
class WhatsAppClient:
    def get_templates(self):
        """Fetch all message templates from Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("GET", f"{self.waba_id}/message_templates")

    def create_template(self, template_data):
        """Create a new message template in Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("POST", f"{self.waba_id}/message_templates", 
                                 payload=template_data)

    def delete_template(self, template_name):
        """Delete a message template from Meta WABA."""
        if not self.waba_id:
            return {"error": "WHATSAPP_BUSINESS_ACCOUNT_ID not configured"}
        return self._make_request("DELETE", f"{self.waba_id}/message_templates", 
                                 params={"name": template_name})

    def send_template_message(self, to_number, template_name, language_code="en_US", 
                             components=None, reply_to_message_id=None):
        """Send a template message."""
        template_data = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if components:
            template_data["components"] = components
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "template",
            "template": template_data
        }
        if reply_to_message_id:
            payload["context"] = {"message_id": reply_to_message_id}
        
        print("\n" + "="*80)
        print("🔥 META WHATSAPP CLOUD API - TEMPLATE PAYLOAD")
        print("="*80)
        print(f"Phone Number ID: {self.phone_number_id}")
        print(f"To Number: {to_number}")
        print(f"Full Payload Being Sent to Meta:")
        import json
        print(json.dumps(payload, indent=2))
        print("="*80 + "\n")
        
        return self._make_request("POST", f"{self.phone_number_id}/messages", payload)
```

---

### 3. URL Routing

**File:** `whatsappchatbotbackend/whatsapp_service/urls.py`

```python
urlpatterns = [
    path('templates/', TemplateListAPIView.as_view(), name='whatsapp-templates'),
    path('templates/sync/', TemplateSyncAPIView.as_view(), name='whatsapp-templates-sync'),
    path('templates/create/', TemplateCreateAPIView.as_view(), name='whatsapp-templates-create'),
    path('templates/<str:template_name>/delete/', TemplateDeleteAPIView.as_view(), 
         name='whatsapp-templates-delete'),
]
```

---

## 📊 Database Models

### WhatsAppTemplate Model

**File:** `whatsappchatbotbackend/whatsapp_service/models.py`

```python
class WhatsAppTemplate(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, 
                               related_name='templates', null=True, blank=True)
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=50)
    category = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    data = models.JSONField(default=dict)  # Stores the template structure/components

    def __str__(self):
        return f"{self.name} ({self.language})"
```

**Fields:**
- `vendor`: Foreign key to Vendor (multi-tenant support)
- `uid`: Unique identifier (UUID)
- `name`: Template name (unique per vendor)
- `language`: Language code (e.g., "en_US")
- `category`: Template category (MARKETING, AUTHENTICATION, UTILITY)
- `status`: Template status (PENDING, APPROVED, REJECTED)
- `data`: Full template JSON (from Meta or user input)

---

### TypeScript Type Definition

**File:** `whatsappchatbotfrontend/src/types/index.ts`

```typescript
export interface WhatsAppTemplate {
  id: number;
  name: string;
  language: string;
  category?: string;
  status?: string;
  data: any;  // Full Meta template structure
}
```

---

### Serializer

**File:** `whatsappchatbotbackend/whatsapp_service/serializers.py`

```python
class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = ['id', 'name', 'language', 'category', 'status', 'data']
```

---

## 🔌 API Endpoints

### Summary Table

| Method | Endpoint | Purpose | Auth | Returns |
|--------|----------|---------|------|---------|
| GET | `/api/whatsapp/templates/` | Fetch all templates | ✅ | Template[] |
| POST | `/api/whatsapp/templates/sync/` | Sync from Meta | ✅ | `{ success, count }` |
| POST | `/api/whatsapp/templates/create/` | Create template | ✅ | `{ success, data }` |
| DELETE | `/api/whatsapp/templates/{name}/delete/` | Delete template | ✅ | `{ success, data }` |
| POST | `/api/whatsapp/send-template/` | Send template message | ✅ | `{ success, log_id }` |

---

## 📝 Complete Code Reference

### Frontend: TemplateManager.tsx

**Size:** ~1370 lines  
**Components Used:**
- React Hooks (useState, useEffect)
- TypeScript
- Inline CSS styling
- Modal overlays
- Grid layout

**Key Sections:**
1. State declarations (24 states)
2. useEffect for initial load
3. API methods (6 main functions)
4. Helper functions (12 additional)
5. JSX rendering (main layout + 3 modals)

---

### Backend: Views

**Size:** ~150 lines (template-related)  
**Classes:** 4 main API views
- TemplateSyncAPIView
- TemplateCreateAPIView
- TemplateDeleteAPIView
- TemplateListAPIView

---

### Backend: Client

**Size:** ~3 methods for templates  
**Key Methods:**
- `get_templates()` - Fetch from Meta
- `create_template(data)` - Create on Meta
- `delete_template(name)` - Delete from Meta
- `send_template_message(...)` - Send template

---

## 🔄 Meta Payload Structure

### Creating a Template (POSITIONAL Format)

```json
{
  "name": "order_status_update_v1",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Order Status Update",
      "example": {
        "header_text": []
      }
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, your order {{2}} is now {{3}}. Expected delivery: {{4}}",
      "example": {
        "body_text": [["John", "ORD-12345", "shipped", "May 30"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Thank you for your business"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Track Order"
        },
        {
          "type": "URL",
          "text": "Visit Store",
          "url": "https://example.com/store"
        },
        {
          "type": "PHONE_NUMBER",
          "text": "Call Support",
          "phone_number": "+1234567890"
        }
      ]
    }
  ]
}
```

### Creating a Template (NAMED Format)

```json
{
  "name": "welcome_email_v1",
  "language": "en_US",
  "category": "AUTHENTICATION",
  "components": [
    {
      "type": "BODY",
      "text": "Welcome {{customer_name}}! Your code is {{code}}.",
      "example": {
        "body_text_named_params": [
          {
            "param_name": "customer_name",
            "example": "Sarah"
          },
          {
            "param_name": "code",
            "example": "123456"
          }
        ]
      }
    }
  ]
}
```

### Sending a Template Message

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "order_status_update_v1",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": "John"
          },
          {
            "type": "text",
            "text": "ORD-12345"
          },
          {
            "type": "text",
            "text": "shipped"
          },
          {
            "type": "text",
            "text": "May 30"
          }
        ]
      }
    ]
  }
}
```

---

## 🎯 Usage Flows

### Flow 1: Create Template

```
User clicks "Create New Template"
    ↓
Modal opens with empty form
    ↓
User fills in:
  - Name, Language, Category
  - Parameter Format (POSITIONAL/NAMED)
  - Header (optional)
  - Body (required)
  - Footer (optional)
  - Buttons (optional)
    ↓
User clicks "Create Template"
    ↓
Frontend calls buildComponents()
    ↓
Frontend POSTs to /api/whatsapp/templates/create/
    ↓
Backend receives request
    ↓
Backend calls WhatsAppClient.create_template()
    ↓
Client makes HTTP POST to Meta API
    ↓
Meta returns template_id + status
    ↓
Backend saves to WhatsAppTemplate model
    ↓
Backend returns success response
    ↓
Frontend shows success alert
    ↓
Frontend calls fetchTemplates()
    ↓
Template appears in list
```

---

### Flow 2: Sync Templates from Meta

```
User clicks "Sync from Meta"
    ↓
Frontend POSTs to /api/whatsapp/templates/sync/
    ↓
Backend calls WhatsAppClient.get_templates()
    ↓
Client makes HTTP GET to Meta API
    ↓
Meta returns array of templates
    ↓
Backend iterates through templates
    ↓
For each template:
  - update_or_create() in WhatsAppTemplate
  - Store name, language, category, status, full data
    ↓
Backend returns { success: true, count: N }
    ↓
Frontend shows alert: "Synchronized N templates"
    ↓
Frontend calls fetchTemplates()
    ↓
Updated list appears
```

---

### Flow 3: Delete Template

```
User clicks "Delete" on template card
    ↓
Delete confirmation modal appears
    ↓
User confirms deletion
    ↓
Frontend calls deleteTemplate(templateName)
    ↓
Frontend DELETEs to /api/whatsapp/templates/{name}/delete/
    ↓
Backend calls WhatsAppClient.delete_template(name)
    ↓
Client makes HTTP DELETE to Meta API
    ↓
Meta confirms deletion
    ↓
Backend deletes from WhatsAppTemplate model
    ↓
Backend returns success response
    ↓
Frontend shows success alert
    ↓
Frontend calls fetchTemplates()
    ↓
Template disappears from list
```

---

### Flow 4: Send Template Message

```
User selects contact in LiveChat
    ↓
User clicks template button
    ↓
Templates modal opens
    ↓
User selects a template
    ↓
Frontend collects variable values (if needed)
    ↓
User clicks "Send"
    ↓
Frontend calls sendTemplate()
    ↓
Frontend POSTs to /api/whatsapp/send-template/
    ↓
Backend receives template data
    ↓
Backend builds components array with parameters
    ↓
Backend calls WhatsAppClient.send_template_message()
    ↓
Client constructs Meta payload
    ↓
Client logs payload (debug)
    ↓
Client makes HTTP POST to Meta API
    ↓
Meta sends message to recipient
    ↓
Meta returns wamid + status
    ↓
Backend creates WhatsAppMessageLog entry
    ↓
Backend returns { success: true, log_id, wamid }
    ↓
Frontend shows success notification
    ↓
Message appears in chat
```

---

## 🔐 Security Features

1. **Authentication:** All endpoints require `IsAuthenticated` permission
2. **Vendor Isolation:** Templates filtered by `request.user.vendor`
3. **Authorization:** Users can only access their vendor's templates
4. **Error Handling:** Comprehensive try-catch with user-friendly messages
5. **Validation:** 
   - Template name required
   - Body required
   - Parameter format validation
   - Button limits (max 10)

---

## 📈 Supported Template Features

### Header Types
- ✅ TEXT (with variables support)
- ✅ IMAGE (with media handles)
- ✅ VIDEO (with media handles)
- ✅ DOCUMENT (with media handles)
- ✅ LOCATION (no variables)

### Parameter Formats
- ✅ POSITIONAL (`{{1}}`, `{{2}}`)
- ✅ NAMED (`{{customer_name}}`)

### Button Types
- ✅ QUICK_REPLY (25 chars max)
- ✅ URL (2000 chars, 1 variable)
- ✅ PHONE_NUMBER (20 chars)
- ✅ COPY_CODE (15 chars max)

### Template Categories
- ✅ MARKETING
- ✅ AUTHENTICATION
- ✅ UTILITY

### Template Status
- ✅ PENDING (awaiting approval)
- ✅ APPROVED (ready to use)
- ✅ REJECTED (with reason from Meta)

---

## 🚀 Performance Considerations

1. **Caching:** Templates are cached locally in WhatsAppTemplate model
2. **Sync:** Sync from Meta updates cache incrementally
3. **Pagination:** Grid uses auto-fill for responsive layout
4. **Lazy Loading:** Templates load on component mount (useEffect)

---

## 📚 Meta API Documentation Reference

- **API Version:** v25.0
- **Base URL:** `https://graph.facebook.com/v25.0`
- **Endpoints Used:**
  - `GET /{WABA_ID}/message_templates` - List templates
  - `POST /{WABA_ID}/message_templates` - Create template
  - `DELETE /{WABA_ID}/message_templates?name={name}` - Delete template
  - `POST /{PHONE_NUMBER_ID}/messages` - Send message

---

## 🎓 Developer Notes

### Common Issues & Solutions

1. **Template Not Appearing After Creation**
   - Wait 2-3 seconds for Meta to process
   - Click "Sync from Meta" to refresh

2. **Parameter Format Mismatch Error**
   - Ensure all `{{variable}}` patterns have matching examples
   - NAMED format requires param_name field
   - POSITIONAL format uses array indices

3. **Button Validation Failed**
   - Max 10 buttons per template
   - QUICK_REPLY limited to 25 chars
   - URL buttons limited to 2000 chars total

4. **Media Handle Not Working**
   - Verify media handle from Meta upload API
   - Format: `{ID}::{HANDLE}`
   - Upload media separately first

---

## 📞 Support & Debugging

### Enable Debug Logging

The client includes comprehensive logging for template operations:

```
🔥 META WHATSAPP CLOUD API - TEMPLATE PAYLOAD
================================================================================
Phone Number ID: 123456789
To Number: +1234567890
Full Payload Being Sent to Meta:
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+1234567890",
  "type": "template",
  "template": { ... }
}
================================================================================
```

---

**Document Version:** 1.0  
**Last Updated:** May 26, 2026  
**Status:** Complete & Production Ready
