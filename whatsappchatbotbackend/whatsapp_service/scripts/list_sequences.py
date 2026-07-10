from whatsapp_service.models import Sequence
for s in Sequence.objects.all():
    print('SEQ', s.id, s.name, s.uid, s.is_active, getattr(s.vendor,'id',None))
print('total', Sequence.objects.count())
