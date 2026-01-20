'use client';

import { PollList } from '@/components/polls/PollList';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
        <CardHeader className="p-0">
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">Encuestas</CardTitle>
            <CardDescription>Crea y administra tus encuestas de votación anónima.</CardDescription>
        </CardHeader>
        {/* The initialPolls prop is there for potential server-side rendering, but the component fetches its own data client-side. */}
        <PollList initialPolls={[]} />
    </div>
  );
}
