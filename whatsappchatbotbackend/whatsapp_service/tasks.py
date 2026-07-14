from django.utils import timezone
from datetime import timedelta
from .models import SequenceSubscription
from .client import WhatsAppClient

from celery import shared_task
from .models import ChatbotFlow
from .flow_engine.engine import FlowEngine, _log_outgoing_message
from .flow_engine.bot_flow_processor import BotFlowProcessor
from .models import WhatsAppMessageLog


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


@shared_task
def process_due_sequence_steps():
    print('🔄 process_due_sequence_steps running at', timezone.now())
    due = SequenceSubscription.objects.filter(
        status='active', next_run_at__lte=timezone.now()
    ).select_related('current_step', 'sequence', 'contact', 'sequence__vendor')
    print(f'  🔎 Found {due.count()} due sequence subscriptions')

    for sub in due:
        step = sub.current_step
        print(f'  ▶️ Processing subscription {sub.id} contact={sub.contact.wa_id} sequence={sub.sequence.name} current_step={getattr(step, "order", None)} next_run_at={sub.next_run_at}')
        if not step:
            print('    ⚠️  Subscription has no current step; marking completed')
            sub.status = 'completed'
            sub.save()
            continue

        client = WhatsAppClient(vendor=sub.sequence.vendor)
        try:
            # Short-term dedupe: if we sent the same text to this contact
            # very recently, skip sending again to avoid duplicates from
            # race conditions or concurrent workers.
            def _norm(s):
                return ' '.join(str(s or '').split()).strip().lower()

            recent_window = timezone.now() - timedelta(seconds=15)
            recent = WhatsAppMessageLog.objects.filter(
                contact_wa_id=sub.contact.wa_id,
                is_incoming=False,
                messaged_at__gte=recent_window
            ).order_by('-messaged_at')
            already_sent = False
            for r in recent:
                if _norm(r.message_body) == _norm(step.message_body):
                    print(f"    ⚠️  Skipping send: identical message recently sent at {r.messaged_at}")
                    already_sent = True
                    break

            if already_sent:
                result = {'skipped': True}
            else:
                result = client.send_message(sub.contact.wa_id, step.message_body)
                _log_outgoing_message(sub.contact.wa_id, sub.sequence.vendor, 'text', step.message_body, result)
            print(f'    ✅ Sent sequence message for sub {sub.id}: {step.message_body!r}')
            print(f'    📤 send_message result: {result}')
            # Optional follow-up payload: send extra text and/or media immediately
            try:
                step_data = getattr(step, 'data', {}) or {}
                follow = step_data.get('_followup') or step_data.get('followup')
                if follow:
                    # follow can be a string (text) or dict {text, media_url, media_id, media_type}
                    if isinstance(follow, str):
                        result = client.send_message(sub.contact.wa_id, follow)
                        _log_outgoing_message(sub.contact.wa_id, sub.sequence.vendor, 'text', follow, result)
                        print(f"    ✉️  Sent follow-up text for sub {sub.id}: {follow!r}")
                    elif isinstance(follow, dict):
                        ftext = follow.get('text')
                        if ftext:
                            result = client.send_message(sub.contact.wa_id, ftext)
                            _log_outgoing_message(sub.contact.wa_id, sub.sequence.vendor, 'text', ftext, result)
                            print(f"    ✉️  Sent follow-up text for sub {sub.id}: {ftext!r}")
                        # send image/video/audio/document if provided
                        media_id = follow.get('media_id')
                        media_url = follow.get('media_url')
                        media_type = (follow.get('media_type') or '').lower()
                        if media_id or media_url:
                            if not media_type:
                                media_type = 'image'
                            try:
                                result = client.send_media_message(sub.contact.wa_id, media_type, media_id=media_id, media_url=media_url)
                                _log_outgoing_message(
                                    sub.contact.wa_id,
                                    sub.sequence.vendor,
                                    media_type,
                                    ftext or f"[{media_type.upper()}]",
                                    result,
                                    attachment=media_id or media_url
                                )
                                print(f"    🖼️  Sent follow-up media ({media_type}) for sub {sub.id}")
                            except Exception as em:
                                print(f"    ❌ Failed to send follow-up media for sub {sub.id}: {em}")
            except Exception as fe:
                print(f'    ⚠️  Follow-up send failed for sub {sub.id}: {fe}')
        except Exception as exc:
            print(f'    ❌ Failed to send sequence message for sub {sub.id}: {exc}')
            sub.status = 'completed'
            sub.next_run_at = None
            sub.save()
            continue

        # If this sequence step references a connected live-flow child node,
        # execute that node (and the subsequent live-flow nodes) immediately.
        try:
            step_data = getattr(step, 'data', {}) or {}
            flow_pk = step_data.get('_flow_pk')
            child_next = step_data.get('_child_next_node_id')
            if flow_pk and child_next:
                flow = ChatbotFlow.objects.filter(pk=flow_pk).first()
                if flow:
                    nodes = flow.flow_data.get('nodes', {}) or {}
                    if isinstance(nodes, list):
                        nodes = {str(n.get('id')): n for n in nodes}
                    child_node = nodes.get(str(child_next)) or nodes.get(int(child_next) if str(child_next).isdigit() else None)
                    if child_node:
                        print(f"    🔁 Executing connected live-flow node {child_next} from flow {flow_pk}")
                        engine = FlowEngine()
                        bot_proc = BotFlowProcessor(engine)
                        # Avoid double-send: if the child node is a Text node and its
                        # text matches the sequence step message_body, skip executing
                        # the child node's send and only walk its outputs instead.
                        ctype = str(child_node.get('type', '')).lower()
                        if 'text' in ctype:
                            child_text = child_node.get('data', {}).get('textMessage') or child_node.get('data', {}).get('text') or ''
                            # Normalize whitespace and case for comparison to avoid
                            # false negatives due to newlines, extra spaces, or casing.
                            def _norm(s):
                                return ' '.join(str(s or '').split()).strip().lower()
                            if child_text and _norm(child_text) == _norm(step.message_body or ''):
                                print(f"    ⚠️  Skipping duplicate send for child text node {child_next}")
                                next_ids = bot_proc._get_next_ids(child_node)
                                bot_proc._walk_and_execute(next_ids, nodes, sub.contact.wa_id, sub.sequence.vendor, flow, client)
                            else:
                                engine.execute_node(client, sub.contact.wa_id, child_node, sub.sequence.vendor, nodes, flow)
                                next_ids = bot_proc._get_next_ids(child_node)
                                bot_proc._walk_and_execute(next_ids, nodes, sub.contact.wa_id, sub.sequence.vendor, flow, client)
                        else:
                            engine.execute_node(client, sub.contact.wa_id, child_node, sub.sequence.vendor, nodes, flow)
                            next_ids = bot_proc._get_next_ids(child_node)
                            bot_proc._walk_and_execute(next_ids, nodes, sub.contact.wa_id, sub.sequence.vendor, flow, client)
        except Exception as e:
            print(f'    ⚠️  Failed to execute connected live-flow nodes: {e}')

        next_step = sub.sequence.steps.filter(order__gt=step.order).first()
        if next_step:
            sub.current_step = next_step
            sub.next_run_at = timezone.now() + timedelta(seconds=_step_delay_seconds(next_step))
            print(f'    ⏭ Scheduled next step {next_step.id} in {sub.next_run_at}')
        else:
            print(f'    🎉 No next step; completing subscription {sub.id}')
            sub.status = 'completed'
            sub.next_run_at = None
        sub.save()