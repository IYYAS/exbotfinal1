import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','core.settings')
django.setup()
from whatsapp_service.views import sync_sequences_from_flow
from whatsapp_service.models import ChatbotFlow, Sequence, SequenceSubscription, SequenceStep, Contact
from whatsapp_service.tasks import process_due_sequence_steps
from django.utils import timezone

flow = ChatbotFlow.objects.get(pk=16)
print('Syncing flow', flow.pk)
sync_sequences_from_flow(flow)
seq = Sequence.objects.filter(vendor=flow.vendor, name='marketing').first()
print('seq id', getattr(seq, 'id', None))
if seq:
    print('steps:', list(seq.steps.values('order','message_body')))
contact = Contact.objects.filter(wa_id='918137077641').first()
print('contact id', getattr(contact, 'id', None))
if seq and contact:
    print('Deleting existing subscriptions for contact+seq')
    SequenceSubscription.objects.filter(contact=contact, sequence=seq).delete()
    first = seq.steps.order_by('order').first()
    if first:
        sub = SequenceSubscription.objects.create(contact=contact, sequence=seq, current_step=first, status='active', next_run_at=timezone.now())
        print('created sub', sub.id, 'next_run_at', sub.next_run_at)
    else:
        print('no steps to subscribe to')

print('Running scheduler')
process_due_sequence_steps()
print('Done')
