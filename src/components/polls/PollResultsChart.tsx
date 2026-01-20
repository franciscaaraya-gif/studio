"use client";

import { useMemo } from 'react';
import { Poll, Vote } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type ChartData = {
  name: string;
  votes: number;
};

export function PollResultsChart({ poll, votes }: { poll: Poll; votes: Vote[] }) {
  const chartData: ChartData[] = useMemo(() => {
    const voteCounts = poll.options.reduce((acc, option) => {
      acc[option] = 0;
      return acc;
    }, {} as { [key: string]: number });

    (votes || []).forEach(vote => {
      vote.selectedOptions.forEach(selectedOption => {
        if (voteCounts.hasOwnProperty(selectedOption)) {
          voteCounts[selectedOption]++;
        }
      });
    });

    return poll.options.map(option => ({
      name: option,
      votes: voteCounts[option],
    }));
  }, [votes, poll.options]);

  const totalVotes = useMemo(() => (votes || []).length, [votes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados de la Encuesta</CardTitle>
        <CardDescription>Total de votos emitidos: {totalVotes}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                    }}
                />
                <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
