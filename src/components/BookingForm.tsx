import { useState } from 'react';
import { createBooking } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { Check, Sparkles, Banknote, CreditCard } from 'lucide-react';

const MASSAGE_OPTIONS = [
  { value: 'Swedish Massage — \u20ac100', label: 'Swedish Massage', price: 100, desc: 'Gentle, relaxing full-body massage' },
  { value: 'Deep Tissue Massage — \u20ac150', label: 'Deep Tissue Massage', price: 150, desc: 'Focused pressure on deep muscle layers' },
  { value: 'Swedish Deep Tensions — \u20ac180', label: 'Swedish Deep Tensions', price: 180, desc: 'Premium combination technique' },
  { value: 'Breath Massage — \u20ac250', label: 'Breath Massage', price: 250, desc: 'Deep relaxation breathwork massage' },
  { value: 'Massage Extra — \u20ac50', label: 'Massage Extra', price: 50, desc: 'Quick targeted massage session' },
];

export default function BookingForm({ onSuccess }: { onSuccess: () => void }) {
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [massageType, setMassageType] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [extraService, setExtraService] = useState('0');
  const [saving, setSaving] = useState(false);

  const selectedOption = MASSAGE_OPTIONS.find((o) => o.value === massageType);
  const extraAmount = parseFloat(extraService) || 0;
  const totalPrice = selectedOption ? selectedOption.price + extraAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phoneNumber || !massageType || !sessionStart) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await createBooking({
        clientName, phoneNumber, massageType,
        sessionStart: new Date(sessionStart).toISOString(),
        notes: notes || undefined,
        paymentMethod: paymentMethod || undefined,
        extraService: extraAmount || undefined,
      });
      toast.success('Booking created successfully');
      onSuccess();
    } catch { toast.error('Failed to create booking'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Select Service</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MASSAGE_OPTIONS.map((opt) => {
            const selected = massageType === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setMassageType(opt.value)}
                className={`relative p-4 rounded-lg border text-left transition-all ${selected ? 'border-primary bg-primary/10 shadow-[0_0_12px_hsla(43,74%,49%,0.15)]' : 'border-border bg-card hover:border-primary/40'}`}>
                {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></div>}
                <p className="font-serif font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                <p className="text-primary font-bold mt-2">\u20ac{opt.price}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clientName" className="text-xs uppercase tracking-wider text-muted-foreground">Client Name *</Label>
          <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" className="mt-1.5 bg-muted border-border" />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
          <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+32 ..." className="mt-1.5 bg-muted border-border" />
        </div>
      </div>
      <div>
        <Label htmlFor="start" className="text-xs uppercase tracking-wider text-muted-foreground">Session Start *</Label>
        <Input id="start" type="datetime-local" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} className="mt-1.5 bg-muted border-border" />
      </div>
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Method</Label>
        <div className="flex gap-2">
          {[{ value: 'Cash', icon: 'Banknote', label: 'Cash' }, { value: 'Credit Card', icon: 'CreditCard', label: 'Credit Card' }].map((pm) => (
            <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border text-xs font-medium transition-all ${paymentMethod === pm.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:border-primary/40'}`}>
              {pm.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Extra Service (\u20ac)</Label>
        <Select value={extraService} onValueChange={setExtraService}>
          <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="No extra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No extra</SelectItem>
            {[20, 30, 50, 60, 70, 80, 90, 100, 150, 200].map((a) => (
              <SelectItem key={a} value={String(a)}>\u20ac{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes" className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests..." rows={3} className="mt-1.5 bg-muted border-border resize-none" />
      </div>
      {selectedOption && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><span className="text-sm">{selectedOption.label}</span></div>
            <span className="text-sm">\u20ac{selectedOption.price}</span>
          </div>
          {extraAmount > 0 && <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Extra service</span><span>+\u20ac{extraAmount}</span></div>}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold text-sm">Total</span>
            <span className="font-serif font-bold text-primary text-lg">\u20ac{totalPrice}</span>
          </div>
        </div>
      )}
      <Button type="submit" disabled={saving} className="w-full h-11 font-semibold">{saving ? 'Creating...' : 'Create Booking'}</Button>
    </form>
  );
}