import { useState, useCallback } from 'react';
import { useAuth } from 'zitejs/auth';
import { Toaster } from '@project/components/ui/sonner';
import { SRLogo } from './components/SRLogo';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardView from './components/DashboardView';
import BookingForm from './components/BookingForm';
import BookingsList from './components/BookingsList';
import { LayoutDashboard, CalendarPlus, List } from 'lucide-react';

type View = 'dashboard' | 'new' | 'bookings';

const NAV_ITEMS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'new', label: 'New Booking', icon: <CalendarPlus className="w-4 h-4" /> },
  { key: 'bookings', label: 'All Bookings', icon: <List className="w-4 h-4" /> },
];

export default function App() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [showWelcome, setShowWelcome] = useState(true);
  const [initialFilter, setInitialFilter] = useState('Upcoming');

  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), []);

  const handleNavigate = (target: string) => {
    if (target.startsWith('bookings:')) {
      const filter = target.split(':')[1];
      setInitialFilter(filter);
      setView('bookings');
    } else {
      setView(target as View);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-right" />
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SRLogo size="sm" />
            <div>
              <h1 className="font-serif text-sm font-bold tracking-wide text-gold-gradient">SULTRY ROYAL</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Bookings</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === 'bookings') setInitialFilter('Upcoming');
                  setView(item.key);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === item.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold">
            {view === 'dashboard' && 'Dashboard'}
            {view === 'new' && 'New Booking'}
            {view === 'bookings' && 'All Bookings'}
          </h2>
          <div className="w-12 h-0.5 bg-primary mt-2 rounded-full" />
        </div>
        {view === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {view === 'new' && <BookingForm onSuccess={() => { setInitialFilter('Upcoming'); setView('bookings'); }} />}
        {view === 'bookings' && <BookingsList initialFilter={initialFilter} />}
      </main>
    </div>
  );
}