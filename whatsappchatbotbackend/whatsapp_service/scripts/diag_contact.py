from django.utils import timezone
from whatsapp_service.models import Contact, SequenceSubscription, Sequence, SequenceStep, WhatsAppMessageLog
from datetime import timedelta

phone='918137077641'
contact = Contact.objects.filter(platform_id__endswith=phone).first() or Contact.objects.filter(wa_id=phone).first() or Contact.objects.filter(platform_id=phone).first()
print('contact', contact.id if contact else None, getattr(contact,'wa_id',None) if contact else None)
if contact:
    subs = SequenceSubscription.objects.filter(contact=contact)
    print('subscriptions count', subs.count())
    for s in subs:
        print('SUB', s.id, s.sequence.id if s.sequence else None, s.sequence.name if s.sequence else None, s.current_step.id if s.current_step else None, s.status, s.next_run_at)
else:
    print('no contact')

seqs = Sequence.objects.filter(name__icontains='marketing')
print('marketing sequences found:', seqs.count())
for seq in seqs:
    print('SEQ', seq.id, seq.uid, seq.name, getattr(seq.vendor,'id',None))
    steps = SequenceStep.objects.filter(sequence=seq).order_by('order')
    print('  steps count', steps.count())
    for st in steps:
        print('  STEP', st.order, st.id, (st.message_body or '')[:200], st.data)

now=timezone.now()
if contact:
    logs = WhatsAppMessageLog.objects.filter(contact=contact, is_incoming=False, messaged_at__gte=now-timedelta(minutes=5)).order_by('-messaged_at')[:50]
    for l in logs:
        print(l.messaged_at, (l.message_body or '')[:200])
else:
    print('no contact logs')
