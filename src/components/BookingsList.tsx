import { useState, useEffect, useMemo } from 'react';
import { format, isToday, differenceInHours } from 'date-fns';
import { getBookings, updateBooking, deleteBooking, GetBookingsOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, Phone, FileText, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Zap } from 'lucide-react';
import BookingDetail from './BookingDetail';

type Booking = GetBookingsOutputType['bookings'][0];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Upcoming: { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-400/10' },
  Completed: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-400/10' },
  Cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-400 bg-red-400/10' },
  'No Show': { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-orange-400 bg-orange-400/10' },
};

export default function BookingsList({ initialFilter = 'Upcoming' }: { initialFilter?: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => { setStatusFilter(initialFilter); }, [initialFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await getBookings({ status: statusFilter === 'all' ? undefined : statusFilter, search: search || undefined });
      setBookings(data.bookings);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search) return bookings;
    const s = search.toLowerCase();
    return bookings.filter((b) => b.clientName?.toLowerCase().includes(s) || b.phoneNumber?.includes(s));
  }, [bookings, search]);

  const handleStatusChange = async (id: string, status: string) => {
    try { await updateBooking({ id, status }); toast.success('Status updated to ' + status); fetchBookings(); }
    catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteBooking({ id }); toast.success('Booking deleted'); setSelectedBooking(null); fetchBookings(); }
    catch { toast.error('Failed to delete'); }
  };

  if (selectedBooking) {
    return <BookingDetail booking={selectedBooking} onBack={() => { setSelectedBooking(null); fetchBookings(); }} onDelete={handleDelete} onStatusChange={handleStatusChange} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9 bg-muted border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-muted border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Upcoming">Upcoming</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="No Show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border-gold-glow" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No bookings found</p></div>
      ) : (
        <div className="space-y-2">{filtered.map((b) => <BookingRow key={b.id} booking={b} onClick={() => setSelectedBooking(b)} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}</div>
      )}
    </div>
  );
}

function BookingRow({ booking, onClick, onStatusChange, onDelete }: { booking: Booking; onClick: () => void; onStatusChange: (id: string, s: string) => void; onDelete: (id: string) => void }) {
  const cfg = STATUS_CONFIG[booking.status ?? ''] ?? STATUS_CONFIG.Upcoming;
  const sessionDate = booking.sessionStart ? new Date(booking.sessionStart) : null;
  const dateStr = sessionDate ? format(sessionDate, 'MMM d, yyyy') : '\u2014';
  const timeStr = sessionDate ? format(sessionDate, 'h:mm a') : '';
  const isTodayBooking = sessionDate && isToday(sessionDate);
  const hoursUntil = sessionDate ? differenceInHours(sessionDate, new Date()) : Infinity;
  const isImminent = booking.status === 'Upcoming' && isTodayBooking && hoursUntil >= 0 && hoursUntil <= 3;
  const isTodayUpcoming = booking.status === 'Upcoming' && isTodayBooking;

  return (
    <div onClick={onClick} className={`bg-card rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${isImminent ? 'border border-amber-500/60 shadow-[0_0_16px_hsla(43,90%,50%,0.2)] hover:bg-muted/60' : isTodayUpcoming ? 'border border-primary/30 hover:bg-muted/60 border-gold-glow' : 'border-gold-glow hover:bg-muted/60'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isImminent && <Zap className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />}
          <p className="font-medium text-sm truncate">{booking.clientName}</p>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.icon} {booking.status}</span>
          {isTodayUpcoming && !isImminent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold flex-shrink-0">TODAY</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{booking.massageType}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{dateStr} \u00b7 <span className={isTodayUpcoming ? 'text-primary font-bold text-sm' : ''}>{timeStr}</span></span>
          {booking.phoneNumber && <a href={`tel:${booking.phoneNumber}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"><Phone className="w-3 h-3" />{booking.phoneNumber}</a>}
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {booking.status === 'Upcoming' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onStatusChange(booking.id, 'Completed')}>Complete</Button>}
        <AlertDialog>
          <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Booking</AlertDialogTitle><AlertDialogDescription>This will permanently delete {booking.clientName}'s booking.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(booking.id)}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}