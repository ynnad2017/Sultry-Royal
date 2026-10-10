import { useEffect, useState, useCallback } from 'react';
import { getAdjustments, deleteAdjustment, GetAdjustmentsOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Search, Trash2, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useDebouncedCallback } from 'use-debounce';

type Adjustment = GetAdjustmentsOutputType['adjustments'][0];

export default function AdjustmentList({ refreshKey }: { refreshKey: number }) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async (q?: string) => {
    try {
      const data = await getAdjustments({ search: q || undefined });
      setAdjustments(data.adjustments);
    } catch {
      toast.error('Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback((q: string) => {
    load(q);
  }, 300);

  useEffect(() => { load(search); }, [refreshKey]);

  const handleSearch = (val: string) => {
    setSearch(val);
    debouncedSearch(val);
  };

  const handleDelete = async (id: string) => {
    setAdjustments(prev => prev.filter(a => a.id !== id));
    try {
      await deleteAdjustment({ id });
      toast.success('Adjustment deleted');
    } catch {
      toast.error('Failed to delete');
      load(search);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by client name…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {adjustments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Euro className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No adjustments yet</p>
          <p className="text-sm mt-1">Add your first price adjustment above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {adjustments.map(a => (
            <AdjustmentRow key={a.id} adjustment={a} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdjustmentRow({ adjustment: a, onDelete }: { adjustment: Adjustment; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold truncate">{a.clientName}</span>
          <span className="text-xs text-muted-foreground">
            {a.date ? format(parseISO(a.date), 'dd/MM/yyyy') : ''}
          </span>
        </div>
        {a.reason && <p className="text-sm text-muted-foreground truncate mt-0.5">{a.reason}</p>}
      </div>
      <span className="font-mono font-semibold text-primary whitespace-nowrap">
        €{(a.amount ?? 0).toFixed(2)}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the €{(a.amount ?? 0).toFixed(2)} adjustment for {a.clientName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(a.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
