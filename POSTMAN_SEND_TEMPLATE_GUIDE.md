# 📮 Postman Guide: Send Template API

**Endpoint:** `http://localhost:8000/api/whatsapp/send-template/`  
**Method:** `POST`  
**Authentication:** Required (Bearer Token)

---

## 🔑 Step 1: Get Authentication Token

### Login to Get Access Token

**Request:**
```
POST http://localhost:8000/api/users/login/
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your@email.com"
  },
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Copy the `access` token** - you'll need this for all authenticated requests!

---

## ⚙️ Step 2: Set Up Postman Headers

### Headers Tab Configuration

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {YOUR_ACCESS_TOKEN}` |

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiY29sIjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## 📤 Step 3: Send Template Message

### Basic Request (Simple Template)

**URL:** `http://localhost:8000/api/whatsapp/send-template/`

**Method:** `POST`

**Body (raw JSON):**
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "log_id": 123,
  "wamid": "wamid.HBEUGVlDQVNBREU...",
  "meta_response": {
    "messages": [
      {
        "id": "wamid.HBEUGVlDQVNBREU..."
      }
    ]
  }
}
```

---

## 📋 Advanced Examples

### Example 1: Template with Components (POSITIONAL Parameters)

**Use Case:** Template with variables like `"Hi {{1}}, your order {{2}} is ready"`

```json
{
  "to_number": "919999999999",
  "template": {
    "name": "order_confirmation_v1",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "John"
          },
          {
            "type": "text",
            "text": "ORD-12345"
          }
        ]
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "log_id": 124,
  "wamid": "wamid.HBEUGVlDQVNBREU...",
  "meta_response": {
    "messages": [
      {
        "id": "wamid.HBEUGVlDQVNBREU..."
      }
    ]
  }
}
```

---

### Example 2: Template with NAMED Parameters

**Use Case:** Template using named variables like `"Hi {{customer_name}}, code: {{otp}}"`

```json
{
  "to_number": "919999999999",
  "template": {
    "name": "otp_verification",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Sarah"
          },
          {
            "type": "text",
            "text": "123456"
          }
        ]
      }
    ]
  }
}
```

---

### Example 3: Template with Image Header

**Use Case:** Template with header image

```json
{
  "to_number": "919999999999",
  "template": {
    "name": "promo_with_image",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://example.com/promo-image.jpg"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Check out our sale!"
          }
        ]
      }
    ]
  },
  "image_url": "https://example.com/promo-image.jpg"
}
```

---

### Example 4: Template with Buttons

**Use Case:** Template that includes call-to-action buttons

```json
{
  "to_number": "919999999999",
  "template": {
    "name": "product_inquiry",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "New iPhone 15 available!"
          }
        ]
      },
      {
        "type": "buttons",
        "buttons": [
          {
            "type": "quick_reply",
            "text": "Learn More"
          },
          {
            "type": "quick_reply",
            "text": "Buy Now"
          }
        ]
      }
    ]
  }
}
```

---

### Example 5: Auto-Detect Image Header

**Use Case:** Let backend auto-add default image if template has IMAGE header

```json
{
  "to_number": "919999999999",
  "template": {
    "name": "marketing_banner_image",
    "language": {
      "code": "en_US"
    }
  }
}
```

**Backend will automatically add:**
```json
{
  "type": "header",
  "parameters": [
    {
      "type": "image",
      "image": {
        "link": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3kstLm9gMpqyvD8xQvozVcovOT3_HhpVSAg&s"
      }
    }
  ]
}
```

**Override with custom image:**
```json
{
  "to_number": "919999999999",
  "template": {
    "name": "marketing_banner_image",
    "language": {
      "code": "en_US"
    }
  },
  "image_url": "https://your-domain.com/custom-image.jpg"
}
```

---

## 🔴 Error Cases & Solutions

### Error 1: Missing Authentication Token

**Error Response:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Solution:**
- Copy the `access` token from login response
- Add to Headers: `Authorization: Bearer {token}`

---

### Error 2: Invalid Phone Number

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid phone number format"
}
```

