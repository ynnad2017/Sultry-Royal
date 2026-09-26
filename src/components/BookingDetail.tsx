import { useState } from 'react';
import { format } from 'date-fns';
import { updateBooking } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Calendar, FileText, Euro, Hash, Trash2, Pencil, X, Banknote, CreditCard } from 'lucide-react';

const MASSAGE_OPTIONS = [
  { value: 'Swedish Massage — \u20ac100', label: 'Swedish Massage', price: 100 },
  { value: 'Deep Tissue Massage — \u20ac150', label: 'Deep Tissue Massage', price: 150 },
  { value: 'Swedish Deep Tensions — \u20ac180', label: 'Swedish Deep Tensions', price: 180 },
  { value: 'Breath Massage — \u20ac250', label: 'Breath Massage', price: 250 },
  { value: 'Massage Extra — \u20ac50', label: 'Massage Extra', price: 50 },
];

interface BookingDetailProps {
  booking: Record<string, any>;
  onBack: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export default function BookingDetail({ booking, onBack, onDelete, onStatusChange }: BookingDetailProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState(booking.clientName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(booking.phoneNumber ?? '');
  const [massageType, setMassageType] = useState(booking.massageType ?? '');
  const [sessionStart, setSessionStart] = useState(booking.sessionStart ? toLocalDatetime(booking.sessionStart) : '');
  const [paymentMethod, setPaymentMethod] = useState(booking.paymentMethod ?? '');
  const [extraService, setExtraService] = useState(String(booking.extraService ?? '0'));
  const [notes, setNotes] = useState(booking.notes ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBooking({ id: booking.id, clientName, phoneNumber, massageType, sessionStart: sessionStart ? new Date(sessionStart).toISOString() : undefined, paymentMethod: paymentMethod || undefined, notes, extraService: parseFloat(extraService) || undefined });
      toast.success('Booking updated');
      setEditing(false);
      onBack();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const startStr = booking.sessionStart ? format(new Date(booking.sessionStart), 'EEEE, MMMM d, yyyy \u00b7 h:mm a') : '\u2014';

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /> Back to bookings</button>
      <div className="bg-card border-gold-glow rounded-lg p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            {editing ? <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="bg-muted border-border font-serif text-xl font-bold h-9" /> : <h2 className="font-serif text-xl font-bold">{booking.clientName}</h2>}
            <p className="text-sm text-muted-foreground mt-0.5">{booking.massageType}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-primary text-xl">\u20ac{booking.price}</span>
            {!editing && <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setEditing(true)}><Pencil className="w-3 h-3" /> Edit</Button>}
            {editing && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>}
          </div>
        </div>
        {!editing && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Session" value={startStr} />
              <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone">
                {booking.phoneNumber ? <a href={`tel:${booking.phoneNumber}`} className="font-medium mt-0.5 text-primary hover:text-primary/80 transition-colors">{booking.phoneNumber}</a> : <p className="font-medium mt-0.5">\u2014</p>}
              </DetailRow>
              <DetailRow icon={<Hash className="w-4 h-4" />} label="Visit #" value={booking.visitCount ?? '1'} />
              <DetailRow icon={<Euro className="w-4 h-4" />} label="Payment" value={booking.paymentMethod ?? '\u2014'} />
              {booking.extraService > 0 && <DetailRow icon={<Euro className="w-4 h-4" />} label="Extra Service" value={`\u20ac${booking.extraService}`} />}
              <DetailRow icon={<Euro className="w-4 h-4" />} label="Status">
                <Select value={booking.status ?? 'Upcoming'} onValueChange={(v) => onStatusChange(booking.id, v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted border-border w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </DetailRow>
            </div>
            {booking.notes && <div><div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="w-4 h-4 text-primary" /><span className="text-xs uppercase tracking-wider">Notes</span></div><p className="text-sm bg-muted/50 p-3 rounded-md">{booking.notes}</p></div>}
          </>
        )}
        {editing && (
          <div className="space-y-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label><Input value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} className="mt-1 bg-muted border-border" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Massage Type</Label>
              <Select value={massageType} onValueChange={setMassageType}><SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger><SelectContent>{MASSAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label} — \u20ac{o.price}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Session Start</Label><Input type="datetime-local" value={sessionStart} onChange={(e: any) => setSessionStart(e.target.value)} className="mt-1 bg-muted border-border" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Payment Method</Label>
              <div className="flex gap-2 mt-1">{[{ value: 'Cash', icon: <Banknote className="w-4 h-4" /> }, { value: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> }].map((pm) => (
                <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-xs font-medium transition-all ${paymentMethod === pm.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}>{pm.icon} {pm.value}</button>
              ))}</div>
            </div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Extra Service (\u20ac)</Label>
              <Select value={extraService} onValueChange={setExtraService}><SelectTrigger className="bg-muted border-border"><SelectValue placeholder="No extra" /></SelectTrigger><SelectContent><SelectItem value="0">No extra</SelectItem>{[20,30,50,60,70,80,90,100,150,200].map((a: number) => <SelectItem key={a} value={String(a)}>\u20ac{a}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label><Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={3} className="mt-1 bg-muted border-border resize-none" /></div>
          </div>
        )}
        <div className={`flex ${editing ? 'justify-between' : 'justify-end'} pt-2 border-t border-border`}>
          {editing && <Button onClick={handleSave} disabled={saving} className="text-sm gap-1.5">{saving ? 'Saving...' : 'Save Changes'}</Button>}
          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive text-sm gap-1.5"><Trash2 className="w-4 h-4" /> Delete</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this booking?</AlertDialogTitle><AlertDialogDescription>This will permanently remove {booking.clientName}'s appointment record.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(booking.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: string | number; children?: React.ReactNode }) {
  return (<div className="flex items-start gap-2"><span className="text-primary mt-0.5">{icon}</span><div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>{children ?? <p className="font-medium mt-0.5">{value}</p>}</div></div>);
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}