import { useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { DatePicker } from '@project/components/ui/date-picker';
import { Textarea } from '@project/components/ui/textarea';
import { createAdjustment } from 'zitejs/api';
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRESET_AMOUNTS = [20, 30, 50, 60, 70, 80, 90, 100];

export default function AdjustmentForm({ onCreated }: { onCreated: () => void }) {
  const [clientName, setClientName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);

  const isCustom = selectedPreset === 'custom';
  const amount = isCustom ? parseFloat(customAmount) : (selectedPreset ? parseFloat(selectedPreset) : NaN);
  const isValid = clientName.trim() !== '' && !isNaN(amount) && amount > 0 && date;

  const handleSubmit = async () => {
    if (!isValid || !date) return;
    setSaving(true);
    try {
      await createAdjustment({
        clientName: clientName.trim(),
        amount,
        reason: reason.trim() || undefined,
        date: format(date, 'yyyy-MM-dd'),
      });
      toast.success(`€${amount.toFixed(2)} adjustment added for ${clientName.trim()}`);
      setClientName('');
      setSelectedPreset('');
      setCustomAmount('');
      setReason('');
      setDate(new Date());
      onCreated();
    } catch {
      toast.error('Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name</Label>
        <Input
          id="clientName"
          placeholder="Enter client name"
          value={clientName}
          onChange={e => setClientName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Amount (€)</Label>
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger>
            <SelectValue placeholder="Select an amount" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_AMOUNTS.map(a => (
              <SelectItem key={a} value={String(a)}>
                €{a.toFixed(2)}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom amount…</SelectItem>
          </SelectContent>
        </Select>
        {isCustom && (
          <Input
            type="number"
            min={0.01}
            step={0.01}
            placeholder="Enter custom amount"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            className="mt-2"
            autoFocus
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <DatePicker value={date} onChange={setDate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason / Note (optional)</Label>
        <Textarea
          id="reason"
          placeholder="e.g. Extra service, travel fee…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
        />
      </div>

      <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
        Add Adjustment
      </Button>
    </div>
  );
}
