from whatsapp_service.models import Sequence, SequenceSubscription

seq = Sequence.objects.filter(id=1).first()
if not seq:
    print('Sequence id=1 not found')
else:
    print('Deleting Sequence:', seq.id, seq.name)
    res = seq.delete()
    print('Delete result:', res)