**Solution:**
- Use format: `919999999999` (with country code, no spaces/dashes)
- Valid examples:
  - `919876543210` (India +91)
  - `14155552671` (US +1)
  - `441234567890` (UK +44)

---

### Error 3: Template Not Approved

**Error Response:**
```json
{
  "success": false,
  "error": "Template \"hello_world\" has status \"PENDING\" — only APPROVED templates can be sent."
}
```

**Solution:**
- Wait for Meta to approve the template (24-48 hours usually)
- Or check Meta Business Manager for approval status
- Use approved template name instead

---

### Error 4: Template Not Found

**Error Response:**
```json
{
  "success": false,
  "error": "Template not found"
}
```

**Solution:**
- Verify template name matches exactly (case-sensitive)
- Sync templates from Meta first: `POST /api/whatsapp/templates/sync/`
- Create template if not exists: `POST /api/whatsapp/templates/create/`

---

### Error 5: Missing Required Fields

**Error Response:**
```json
{
  "error": "to_number is required"
}
```

or

```json
{
  "error": "template object is required"
}
```

**Solution:**
- Check JSON structure in request body
- Ensure both `to_number` and `template` fields are present
- Validate JSON syntax

---

### Error 6: Parameter Count Mismatch

**Error Response:**
```json
{
  "success": false,
  "error": "Parameter format does not match format in the created template"
}
```

**Solution:**
- Count variables in template text: `"Hi {{1}}, order {{2}}..."` = 2 variables
- Provide exactly 2 parameters in components
- Match order exactly ({{1}} → parameters[0], {{2}} → parameters[1])

---

### Error 7: No Vendor Account

**Error Response:**
```json
{
  "error": "No vendor account associated with this user."
}
```

**Solution:**
- Log in with a user that has a vendor linked
- Or link vendor to user account in admin panel
- Check user has VendorSettings configured

---

## 📊 Postman Collection (JSON)

Copy this to create a full collection in Postman:

```json
{
  "info": {
    "name": "WhatsApp Template API",
    "description": "Complete collection for template management and sending"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"your_username\",\n  \"password\": \"your_password\"\n}"
        },
        "url": {
          "raw": "http://localhost:8000/api/users/login/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "users", "login", ""]
        }
      }
    },
    {
      "name": "2. Send Simple Template",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"to_number\": \"919999999999\",\n  \"template\": {\n    \"name\": \"hello_world\",\n    \"language\": {\n      \"code\": \"en_US\"\n    }\n  }\n}"
        },
        "url": {
          "raw": "http://localhost:8000/api/whatsapp/send-template/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "whatsapp", "send-template", ""]
        }
      }
    },
    {
      "name": "3. Send Template with Parameters",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"to_number\": \"919999999999\",\n  \"template\": {\n    \"name\": \"order_confirmation_v1\",\n    \"language\": {\n      \"code\": \"en_US\"\n    },\n    \"components\": [\n      {\n        \"type\": \"body\",\n        \"parameters\": [\n          {\n            \"type\": \"text\",\n            \"text\": \"John\"\n          },\n          {\n            \"type\": \"text\",\n            \"text\": \"ORD-12345\"\n          }\n        ]\n      }\n    ]\n  }\n}"
        },
        "url": {
          "raw": "http://localhost:8000/api/whatsapp/send-template/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "whatsapp", "send-template", ""]
        }
      }
    },
    {
      "name": "4. Send Template with Image",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"to_number\": \"919999999999\",\n  \"template\": {\n    \"name\": \"promo_with_image\",\n    \"language\": {\n      \"code\": \"en_US\"\n    },\n    \"components\": [\n      {\n        \"type\": \"header\",\n        \"parameters\": [\n          {\n            \"type\": \"image\",\n            \"image\": {\n              \"link\": \"https://example.com/image.jpg\"\n            }\n          }\n        ]\n      }\n    ]\n  },\n  \"image_url\": \"https://example.com/image.jpg\"\n}"
        },
        "url": {
          "raw": "http://localhost:8000/api/whatsapp/send-template/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "whatsapp", "send-template", ""]
        }
      }
    }
  ]
}
```

