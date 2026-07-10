
from ..models import Contact, CustomField, ContactCustomField
import random
import string

def resolve_variables(text: str, wa_id: str, vendor) -> str:
    """Replace {{first_name}}, {{last_name}}, {{full_name}}, {{phone}} etc. with contact data."""
    if not text or '{{' not in text:
        return text
    try:
        contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        if contact:
            first = getattr(contact, 'first_name', '') or ''
            last  = getattr(contact, 'last_name', '')  or ''
            full  = f"{first} {last}".strip()
            phone = wa_id

            text = text.replace('{{first_name}}', first)
            text = text.replace('{{last_name}}',  last)
            text = text.replace('{{full_name}}',  full)
            text = text.replace('{{name}}',       full or first)
            text = text.replace('{{phone}}',      phone)
    except Exception as e:
        print(f"    ⚠️  Variable resolution error: {e}")
    return text


class TextHandler:
    """Handles 'text' / 'text node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        text = data.get('textMessage') or data.get('text', '')
        if text:
            text = resolve_variables(text, wa_id, vendor)
            client.send_message(wa_id, text)
            print(f"    ✉️  Sent text: {text[:60]}")


class ImageHandler:
    """Handles 'image' / 'image node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        url = data.get('url') or data.get('file', '')
        media_id = data.get('media_id')
        caption = resolve_variables(data.get('caption', ''), wa_id, vendor)
        if media_id:
            client.send_media_message(wa_id, 'image', media_id=media_id, caption=caption)
            print(f"    🖼️  Sent image using media_id: {media_id}")
        elif url:
            client.send_media_message(wa_id, 'image', media_url=url, caption=caption)
            print(f"    🖼️  Sent image: {url[:60]}")


class VideoHandler:
    """Handles 'video' / 'video node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        url = data.get('url') or data.get('file', '')
        media_id = data.get('media_id')
        caption = resolve_variables(data.get('caption', ''), wa_id, vendor)
        if media_id:
            client.send_media_message(wa_id, 'video', media_id=media_id, caption=caption)
            print(f"    📹  Sent video using media_id: {media_id}")
        elif url:
            client.send_media_message(wa_id, 'video', media_url=url, caption=caption)
            print(f"    📹  Sent video")


class AudioHandler:
    """Handles 'audio' / 'audio node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        url = data.get('url') or data.get('file', '')
        media_id = data.get('media_id')
        if media_id:
            client.send_media_message(wa_id, 'audio', media_id=media_id)
            print(f"    🎵  Sent audio using media_id: {media_id}")
        elif url:
            client.send_media_message(wa_id, 'audio', media_url=url)
            print(f"    🎵  Sent audio")


class DocumentHandler:
    """Handles 'file' / 'document' / 'document node' / 'file node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        url = data.get('url') or data.get('file', '')
        media_id = data.get('media_id')
        filename = data.get('filename', 'document')
        if media_id:
            client.send_media_message(wa_id, 'document', media_id=media_id, filename=filename)
            print(f"    📄  Sent document using media_id: {media_id}")
        elif url:
            client.send_media_message(wa_id, 'document', media_url=url, filename=filename)
            print(f"    📄  Sent document: {filename}")


class LocationHandler:
    """Handles 'location' / 'location node' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        lat      = data.get('latitude', '')
        lon      = data.get('longitude', '')
        loc_name = data.get('name', '')
        addr     = data.get('address', '')
        if lat and lon:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": wa_id,
                "type": "location",
                "location": {
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "name": loc_name,
                    "address": addr
                }
            }
            client._make_request("POST", f"{client.phone_number_id}/messages", payload)
            print(f"    📍  Sent location ({lat}, {lon})")


