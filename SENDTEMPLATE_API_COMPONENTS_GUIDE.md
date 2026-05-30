# SendTemplate API - Complete Field Reference with Components

## 📋 ALL FIELDS EXPLAINED

### **1. to_number** ⭐ REQUIRED
```
Type: String
Required: Yes
Example: "919876543210"
Description: Recipient's WhatsApp number (country code + mobile, no + or spaces)

Format: [CountryCode][MobileNumber]
Examples:
  - India: "919876543210"
  - USA: "14155552671"
  - UK: "441632960000"
```

---

### **2. template** ⭐ REQUIRED
```
Type: Object
Required: Yes
Description: Template configuration object
```

#### **2a. template.name** ⭐ REQUIRED
```
Type: String
Required: Yes
Example: "order_confirmation"
Description: Name of your WhatsApp template (must be APPROVED on Meta)

Common Examples:
  - hello_world
  - order_confirmation
  - promotional_image
  - delivery_update
  - receipt_template
```

#### **2b. template.language** ❌ OPTIONAL
```
Type: Object
Required: No
Default: { "code": "en_US" }
Description: Language configuration for the template
```

##### **2b.1 template.language.code** ❌ OPTIONAL
```
Type: String
Required: No (within language object)
Default: "en_US"
Description: Language code for template

Common Codes:
  - "en_US" - English (USA) [DEFAULT]
  - "en_GB" - English (UK)
  - "hi_IN" - Hindi (India)
  - "ar_AR" - Arabic
  - "es_ES" - Spanish
  - "pt_BR" - Portuguese (Brazil)
  - "fr_FR" - French
  - "de_DE" - German
  - "it_IT" - Italian
  - "ja_JP" - Japanese
  - "zh_CN" - Chinese (Simplified)
```

#### **2c. template.components** ❌ OPTIONAL
```
Type: Array of Objects
Required: No
Default: [] (auto-generated if not provided)
Description: Template variable values and header configurations

⚠️ Important Notes:
  - Auto-generated if not provided
  - Only needed if template has variables {{1}}, {{2}}, etc.
  - Only needed if template has IMAGE/VIDEO header
```

---

## 📦 Components Structure (Detailed)

### **Component Type: body**
For templates with text variables/parameters in body

```json
{
  "type": "body",
  "parameters": [
    {
      "type": "text",
      "text": "value for {{1}}"
    },
    {
      "type": "text",
      "text": "value for {{2}}"
    },
    {
      "type": "text",
      "text": "value for {{3}}"
    }
  ]
}
```

**Parameters:**
- `type`: "text" (the parameter type)
- `text`: The actual value to fill the variable

**Examples:**
```json
{
  "type": "body",
  "parameters": [
    {"type": "text", "text": "John Doe"},
    {"type": "text", "text": "Order #12345"},
    {"type": "text", "text": "$99.99"}
  ]
}
```

---

### **Component Type: header (with IMAGE)**
For templates with image header

```json
{
  "type": "header",
  "parameters": [
    {
      "type": "image",
      "image": {
        "link": "https://example.com/image.jpg"
      }
    }
  ]
}
```

**Supported Image URL:**
- Must be HTTPS
- Common formats: JPG, PNG, GIF
- Max size: ~5 MB

**Example:**
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

---

### **Component Type: header (with VIDEO)**
For templates with video header

```json
{
  "type": "header",
  "parameters": [
    {
      "type": "video",
      "video": {
        "link": "https://example.com/video.mp4"
      }
    }
  ]
}
```

---

### **Component Type: header (with DOCUMENT)**
For templates with document header

```json
{
  "type": "header",
  "parameters": [
    {
      "type": "document",
      "document": {
        "link": "https://example.com/document.pdf"
      }
    }
  ]
}
```

---

## 📝 COMPLETE REQUEST EXAMPLES

### **Example 1: Minimal (Text Template, No Variables)**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "hello_world"
  }
}
```

---

### **Example 2: With Language**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
}
```

---

### **Example 3: With Body Variables**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "John Doe"},
          {"type": "text", "text": "Order #ORD-2024-001"},
          {"type": "text", "text": "$299.99"}
        ]
      }
    ]
  }
}
```

---

### **Example 4: With Image Header**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "promotional_banner",
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
              "link": "https://example.com/banner.jpg"
            }
          }
        ]
      }
    ]
  }
}
```

---

### **Example 5: With Image + Body Variables**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "promotional_product",
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
              "link": "https://example.com/product.jpg"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "Electronics"},
          {"type": "text", "text": "Save 50% today"},
          {"type": "text", "text": "Limited time offer"}
        ]
      }
    ]
  }
}
```

---

### **Example 6: Hindi Language with Variables**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "hi_IN"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "जॉन डो"},
          {"type": "text", "text": "ऑर्डर #12345"},
          {"type": "text", "text": "₹5000"}
        ]
      }
    ]
  }
}
```

---

### **Example 7: Multiple Body Variables (5 variables)**
```json
{
  "to_number": "919876543210",
  "template": {
    "name": "delivery_status",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "John Doe"},
          {"type": "text", "text": "Order #ORD-2024-001"},
          {"type": "text", "text": "2024-05-26"},
          {"type": "text", "text": "In Transit"},
          {"type": "text", "text": "Track: https://example.com/track"}
        ]
      }
    ]
  }
}
```

---

## ✅ VALIDATION CHECKLIST

| Field | Required | Type | Provided | Valid |
|-------|----------|------|----------|-------|
| `to_number` | ✅ | String | ? | ? |
| `template` | ✅ | Object | ? | ? |
| `template.name` | ✅ | String | ? | ? |
| `template.language` | ❌ | Object | ? | ? |
| `template.language.code` | ❌ | String | ? | ? |
| `template.components` | ❌ | Array | ? | ? |

---

## 🚀 API URL

```
POST http://localhost:8000/api/whatsapp/send-template/
```

---

## 📨 HEADERS REQUIRED

```
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## ⚠️ COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `to_number is required` | Missing `to_number` field | Add `"to_number": "919876543210"` |
| `template object is required` | Missing `template` object | Add `"template": {...}` |
| `template.name is required` | Missing `template.name` | Add `"name": "hello_world"` inside template |
| `Template status is PENDING` | Template not approved on Meta | Wait for Meta approval or sync templates |
| `Invalid WhatsApp number` | Wrong phone number format | Use format: Country code + number (no +) |
| `Component type must be body or header` | Wrong component type | Use only `"body"` or `"header"` |
| `Parameter type not supported` | Invalid parameter type | Use: `text`, `image`, `document`, `video` |

---

## 🎯 Quick Reference

**Minimum required:**
- `to_number`: WhatsApp number
- `template`: Object
- `template.name`: Template name

**Optional but useful:**
- `template.language.code`: Language (defaults to en_US)
- `template.components`: For variables/images

**Auto-generated:**
- Components are auto-generated if template has image header but none provided

