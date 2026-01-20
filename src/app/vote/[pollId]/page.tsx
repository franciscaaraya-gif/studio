import { Suspense } from 'react';
import VotePageClient from './client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This satisfies the `output: export` requirement for dynamic routes.
// It tells Next.js not to pre-render any specific poll pages at build time.
export function generateStaticParams() {
  return [];
}

// A simple loading skeleton to show during server render and initial client load.
function LoadingSkeleton() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Cargando...</CardTitle>
                        <CardDescription>Por favor, espera un momento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
                        <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
                        <div className="h-12 w-full bg-muted animate-pulse rounded-md mt-4" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// This is a Server Component.
export default function VotePage() {
  // We render the client component, passing no params.
  // The client component will handle reading url params on the client side,
  // so we must wrap it in Suspense.
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <VotePageClient />
    </Suspense>
  );
}