class InteractiveHandler:
    """
    Handles 'interactive_msg' / 'message node' / 'interactive message' flow nodes,
    as well as 'cta_button' / 'cta url button' nodes.
    """

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        ntype = str(node.get('type', '')).lower()

        # ── CTA URL Button ───────────────────────────────────────────────────
        if ntype in ('cta_button', 'cta url button', 'cta_button node'):
            data = node.get('data', {})
            header_text = data.get('header_text', '')
            body_text = data.get('text', '')
            footer_text = data.get('footer_text', '')
            button_text = data.get('button_text', 'Visit Website')
            button_url = data.get('button_url', data.get('url', ''))
            
            if button_url and body_text:
                client.send_cta_url_button(
                    wa_id,
                    body_text=body_text,
                    button_text=button_text,
                    button_url=button_url,
                    header_text=header_text,
                    footer_text=footer_text
                )
                print(f"    🔗  Sent CTA button")
            return

        # ── Interactive Message ──────────────────────────────────────────────
        data             = node.get('data', {})
        interactive_type = str(data.get('interactive_type', '') or 'button').lower()
        text             = data.get('textMessage') or data.get('text', 'Choose an option:')
        footer_text      = data.get('footer_text') or data.get('footerText', '')
        header_type      = data.get('header_type', 'none')   # 'none' | 'image_url' | 'image_id'
        header_text      = data.get('header_text') or data.get('headerText', '')

        if interactive_type == 'cta_url':
            button_text = data.get('button_text') or data.get('buttonText') or 'Visit Website'
            button_url = data.get('button_url') or data.get('url') or ''
            if button_url and text:
                client.send_cta_url_button(
                    wa_id,
                    body_text=text,
                    button_text=button_text,
                    button_url=button_url,
                    header_text=header_text,
                    footer_text=footer_text
                )
                print(f"    🔗  Sent CTA button via interactive_type=cta_url")
            else:
                print(f"    ⚠️  Skipping CTA URL interactive message: missing body text or URL")
            return

        if interactive_type == 'flow':
            flow_id = data.get('flow_id') or ''
            flow_button_text = data.get('button_text') or data.get('buttonText') or 'Open Flow'
            if flow_id:
                interactive_data = {
                    'type': 'flow',
                    'action': {
                        'flow_id': str(flow_id),
                        'button': {
                            'text': str(flow_button_text)[:20]
                        }
                    }
                }
                if header_type == 'text' and header_text:
                    interactive_data['header'] = {'type': 'text', 'text': header_text}
                if footer_text:
                    interactive_data['footer'] = {'text': footer_text}
                client.send_interactive_message(wa_id, interactive_data)
                print(f"    🔄  Sent flow interactive message for flow_id={flow_id}")
            else:
                print(f"    ⚠️  Skipping Flow interactive message: missing flow_id")
            return

        sections = []
        list_button_text = "View Options"

        if interactive_type == 'list':
            list_conns = node.get('outputs', {}).get('interactiveOutputList', {}).get('connections', [])
            if not list_conns:
                list_conns = node.get('outputs', {}).get('sections', {}).get('connections', [])

            if list_conns and isinstance(nodes, dict):
                for lconn in list_conns:
                    l_node_id = str(lconn.get('node', ''))
                    l_node = nodes.get(l_node_id) or nodes.get(int(l_node_id) if l_node_id.isdigit() else None)
                    if l_node and str(l_node.get('type', '')).lower() in ('list_message', 'list_message node'):
                        list_button_text = l_node.get('data', {}).get('buttonText') or "View Options"

                        # Get connected sections
                        sec_conns = l_node.get('outputs', {}).get('sections', {}).get('connections', [])
                        for sconn in sec_conns:
                            s_node_id = str(sconn.get('node', ''))
                            s_node = nodes.get(s_node_id) or nodes.get(int(s_node_id) if s_node_id.isdigit() else None)
                            if s_node and str(s_node.get('type', '')).lower() in ('section', 'section node'):
                                sec_title = s_node.get('data', {}).get('title') or f"Section {s_node_id}"
                                rows = []

                                # Get connected rows
                                row_conns = s_node.get('outputs', {}).get('rows', {}).get('connections', [])
                                for rconn in row_conns:
                                    r_node_id = str(rconn.get('node', ''))
                                    r_node = nodes.get(r_node_id) or nodes.get(int(r_node_id) if r_node_id.isdigit() else None)
                                    if r_node and str(r_node.get('type', '')).lower() in ('row', 'row node'):
                                        r_data = r_node.get('data', {})
                                        r_desc = r_data.get('description', '')
                                        row_obj = {
                                            "id": f"flowrow_{r_node_id}",
                                            "title": str(r_data.get('title') or f"Row {r_node_id}")[:24]
                                        }
                                        if r_desc:
                                            row_obj["description"] = str(r_desc)[:72]
                                        rows.append(row_obj)

                                if rows:
                                    sections.append({
                                        "title": str(sec_title)[:24],
                                        "rows": rows
                                    })

        interactive_data = None

        if sections:
            interactive_data = {
                "type": "list",
                "body": {"text": text},
                "action": {
                    "button": str(list_button_text)[:20],
                    "sections": sections
                }
            }
        else:
            # 2. Fallback to build buttons from connected Button Nodes
            btn_objs = []
            connections = node.get('outputs', {}).get('interactiveOutputButton', {}).get('connections', [])
            if not connections:
                connections = node.get('outputs', {}).get('buttonOutput', {}).get('connections', [])

            if not connections and isinstance(nodes, dict):
                next_conns = node.get('outputs', {}).get('next', {}).get('connections', [])
                connections = []
                for conn in next_conns:
                    btn_node_id = str(conn.get('node', ''))
                    btn_node = nodes.get(btn_node_id) or nodes.get(int(btn_node_id) if btn_node_id.isdigit() else None)
                    if btn_node and 'button' in str(btn_node.get('type', '')).lower():
                        connections.append(conn)

            if connections and isinstance(nodes, dict):
                for conn in connections:
                    btn_node_id = str(conn.get('node', ''))
                    btn_node = nodes.get(btn_node_id) or nodes.get(int(btn_node_id) if btn_node_id.isdigit() else None)
                    if btn_node:
                        b_data = btn_node.get('data', {})
                        b_text = b_data.get('buttonText') or b_data.get('text') or b_data.get('title') or f"Btn {btn_node_id}"
                        btn_objs.append({
                            "type": "reply",
                            "reply": {
                                "id": f"flowbtn_{btn_node_id}",
                                "title": str(b_text)[:20]
                            }
                        })

            # Fallback to static buttons array in node data
            if not btn_objs:
                buttons = data.get('buttons', [])
                for i, b in enumerate(buttons[:3]):
                    if isinstance(b, dict):
                        title = str(b.get('title') or b.get('text') or b.get('label') or '')
                        btn_id = str(b.get('id') or f"btn_{i}")
                    else:
                        title = str(b)
                        btn_id = f"btn_{i}"
                    if title:
                        btn_objs.append({
                            "type": "reply",
                            "reply": {
                                "id": btn_id,
                                "title": title[:20]
                            }
                        })

            if btn_objs:
                interactive_data = {
                    "type": "button",
                    "body": {"text": text},
                    "action": {"buttons": btn_objs}
                }

        if interactive_data:
            # ── Header ──────────────────────────────────────────────────────
            if interactive_type == 'list' and header_type in ('image_url', 'image_id', 'media'):
                print(f"    ⚠️  List interactive message does not support media headers; forcing text header")
                header_type = 'text'

            img_url = data.get('header_image_url', '').strip()
            img_id = data.get('header_image_id', '').strip()

            if header_type in ('image_url', 'media') and img_url:
                interactive_data["header"] = {
                    "type": "image",
                    "image": {"link": img_url}
                }
                print(f"    🖼️  Interactive header: image URL = {img_url[:60]}")
            elif header_type in ('image_id', 'media') and img_id:
                interactive_data["header"] = {
                    "type": "image",
                    "image": {"id": img_id}
                }
                print(f"    🖼️  Interactive header: image media_id = {img_id}")
            elif header_type == 'text' and header_text:
                interactive_data["header"] = {"type": "text", "text": header_text}
                print(f"    📝  Interactive header (text): {header_text}")
            elif header_type == 'text' and not header_text:
                print(f"    ⚠️  Interactive header type text selected but header text is empty; skipping header")

            # ── Footer ──────────────────────────────────────────────────────
            if footer_text:
                interactive_data["footer"] = {"text": footer_text}
                print(f"    📄  Interactive footer: {footer_text}")

            client.send_interactive_message(wa_id, interactive_data)
            if interactive_data["type"] == "list":
                print(f"    📜  Sent interactive list with {len(sections)} sections")
            else:
                print(f"    🔘  Sent interactive with {len(interactive_data['action']['buttons'])} buttons")
        else:
            text_body = text or data.get('body', '')
            if text_body:
                client.send_message(wa_id, text_body)


