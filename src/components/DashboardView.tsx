import { useState, useEffect } from 'react';
import { format, isPast, differenceInHours } from 'date-fns';
import { getDashboardStats, GetDashboardStatsOutputType } from 'zitejs/api';
import { motion } from 'framer-motion';
import { Textarea } from '@project/components/ui/textarea';
import { Calendar, Users, TrendingUp, Euro, Clock, Zap, Phone, StickyNote } from 'lucide-react';
import { SRLogo } from './SRLogo';

type Stats = GetDashboardStatsOutputType;
type TodayBooking = Stats['todayBookings'][0];

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalNote, setPersonalNote] = useState(() => localStorage.getItem('sr-personal-notes') ?? '');

  const saveNote = (val: string) => { setPersonalNote(val); localStorage.setItem('sr-personal-notes', val); };
  const refresh = () => { getDashboardStats({ timezoneOffset: new Date().getTimezoneOffset() }).then(setStats).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  if (loading || !stats) {
    return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map((i) => <div key={i} className="h-28 bg-card rounded-lg animate-pulse border-gold-glow" />)}</div>);
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border-gold-glow p-4 flex items-center gap-4 overflow-hidden">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="flex-shrink-0"><SRLogo size="sm" /></motion.div>
        <div className="flex-1 overflow-hidden">
          <div className="marquee-track"><span className="marquee-content font-serif text-sm sm:text-base font-bold text-gold-gradient whitespace-nowrap">\u2726 Welcome to Sultry Royal by Malik \u2726\u00a0\u00a0\u00a0\u00a0\u2726 Welcome to Sultry Royal by Malik \u2726\u00a0\u00a0\u00a0\u00a0</span></div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClickableStatCard icon={<Calendar className="w-5 h-5" />} label="Total Bookings" value={stats.totalBookings} onClick={() => onNavigate('bookings:all')} />
        <ClickableStatCard icon={<Clock className="w-5 h-5" />} label="Upcoming" value={stats.upcomingCount} onClick={() => onNavigate('bookings:Upcoming')} />
        <ClickableStatCard icon={<Users className="w-5 h-5" />} label="Completed" value={stats.completedCount} onClick={() => onNavigate('bookings:Completed')} />
        <RevealCard icon={<Euro className="w-5 h-5" />} label="Revenue" value={`\u20ac${stats.totalRevenue.toLocaleString()}`} />
      </div>
      <div className="bg-card rounded-lg border-gold-glow p-5">
        <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Today's Appointments</h3>
        {stats.todayBookings.length === 0 ? <p className="text-muted-foreground text-sm py-4 text-center">No appointments today</p> : (
          <div className="space-y-3">{stats.todayBookings.slice().sort((a: TodayBooking, b: TodayBooking) => { const da = a.sessionStart ? new Date(a.sessionStart).getTime() : 0; const db = b.sessionStart ? new Date(b.sessionStart).getTime() : 0; return da - db; }).map((b: TodayBooking) => <TodayBookingRow key={b.id} booking={b} />)}</div>
        )}
      </div>
      <div className="bg-card rounded-lg border-gold-glow p-5">
        <h3 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2"><StickyNote className="w-5 h-5 text-primary" />My Notes</h3>
        <Textarea value={personalNote} onChange={(e) => saveNote(e.target.value)} placeholder="Write anything here..." rows={4} className="bg-muted border-border resize-y text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => onNavigate('new')} className="bg-primary text-primary-foreground rounded-lg p-4 font-semibold text-sm hover:opacity-90 transition-opacity">+ New Booking</button>
        <button onClick={() => onNavigate('bookings:all')} className="bg-secondary text-secondary-foreground rounded-lg p-4 font-semibold text-sm hover:opacity-90 transition-opacity">View All Bookings</button>
      </div>
    </div>
  );
}

function ClickableStatCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string | number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-card rounded-lg border-gold-glow p-4 text-left hover:ring-1 hover:ring-primary/30 transition-all">
      <div className="flex items-center gap-2 text-muted-foreground mb-2"><span className="text-primary">{icon}</span><span className="text-xs uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-serif font-bold">{value}</p>
    </button>
  );
}

function RevealCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button onClick={() => setRevealed((r) => !r)} className="bg-card rounded-lg border-gold-glow p-4 text-left ring-1 ring-primary/20 transition-all hover:ring-primary/40">
      <div className="flex items-center gap-2 text-muted-foreground mb-2"><span className="text-primary">{icon}</span><span className="text-xs uppercase tracking-wider">{label}</span></div>
      {revealed ? <p className="text-2xl font-serif font-bold revenue-pulse">{value}</p> : <div className="h-8" />}
    </button>
  );
}

function TodayBookingRow({ booking }: { booking: TodayBooking }) {
  const sessionDate = booking.sessionStart ? new Date(booking.sessionStart) : null;
  const time = sessionDate ? format(sessionDate, 'h:mm a') : '\u2014';
  const isUpcoming = booking.status === 'Upcoming';
  const hoursUntil = sessionDate ? differenceInHours(sessionDate, new Date()) : Infinity;
  const isImminent = isUpcoming && hoursUntil >= 0 && hoursUntil <= 3;
  const pastDue = isUpcoming && sessionDate && isPast(sessionDate);

  return (
    <div className={`flex items-center justify-between p-3 rounded-md transition-colors ${isImminent ? 'bg-amber-500/10 border border-amber-500/30' : pastDue ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-3">
        {isImminent && <Zap className="w-4 h-4 text-amber-400 animate-pulse" />}
        {pastDue && !isImminent && <Clock className="w-4 h-4 text-destructive" />}
        <div><p className="font-medium text-sm">{booking.clientName}</p><p className="text-xs text-muted-foreground">{booking.massageType}</p></div>
      </div>
      <div className="flex items-center gap-3">
        {booking.phoneNumber && <a href={`tel:${booking.phoneNumber}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 transition-colors"><Phone className="w-4 h-4" /></a>}
        <p className={`font-medium ${isImminent ? 'text-amber-400 text-base font-bold animate-pulse' : 'text-primary text-sm'}`}>{time}</p>
      </div>
    </div>
  );
}