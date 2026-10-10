import { useState } from 'react';
import { useAuth } from 'zitejs/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@project/components/ui/card';
import { Toaster } from '@project/components/ui/sonner';
import { Receipt } from 'lucide-react';
import AdjustmentForm from './components/AdjustmentForm';
import AdjustmentList from './components/AdjustmentList';

export default function App() {
  const { user, isLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto max-w-xl px-4 py-8 space-y-6">
        <header className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
            <Receipt className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Price Adjustments</h1>
          <p className="text-muted-foreground text-sm">Add extra charges for your clients</p>
        </header>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">New Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustmentForm onCreated={() => setRefreshKey(k => k + 1)} />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-base font-semibold mb-3">Recent Adjustments</h2>
          <AdjustmentList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