class ButtonHandler:
    """Handles 'button' / 'button node' flow nodes as routing points."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        node_id = node.get('id', '')
        name = node.get('name', 'Button Node')
        print(f"    🔘  Executing button node '{name}' ({node_id}) — routing to connected node(s)")
        # Button nodes do not send a WhatsApp message themselves; they simply route execution.
        # Actual message delivery should occur in the next connected node(s).
        return


class ListMessageHandler:
    """Handles 'list_message' / 'list_message node' / 'list message' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        text = data.get('textMessage') or data.get('text') or data.get('buttonText') or 'Choose an option:'
        footer_text = data.get('footer_text') or data.get('footerText', '')
        list_button_text = data.get('buttonText') or 'View Options'

        sections = []
        section_conns = node.get('outputs', {}).get('sections', {}).get('connections', [])
        if section_conns and isinstance(nodes, dict):
            for sconn in section_conns:
                s_node_id = str(sconn.get('node', ''))
                s_node = nodes.get(s_node_id) or nodes.get(int(s_node_id) if s_node_id.isdigit() else None)
                if s_node and str(s_node.get('type', '')).lower() in ('section', 'section node', 'list section'):
                    sec_title = s_node.get('data', {}).get('title') or f"Section {s_node_id}"
                    rows = []
                    row_conns = s_node.get('outputs', {}).get('rows', {}).get('connections', [])
                    for rconn in row_conns:
                        r_node_id = str(rconn.get('node', ''))
                        r_node = nodes.get(r_node_id) or nodes.get(int(r_node_id) if r_node_id.isdigit() else None)
                        if r_node and str(r_node.get('type', '')).lower() in ('row', 'row node', 'list row'):
                            r_data = r_node.get('data', {})
                            r_desc = r_data.get('description', '')
                            row_obj = {
                                'id': f'flowrow_{r_node_id}',
                                'title': str(r_data.get('title') or f'Row {r_node_id}')[:24]
                            }
                            if r_desc:
                                row_obj['description'] = str(r_desc)[:72]
                            rows.append(row_obj)
                    if rows:
                        sections.append({
                            'title': str(sec_title)[:24],
                            'rows': rows
                        })

        if sections:
            interactive_data = {
                'type': 'list',
                'body': {'text': text},
                'action': {
                    'button': str(list_button_text)[:20],
                    'sections': sections
                }
            }
            if footer_text:
                interactive_data['footer'] = {'text': footer_text}
            client.send_interactive_message(wa_id, interactive_data)
            print(f"    📜  Sent list message with {len(sections)} section(s)")
        else:
            print(f"    ⚠️  List message node has no sections/rows configured, skipping send")


