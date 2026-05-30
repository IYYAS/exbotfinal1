# Complete SendTemplate Request - All Fields

## FULL REQUEST WITH ALL FIELDS:

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "hello_world",
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
  },
  "image_url": "https://example.com/image.jpg"
}
```

---

## FIELD DESCRIPTIONS:

### **1. to_number** ⭐ REQUIRED
- **Type**: String
- **Example**: "919876543210"
- **What it is**: Recipient's WhatsApp number with country code
- **Format**: Country code + mobile number (no + or spaces)
- **Examples**:
  - India: "919999999999"
  - USA: "14155552671"
  - UK: "441632960000"

### **2. template** ⭐ REQUIRED
- **Type**: Object
- **Contains**: name, language, components

### **2a. template.name** ⭐ REQUIRED
- **Type**: String
- **Example**: "hello_world"
- **What it is**: Name of your WhatsApp template (must be APPROVED in Meta)
- **Common examples**:
  - "order_confirmation"
  - "hello_world"
  - "promotional_image"
  - "receipt_template"

### **2b. template.language** ❌ OPTIONAL
- **Type**: Object
- **Default**: { "code": "en_US" }
- **What it is**: Language configuration

### **2c. template.language.code** ❌ OPTIONAL
- **Type**: String
- **Default**: "en_US"
- **Example**: "en_US"
- **Other options**:
  - "hi_IN" (Hindi)
  - "ar_AR" (Arabic)
  - "es_ES" (Spanish)
  - "fr_FR" (French)
  - "pt_BR" (Portuguese Brazil)

### **2d. template.components** ❌ OPTIONAL
- **Type**: Array of Objects
- **What it is**: Variable values for your template
- **When needed**: Only if your template has placeholders {{1}}, {{2}}, etc.

### **2e. template.components[].type** 
- **Type**: String
- **Example**: "body"
- **Value**: "body" or "header"

### **2f. template.components[].parameters**
- **Type**: Array of Objects
- **Contains**: Type and value of each parameter

### **2g. template.components[].parameters[].type**
- **Type**: String
- **Example**: "text"
- **Options**: "text", "image", "document", "video"

### **2h. template.components[].parameters[].text** (for text type)
- **Type**: String
- **Example**: "John Doe"
- **What it is**: The actual text value for placeholder

### **3. image_url** ❌ OPTIONAL (Top Level)
- **Type**: String
- **Example**: "https://example.com/image.jpg"
- **What it is**: Image URL for templates with IMAGE header
- **When needed**: Only for templates with image headers
- **Default**: Auto-uses default image if not provided

---

## MINIMAL REQUEST (JUST REQUIRED FIELDS):

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "hello_world"
  }
}
```

---

## REQUEST WITH LANGUAGE:

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

## REQUEST WITH TEMPLATE VARIABLES (BODY PARAMETERS):

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
          {
            "type": "text",
            "text": "John Doe"
          },
          {
            "type": "text",
            "text": "Order #12345"
          },
          {
            "type": "text",
            "text": "$99.99"
          }
        ]
      }
    ]
  }
}
```

---

## REQUEST WITH IMAGE HEADER:

```json
{
  "to_number": "919876543210",
  "template": {
    "name": "promotional_image",
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
              "link": "https://example.com/promo.jpg"
            }
          }
        ]
      }
    ]
  },
  "image_url": "https://example.com/promo.jpg"
}
```

---

## REQUEST WITH MULTIPLE PARAMETERS:

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
          {
            "type": "text",
            "text": "John"
          },
          {
            "type": "text",
            "text": "12345"
          },
          {
            "type": "text",
            "text": "2024-05-26"
          },
          {
            "type": "text",
            "text": "In Transit"
          }
        ]
      }
    ]
  }
}
```

---

## POSTMAN SETUP:

1. **URL**: `http://localhost:8000/api/whatsapp/send-template/`
2. **Method**: POST
3. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_AUTH_TOKEN`
4. **Body**: Raw JSON (select "JSON" from dropdown)
5. **Copy-paste** one of the examples above

---

## QUICK CHECKLIST:

✅ `to_number` - Your recipient's WhatsApp number (with country code)
✅ `template.name` - Name of your APPROVED template
❌ `template.language` - Optional (defaults to en_US)
❌ `template.components` - Only if template has variables
❌ `image_url` - Only if template has image header

