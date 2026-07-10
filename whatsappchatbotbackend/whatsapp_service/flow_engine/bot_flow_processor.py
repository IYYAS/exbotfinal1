import logging
import time
from .engine import FlowEngine
from ..models import VendorSettings, ChatbotFlow
from ..client import WhatsAppClient
from users.models import Vendor

logger = logging.getLogger(__name__)


class BotFlowProcessor:
    """
    Matches an incoming message against active ChatbotFlow trigger keywords,
    walks the node graph, and fires the FlowEngine for each node.
    Replaces WhatsAppWebhookView.process_bot_flow().
    """

    def __init__(self, engine: FlowEngine = None):
        self._engine = engine or FlowEngine()

    def process(self, wa_id: str, msg: dict, vendor, contact):
        """
        Entry point — called after a message is received and logged.
        Handles both:
          1. Resuming a flow from a button/list click
          2. Triggering a new flow from a keyword match
        """
        msg_body, btn_node_id = self._extract_body_and_button(msg)
        msg_lower = msg_body.strip().lower()
        flows = self._get_active_flows(vendor)

        print(f"\n🤖 Bot flow check: '{msg_body}' (btn_node_id={btn_node_id}) against {flows.count()} active flow(s)")

        if btn_node_id:
            self._resume_from_button(wa_id, btn_node_id, flows, vendor)
        else:
            self._trigger_from_keyword(wa_id, msg_lower, flows, vendor)

    # ── Private helpers ──────────────────────────────────────────────────────

    def _extract_body_and_button(self, msg: dict):
        """Return (msg_body, btn_node_id) from any message type."""
        msg_type = msg.get('type', 'text')
        msg_body = ''
        btn_node_id = None

        if msg_type == 'text':
            msg_body = msg.get('text', {}).get('body', '')
        elif msg_type == 'interactive':
            interactive = msg.get('interactive', {})
            int_type = interactive.get('type')
            if int_type == 'button_reply':
                reply_obj = interactive.get('button_reply', {})
                msg_body = reply_obj.get('title', '')
                btn_id = reply_obj.get('id', '')
                if btn_id.startswith('flowbtn_'):
                    btn_node_id = btn_id.replace('flowbtn_', '')
            elif int_type == 'list_reply':
                list_reply = interactive.get('list_reply', {})
                msg_body = list_reply.get('title', '')
                btn_id = list_reply.get('id', '')
                if btn_id.startswith('flowrow_'):
                    btn_node_id = btn_id.replace('flowrow_', '')
                elif btn_id:
                    btn_node_id = btn_id

        return msg_body, btn_node_id

    def _get_active_flows(self, vendor):
        """Return all active flows for the vendor (shared phone_number_id aware)."""
        vendor_settings = VendorSettings.objects.filter(vendor=vendor).first()
        if vendor_settings and vendor_settings.whatsapp_phone_number_id:
            sharing_vendors = Vendor.objects.filter(
                settings__whatsapp_phone_number_id=vendor_settings.whatsapp_phone_number_id
            )
            return ChatbotFlow.objects.filter(vendor__in=sharing_vendors, is_active=True)
        return ChatbotFlow.objects.filter(vendor=vendor, is_active=True)

    def _normalise_nodes(self, nodes_raw):
        """Normalise nodes to a str-keyed dict regardless of source format."""
        if isinstance(nodes_raw, list):
            return {str(n.get('id', i)): n for i, n in enumerate(nodes_raw)}
        if isinstance(nodes_raw, dict):
            return nodes_raw
        return None

    def _resolve_node(self, nodes: dict, node_id: str):
        """Look up a node by string or integer key."""
        node = nodes.get(node_id) or nodes.get(str(node_id))
        if not node and node_id.isdigit():
            node = nodes.get(int(node_id))
        return node

    def _walk_and_execute(self, start_ids: list, nodes: dict, wa_id: str, vendor, flow, client):
        """BFS walk from start_ids, executing each node via FlowEngine."""
        if flow is not None and not self._contact_allowed_for_flow(flow, vendor, wa_id):
            print(f"    ⚠️  Skipping flow '{flow.name}' for contact {wa_id}: label mismatch")
            return

        visited = set()
        exec_queue = list(start_ids)
        flow_vendor = getattr(flow, 'vendor', vendor)

        while exec_queue:
            node_id = exec_queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = self._resolve_node(nodes, node_id)
            if not node:
                print(f"    ⚠️  Node {node_id} not found in flow")
                continue

            ntype_lower = str(node.get('type', '')).lower()

            # ── Smart Delay in Reply ──────────────────────────────────────
            if ntype_lower not in ('condition', 'condition node', 'start_flow', 'trigger'):
                node_data = node.get('data', {})
                delay_h = int(node_data.get('delay_hours', 0) or 0)
                delay_m = int(node_data.get('delay_minutes', 0) or 0)
                delay_s = int(node_data.get('delay_seconds', 0) or 0)
                total_delay = delay_h * 3600 + delay_m * 60 + delay_s
                if total_delay > 0:
                    print(f"    ⏳ Smart delay: waiting {total_delay}s before executing node {node_id} (type={ntype_lower})")
                    time.sleep(total_delay)
            # ─────────────────────────────────────────────────────────────

            if ntype_lower not in ('condition', 'condition node'):
                try:
                    self._engine.execute_node(client, wa_id, node, flow_vendor, nodes, flow)
                except Exception as node_err:
                    print(f"    ❌ Error executing node {node_id}: {node_err}")
                    logger.error(f"Flow node execution error: {node_err}")

            # Stop traversal at interactive nodes — wait for user input
            # Also stop at new_sequence_campaign and send_message_after to let Celery handle delivery
            if ntype_lower in ('interactive_msg', 'message node', 'interactive message'):
                print(f"    INFO: Interactive message node — waiting for button click input")
                continue
            if ntype_lower in ('new_sequence_campaign', 'new_sequence_campaign node'):
                print(f"    INFO: Sequence subscription node — Celery will handle scheduled delivery")
                # Continue flow traversal after subscribing; sequence steps are scheduled separately.
            if 'send_message_after' in ntype_lower:
                print(f"    INFO: Send-message-after node — Celery will send after delay, stopping traversal")
                continue

            # If this is a trigger node with sequence metadata, create a temporary sequence node execution
            if 'trigger' in ntype_lower:
                seq_name = node.get('data', {}).get('subscribe_sequence')
                if seq_name:
                    temp_sequence_node = {
                        'type': 'new_sequence_campaign',
                        'name': 'Subscribe to Sequence',
                        'data': {'sequence_name': seq_name}
                    }
                    self._engine.execute_node(client, wa_id, temp_sequence_node, flow_vendor, nodes, flow)
                    print(f"    INFO: Trigger node requested sequence subscription to '{seq_name}'")

            # Handle condition nodes
            if ntype_lower in ('condition', 'condition node'):
                print(f"    INFO: Evaluating condition node {node_id}")
                is_true = self._evaluate_condition_node(node, wa_id, flow_vendor)
                branch_key = 'true' if is_true else 'false'
                print(f"    INFO: Condition evaluated to {is_true}, branching to '{branch_key}'")

                queued_any = False
                # Try finding connections in the source node's outputs (explicit true/false output ports)
                print(f"    DEBUG: Condition node outputs keys: {list(node.get('outputs', {}).keys())}")
                for out_key, out_val in node.get('outputs', {}).items():
                    if branch_key in str(out_key).lower():
                        if isinstance(out_val, dict):
                            for conn in out_val.get('connections', []):
                                nid = str(conn.get('node', ''))
                                if nid and nid not in visited:
                                    print(f"    DEBUG: Queued '{nid}' via output key '{out_key}'")
                                    exec_queue.append(nid)
                                    queued_any = True

                # Fallback: search target nodes' inputs for the matching output port
                if not queued_any:
                    print(f"    DEBUG: No output key found for '{branch_key}', searching inputs of all nodes...")
                    for t_id, t_node in nodes.items():
                        if t_id == node_id or t_id in visited:
                            continue
                        for in_key, in_val in t_node.get('inputs', {}).items():
                            if isinstance(in_val, dict):
                                for conn in in_val.get('connections', []):
                                    conn_node = str(conn.get('node', ''))
                                    conn_output = str(conn.get('output', '')).lower()
                                    print(f"    DEBUG: Node {t_id} input '{in_key}' has conn from {conn_node} via output='{conn_output}'")
                                    if conn_node == str(node_id) and conn_output == branch_key:
                                        print(f"    DEBUG: ✅ Queued '{t_id}' via fallback input scan")
                                        exec_queue.append(t_id)
                                        queued_any = True

                if not queued_any:
                    print(f"    ⚠️  No branch node found for '{branch_key}' — check your flow connections!")

                continue  # Skip default output queueing

            # Queue this node's outputs
            for out_val in node.get('outputs', {}).values():
                if isinstance(out_val, dict):
                    for conn in out_val.get('connections', []):
                        nid = str(conn.get('node', ''))
                        if nid and nid not in visited:
                            exec_queue.append(nid)

    def _evaluate_condition_node(self, node: dict, wa_id: str, vendor):
        data = node.get('data', {})
        match_type = str(data.get('match_type', 'all')).lower()
        system_conds = data.get('system_conditions', [])
        custom_conds = data.get('custom_conditions', [])

        if not system_conds and not custom_conds:
            return True

        from ..models import Contact, ContactCustomField
        contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        if not contact:
            return False

        # Map UI variable names → actual Contact model field names
        SYSTEM_FIELD_MAP = {
            'phone': 'wa_id',
            'phone_number': 'wa_id',
            'name': 'first_name',
            'full_name': 'full_name',
            'first_name': 'first_name',
            'last_name': 'last_name',
            'email': 'email',
            'label': 'label',
            'last_messaged_at': 'last_messaged_at',
            'unread_messages_count': 'unread_messages_count',
        }

        def evaluate_single(cond, is_custom=False):
            var = cond.get('variable')
            op = str(cond.get('operator', '')).lower()
            target_val = str(cond.get('value', '')).lower()

            if not var:
                return True

            actual_val = None
            if is_custom:
                cf = ContactCustomField.objects.filter(contact=contact, custom_field__field_key=var).first()
                if cf and cf.value:
                    actual_val = str(cf.value).lower()
            else:
                model_field = SYSTEM_FIELD_MAP.get(var, var)
                if model_field == 'full_name':
                    first = getattr(contact, 'first_name', '') or ''
                    last = getattr(contact, 'last_name', '') or ''
                    raw_val = f"{first} {last}".strip()
                else:
                    raw_val = getattr(contact, model_field, None)
                actual_val = str(raw_val).lower() if raw_val is not None else ''

            if actual_val is None:
                actual_val = ''

            print(f"    🔍 Condition check: var={var} model_field={SYSTEM_FIELD_MAP.get(var, var)} op={op} actual='{actual_val}' target='{target_val}'")

            if op == 'equals':
                return actual_val == target_val
            elif op == 'not_equals':
                return actual_val != target_val
            elif op == 'contains':
                return target_val in actual_val
            elif op == 'not_contains':
                return target_val not in actual_val
            elif op == 'start_with':
                return actual_val.startswith(target_val)
            elif op == 'end_with':
                return actual_val.endswith(target_val)
            elif op == 'is_set':
                return bool(actual_val)
            elif op == 'is_not_set':
                return not bool(actual_val)
            elif op == 'less_than':
                try: return float(actual_val) < float(target_val)
                except: return False
            elif op == 'greater_than':
                try: return float(actual_val) > float(target_val)
                except: return False
            elif op == 'less_than_equal':
                try: return float(actual_val) <= float(target_val)
                except: return False
            elif op == 'greater_than_equal':
                try: return float(actual_val) >= float(target_val)
                except: return False

            return False

        results = []
        for cond in system_conds:
            results.append(evaluate_single(cond, False))
        for cond in custom_conds:
            results.append(evaluate_single(cond, True))

        if match_type == 'any':
            return any(results)
        return all(results)

    def _get_next_ids(self, node: dict):
        """Return all output node IDs from a node."""
        next_ids = []
        for out_val in node.get('outputs', {}).values():
            if isinstance(out_val, dict):
                for conn in out_val.get('connections', []):
                    nid = str(conn.get('node', ''))
                    if nid:
                        next_ids.append(nid)
        return next_ids

    def _resume_from_button(self, wa_id: str, btn_node_id: str, flows, vendor):
        """Resume a flow from a button/list click."""
        print(f"🎯 Resuming flow from button click node_id={btn_node_id}")
        for flow in flows:
            if not self._contact_allowed_for_flow(flow, vendor, wa_id):
                print(f"    ⚠️  Skipping flow '{flow.name}' for contact {wa_id}: label mismatch")
                continue

            nodes = self._normalise_nodes(flow.flow_data.get('nodes', {}))
            if nodes is None:
                continue

            if btn_node_id in nodes or (btn_node_id.isdigit() and int(btn_node_id) in nodes):
                button_node = nodes.get(btn_node_id) or nodes.get(int(btn_node_id))
                print(f"  ✅ Found clicked button node '{button_node.get('name')}' in flow '{flow.name}'")
                client = WhatsAppClient(vendor=flow.vendor)
                next_ids = self._get_next_ids(button_node)
                self._walk_and_execute(next_ids, nodes, wa_id, vendor, flow, client)
                return  # handled

    def _trigger_from_keyword(self, wa_id: str, msg_lower: str, flows, vendor):
        """Trigger a new flow based on keyword matching."""
        for flow in flows:
            if not self._contact_allowed_for_flow(flow, vendor, wa_id):
                print(f"  ⚠️  Skipping flow '{flow.name}' for contact {wa_id}: label mismatch")
                continue

            nodes = self._normalise_nodes(flow.flow_data.get('nodes', {}))
            if nodes is None:
                continue

            trigger_node = self._find_trigger_node(nodes)
            if not trigger_node:
                print(f"  ⚠️  Flow '{flow.name}': no trigger node found")
                continue

            if not self._keyword_matches(trigger_node, msg_lower, flow.name):
                continue

            # User's custom logic: the 'add_labels' field on the trigger node acts as a CONDITION.
            # If set, ONLY contacts with this label can trigger the flow.
            required_label = trigger_node.get('data', {}).get('add_labels')
            if required_label:
                from ..models import Contact
                contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
                if not contact or str(contact.label).strip().lower() != str(required_label).strip().lower():
                    print(f"  ⚠️ Keyword matched flow '{flow.name}', but contact '{wa_id}' lacks required label '{required_label}'")
                    continue

            print(f"  ✅ MATCHED flow '{flow.name}'! Executing nodes...")
            client = WhatsAppClient(vendor=flow.vendor)

            seq_name = trigger_node.get('data', {}).get('subscribe_sequence')
            if seq_name:
                temp_sequence_node = {
                    'type': 'new_sequence_campaign',
                    'name': 'Subscribe to Sequence',
                    'data': {'sequence_name': seq_name}
                }
                self._engine.execute_node(client, wa_id, temp_sequence_node, flow.vendor, nodes, flow)
                print(f"    INFO: Trigger node subscribed contact to sequence '{seq_name}'")

            # Still keep remove_labels action if present
            remove_labels = trigger_node.get('data', {}).get('remove_labels')
            if remove_labels:
                try:
                    from ..models import Contact
                    contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
                    if contact and str(contact.label).strip() == str(remove_labels).strip():
                        contact.label = None
                        contact.save(update_fields=['label'])
                        print(f"    INFO: Trigger node removed label from contact {wa_id}")
                except Exception as e:
                    print(f"    ⚠️ Error updating label from trigger node: {e}")

            next_ids = self._get_next_ids(trigger_node)
            self._walk_and_execute(next_ids, nodes, wa_id, vendor, flow, client)
            break  # Only trigger first matching flow

    def _find_trigger_node(self, nodes: dict):
        """Find the trigger node in a node map."""
        for node in nodes.values():
            ntype = str(node.get('type', '')).lower()
            if ntype in ('start_flow', 'trigger', 'trigger node') or node.get('id') in (1, '1'):
                return node
        return None

    def _contact_allowed_for_flow(self, flow, vendor, wa_id: str):
        """Return True if the given contact is allowed to execute the flow based on label."""
        if not getattr(flow, 'label', None):
            return True

        contact = None
        try:
            from ..models import Contact
            contact = Contact.objects.filter(vendor=vendor, wa_id=wa_id).first()
        except Exception:
            return False

        if not contact or not getattr(contact, 'label', None):
            return False

        return str(contact.label).strip().lower() == str(flow.label).strip().lower()

    def _keyword_matches(self, trigger_node: dict, msg_lower: str, flow_name: str) -> bool:
        """Return True if msg_lower matches the trigger node's keywords."""
        t_data = trigger_node.get('data', {})
        keywords_raw = (
            t_data.get('triggerKeyword', '') or
            t_data.get('trigger_keywords', '') or
            t_data.get('title', '')
        )
        match_type = (
            t_data.get('triggerMatchingType', '') or
            t_data.get('match_type', 'exact')
        ).lower()

        keywords = [k.strip().lower() for k in str(keywords_raw).split(',') if k.strip()]
        print(f"  📋 Flow '{flow_name}': keywords={keywords}, match={match_type}")

        for kw in keywords:
            if match_type in ('exact', 'exact keyword match'):
                if msg_lower == kw:
                    return True
            elif match_type in ('contains', 'contains keyword'):
                if kw in msg_lower:
                    return True
            elif match_type in ('starts', 'starts with keyword', 'startswith'):
                if msg_lower.startswith(kw):
                    return True
            else:
                if msg_lower == kw:
                    return True

        print(f"  ❌ No keyword match for flow '{flow_name}'")
        return False