class TemplateHandler:
    """Handles 'template_msg' / 'template_msg node' / 'template message' flow nodes."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        template_name    = data.get('template_name')
        language         = data.get('language', 'en_US')
        header_params    = data.get('header_params', '')
        header_media_url = data.get('header_media_url', '')
        header_media_type = data.get('header_media_type', '').lower()
        template_params  = data.get('template_params', '')
        button_params    = data.get('button_params', '')

        components = []

        if header_media_url and header_media_type:
            components.append({
                "type": "header",
                "parameters": [
                    {
                        "type": header_media_type,
                        header_media_type: {
                            "link": header_media_url
                        }
                    }
                ]
            })
        elif header_params:
            h_params_list = [p.strip() for p in header_params.split(',') if p.strip()]
            if h_params_list:
                components.append({
                    "type": "header",
                    "parameters": [
                        {"type": "text", "text": val} for val in h_params_list
                    ]
                })

        if template_params:
            params_list = [p.strip() for p in template_params.split(',') if p.strip()]
            if params_list:
                components.append({
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": val} for val in params_list
                    ]
                })

        if button_params:
            btn_params_list = [p.strip() for p in button_params.split(',') if p.strip()]
            for idx, btn_val in enumerate(btn_params_list):
                components.append({
                    "type": "button",
                    "sub_type": "url",
                    "index": str(idx),
                    "parameters": [{"type": "text", "text": btn_val}]
                })

        if not components:
            components = None

        if template_name:
            try:
                client.send_template_message(wa_id, template_name, language, components=components)
                print(f"    📄  Sent template message: {template_name}")
            except Exception as e:
                print(f"    ❌  Failed to send template message {template_name}: {e}")
        else:
            print(f"    ⚠️  Template message node missing template_name")


class SequenceSubscribeHandler:
    """Handles 'new_sequence_campaign' node — enrolls the contact into a Sequence."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        from ..models import Sequence, SequenceSubscription, Contact  # avoid circular import
        from django.utils import timezone
        from datetime import timedelta

        # Enforce flow-level label matching before performing any sequence subscription.
        if flow and getattr(flow, 'label', None):
            contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
            if not contact or not getattr(contact, 'label', None) or str(contact.label).strip().lower() != str(flow.label).strip().lower():
                print(f"    ⚠️  Skipping sequence subscribe for {wa_id}: contact label does not match flow label '{flow.label}'")
                return

        data = node.get('data', {})
        seq_name = (
            data.get('sequence_name') or
            data.get('subscribe_sequence') or
            data.get('title', '')
        ).strip()
        if not seq_name:
            print(f"    WARNING: Sequence node has no sequence_name set")
            return

        # Use get_or_create (same as views.py) so it works even if is_active=False
        sequence, created = Sequence.objects.get_or_create(
            vendor=vendor, name=seq_name,
            defaults={'is_active': True}
        )
        if created:
            print(f"    INFO: Created new sequence '{seq_name}' for vendor")
        else:
            print(f"    INFO: Found sequence '{seq_name}' (id={sequence.id})")

        contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        if not contact:
            existing = Contact.objects.filter(wa_id=wa_id).exclude(first_name='WhatsApp User').exclude(first_name__isnull=True).first()
            contact = Contact.objects.create(
                vendor=vendor, wa_id=wa_id,
                platform='whatsapp',
                first_name=existing.first_name if existing else 'WhatsApp User',
                last_name=existing.last_name if existing else None
            )

        def _step_delay_seconds(step):
            if not step:
                return 0
            step_data = getattr(step, 'data', {}) or {}
            delay_seconds = step_data.get('delay_seconds')
            if isinstance(delay_seconds, int):
                return delay_seconds
            if isinstance(delay_seconds, str) and delay_seconds.isdigit():
                return int(delay_seconds)
            return step.delay_minutes * 60

        first_step = sequence.steps.order_by('order').first()
        delay_seconds = _step_delay_seconds(first_step)
        subscription, created = SequenceSubscription.objects.update_or_create(
            contact=contact, sequence=sequence,
            defaults={
                'current_step': first_step,
                'status': 'active',
                'next_run_at': timezone.now() + timedelta(seconds=delay_seconds)
            }
        )
        delay_label = f"{delay_seconds}s" if delay_seconds < 60 else f"{delay_seconds // 60}m"
        if not first_step:
            print(f"    ⚠️  Sequence '{seq_name}' has no steps; subscription created but nothing will be scheduled")
        print(f"    SUCCESS: Subscribed {wa_id} to sequence '{seq_name}' (next in {delay_label}) subscription_id={subscription.id} created={created} current_step={getattr(first_step, 'id', None)}")

