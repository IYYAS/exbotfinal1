# WhatsApp Send Template API Guide
## Endpoint: `POST /api/whatsapp/send-template/`

---

## ✅ REQUIRED FIELDS

### 1. **to_number** (String - REQUIRED)
- **Description**: WhatsApp number of recipient
- **Format**: Country code + number (e.g., "919999999999")
- **Example**: "919876543210"

### 2. **template** (Object - REQUIRED)
- **Description**: Template configuration object

#### **template.name** (String - REQUIRED)
- **Description**: Name of the WhatsApp template
- **Format**: Template name registered in Meta (e.g., "order_confirmation")
- **Example**: "order_confirmation"

#### **template.language** (Object - OPTIONAL)
- **Description**: Template language configuration
- **Default**: { "code": "en_US" }

#### **template.language.code** (String - OPTIONAL)
- **Description**: Language code
- **Default**: "en_US"
- **Format**: Language code (e.g., "en_US", "hi_IN", "ar_AR")

#### **template.components** (Array - OPTIONAL)
- **Description**: Template variable values or headers
- **Default**: Auto-generated if not provided
- **Usage**: Pass parameters for templates with variables

#### **image_url** (String - OPTIONAL - Top Level)
- **Description**: Image URL for templates with IMAGE header
- **Default**: Default image used if not provided
- **Used when**: Template has IMAGE header component

---

## 📤 EXAMPLE REQUEST

### Minimum Required (Text Template):
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "order_confirmation"
  }
}
```

### With Language:
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "en_US"
    }
  }
}
```

### With Components (Variables):
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "John Doe"
          },
          {
            "type": "text",
            "text": "Order #12345"
          }
        ]
      }
    ]
  }
}
```

### With Image Template:
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "promotional_image",
    "language": {
      "code": "en_US"
    },
    "components": []
  },
  "image_url": "https://example.com/image.jpg"
}
```

---

## ❌ ERROR MESSAGES & RESPONSES

### 1. **Missing to_number**
**Status**: 400 Bad Request
```json
{
  "error": "to_number is required"
}
```

### 2. **Missing template Object**
**Status**: 400 Bad Request
```json
{
  "error": "template object is required"
}
```

### 3. **Missing template.name**
**Status**: 400 Bad Request
```json
{
  "error": "template.name is required"
}
```

### 4. **Template Not APPROVED (Status Check)**
**Status**: 400 Bad Request
```json
{
  "success": false,
  "error": "Template \"order_confirmation\" has status \"PENDING\" — only APPROVED templates can be sent."
}
```

### 5. **User Not Authenticated**
**Status**: 403 Forbidden
```json
{
  "error": "Authentication credentials were not provided."
}
```

### 6. **No Vendor Account Associated**
**Status**: 403 Forbidden
```json
{
  "error": "No vendor account associated with this user."
}
```

### 7. **WhatsApp API Error (Invalid Number/Invalid Template)**
**Status**: 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid WhatsApp number format or template not found",
  "meta_response": {
    "error": {
      "message": "Invalid phone number",
      "type": "OAuthException",
      "code": 400
    }
  }
}
```

---

## ✅ SUCCESS RESPONSE

**Status**: 200 OK
```json
{
  "success": true,
  "log_id": 42,
  "wamid": "wamid.HBEUGVlkNDQwOTEwMjAwMDAwMDAxAA",
  "meta_response": {
    "messages": [
      {
        "id": "wamid.HBEUGVlkNDQwOTEwMjAwMDAwMDAxAA",
        "message_status": "accepted"
      }
    ],
    "contacts": [
      {
        "input": "919999999999",
        "wa_id": "919999999999"
      }
    ]
  }
}
```

---

## 📋 FIELD VALIDATION CHECKLIST

| Field | Required | Type | Example | Error Message |
|-------|----------|------|---------|----------------|
| `to_number` | ✅ Yes | String | "919999999999" | "to_number is required" |
| `template` | ✅ Yes | Object | `{...}` | "template object is required" |
| `template.name` | ✅ Yes | String | "order_confirmation" | "template.name is required" |
| `template.language` | ❌ No | Object | `{"code": "en_US"}` | N/A (defaults to en_US) |
| `template.language.code` | ❌ No | String | "en_US" | N/A (defaults to en_US) |
| `template.components` | ❌ No | Array | `[{...}]` | N/A (auto-generated if missing) |
| `image_url` | ❌ No | String | "https://..." | N/A (uses default if missing) |

---

## 🔐 AUTHENTICATION

**Required**: Yes - Must be an authenticated user
**Method**: Bearer Token in Authorization header
```
Authorization: Bearer <your_token>
```

---

## 📝 NOTES

1. **Template Status**: Only APPROVED templates can be sent. Pending/Rejected templates will return an error.
2. **Auto-Components**: If your template has an IMAGE header but you don't provide components, the API automatically adds an image header component.
3. **Contact Creation**: If contact doesn't exist, it's automatically created.
4. **Message Logging**: All sent templates are logged in `WhatsAppMessageLog`.
5. **Default Language**: If language is not specified, defaults to `en_US`.

---

## 🧪 TESTING WITH CURL

### Basic Template:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send-template/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to_number": "919999999999",
    "template": {
      "name": "order_confirmation"
    }
  }'
```

### With Components:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send-template/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to_number": "919999999999",
    "template": {
      "name": "order_confirmation",
      "language": {
        "code": "en_US"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {"type": "text", "text": "John"}
          ]
        }
      ]
    }
  }'
```