---

## 🎯 Quick Reference

### Required Fields
- ✅ `to_number` - Recipient WhatsApp number (with country code)
- ✅ `template` - Template object with:
  - ✅ `name` - Template name
  - ✅ `language.code` - Language code (default: en_US)

### Optional Fields
- ⭕ `template.components` - Component array (auto-built if omitted for image templates)
- ⭕ `image_url` - Custom image URL for templates with image header

### Response Fields
- `success` - Boolean indicating success/failure
- `log_id` - Message log ID in database
- `wamid` - WhatsApp message ID
- `meta_response` - Full response from Meta API
- `error` - Error message (if failed)

---

## 🔄 Complete Workflow

1. **Login** → Get access token
2. **Set Authorization Header** → `Bearer {access_token}`
3. **Create/Sync Template** (if needed) → Template must be APPROVED
4. **Send Template** → POST with to_number and template
5. **Check Response** → success=true means message sent
6. **Find in Chat** → Message appears on recipient's device

---

## 📞 Testing in Postman

### Test with cURL (Alternative)

```bash
curl -X POST http://localhost:8000/api/whatsapp/send-template/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "to_number": "919999999999",
    "template": {
      "name": "hello_world",
      "language": {"code": "en_US"}
    }
  }'
```

### Expected Success Response

```json
{
  "success": true,
  "log_id": 123,
  "wamid": "wamid.HBEUGVlDQVNBREU0MDAwNzcxNjkyMDU2NjQyOzp2aWExOjIxMjEyMjE=",
  "meta_response": {
    "messages": [
      {
        "id": "wamid.HBEUGVlDQVNBREU0MDAwNzcxNjkyMDU2NjQyOjp2aWExOjIxMjEyMjE="
      }
    ]
  }
}
```

---

## 🔍 Debug Tips

### View Server Logs

The backend prints extensive debug info:

```
================================================================================
📤 SENDING TEMPLATE - DEBUG INFO
================================================================================
To Number: 919999999999
Template Data: {'name': 'hello_world', 'language': {'code': 'en_US'}}
Full Request Data: {...}
================================================================================

================================================================================
🔍 TEMPLATE AUTO-DETECTION DEBUG
================================================================================
Template Name: hello_world
Local Template Found: True
Template Components: [{'type': 'body', 'text': '...'}]
✅ Has IMAGE Header: False
================================================================================

================================================================================
📤 CALLING CLIENT.SEND_TEMPLATE_MESSAGE
================================================================================
Template Name: hello_world
Language: en_US
Components Being Sent: []
Final template_data object: {...}
================================================================================

================================================================================
✅ TEMPLATE SEND RESULT
================================================================================
Result: {'messages': [{'id': 'wamid.HBE...'}]}
================================================================================
```

---

## 📱 Real-World Examples

### Example 1: Order Confirmation

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "order_confirmation_v2",
    "language": {"code": "en_US"},
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "Rajesh Kumar"},
          {"type": "text", "text": "ORD-2024-001234"},
          {"type": "text", "text": "$599.99"},
          {"type": "text", "text": "May 30, 2024"}
        ]
      }
    ]
  }
}
```

### Example 2: OTP Verification

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "otp_auth_security",
    "language": {"code": "en_US"},
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "123456"}
        ]
      }
    ]
  }
}
```

### Example 3: Promotional with Image

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "summer_sale_2024",
    "language": {"code": "en_US"},
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://your-cdn.com/summer-banner.jpg"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "50% OFF"},
          {"type": "text", "text": "May 26 - June 2"}
        ]
      }
    ]
  },
  "image_url": "https://your-cdn.com/summer-banner.jpg"
}
```

---

**Version:** 1.0  
**Last Updated:** May 26, 2026  
**Status:** Complete