from django.utils import timezone





class LabelAssignHandler:
    """Handles 'label_assign' flow nodes to update contact labels."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        assign_label = data.get('assign_label', '').strip()
        if not assign_label:
            print(f"    ⚠️  Skipping label assign for {wa_id}: no label specified")
            return
        
        contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        if contact:
            contact.label = assign_label
            contact.save(update_fields=['label'])
            print(f"    SUCCESS: Assigned label '{assign_label}' to contact {wa_id}")
        else:
            print(f"    ⚠️  Could not assign label to {wa_id}: Contact not found")

class RandomNumberHandler:
    """Handles 'random_number' flow nodes to generate and store a random value."""

    def execute(self, client, wa_id, node, vendor, nodes=None, flow=None):
        data = node.get('data', {})
        use_numbers = data.get('use_numbers', False)
        use_upper = data.get('use_upper', False)
        use_lower = data.get('use_lower', False)
        use_special = data.get('use_special', False)
        length = int(data.get('length', 5))
        custom_field_key = data.get('custom_field', '')

        if not any([use_numbers, use_upper, use_lower, use_special]):
            print(f"    ⚠️  Skipping random number for {wa_id}: no character sets selected")
            return
            
        if not custom_field_key:
            print(f"    ⚠️  Skipping random number for {wa_id}: no custom field specified")
            return

        charset = ''
        if use_numbers:
            charset += string.digits
        if use_upper:
            charset += string.ascii_uppercase
        if use_lower:
            charset += string.ascii_lowercase
        if use_special:
            charset += string.punctuation

        generated_value = ''.join(random.choices(charset, k=length))

        contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        custom_field = CustomField.objects.filter(vendor=vendor, field_key=custom_field_key).first()

        if contact and custom_field:
            ContactCustomField.objects.update_or_create(
                contact=contact,
                custom_field=custom_field,
                defaults={'value': generated_value}
            )
            print(f"    SUCCESS: Generated '{generated_value}' and saved to custom field '{custom_field_key}' for contact {wa_id}")
        else:
            print(f"    ⚠️  Could not save random number: Contact or CustomField not found")

class FlowEngine:
    HANDLERS = [
        (('text', 'text node'),                                       TextHandler),
        (('image', 'image node'),                                     ImageHandler),
        (('video', 'video node'),                                     VideoHandler),
        (('audio', 'audio node'),                                     AudioHandler),
        (('file', 'document', 'document node', 'file node'),         DocumentHandler),
        (('location', 'location node'),                               LocationHandler),
        (('interactive_msg', 'message node', 'interactive message',
          'cta_button', 'cta url button', 'cta_button node'),                            InteractiveHandler),
        (('button', 'button node', 'quick reply button'),                              ButtonHandler),
        (('list_message', 'list_message node', 'list message'),                         ListMessageHandler),
        (('template_msg', 'template_msg node', 'template message'),  TemplateHandler),
        (('new_sequence_campaign', 'new_sequence_campaign node', 'sequence campaign'), SequenceSubscribeHandler),
        (('label_assign', 'label assign node'), LabelAssignHandler),
        (('random_number', 'random number generator'), RandomNumberHandler),


    ]

    def execute_node(self, client, wa_id, node, vendor, nodes=None, flow=None):
        """
        Execute a single flow node by dispatching to the appropriate handler.
        Trigger nodes are skipped silently.
        """
        ntype = str(node.get('type', '')).lower()
        name  = node.get('name', ntype)
        print(f"    📤 Executing node type='{ntype}' name='{name}'")

        if 'trigger' in ntype:
            return  # skip trigger node itself

        # send_message_after steps are handled by Celery (scheduled), skip in live traversal
        if 'send_message_after' in ntype:
            return

        for type_keys, handler_cls in self.HANDLERS:
            if ntype in type_keys:
                handler_cls().execute(client, wa_id, node, vendor, nodes, flow)
                return

        print(f"    ⚠️  Unknown node type '{ntype}' — skipped")


