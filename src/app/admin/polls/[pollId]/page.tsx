import PollDetailsPageClient from './client';

// This satisfies the `output: export` requirement for dynamic routes.
// It tells Next.js not to pre-render any specific poll pages at build time.
export function generateStaticParams() {
  return [];
}

export default function PollDetailsPage({ params }: { params: { pollId: string } }) {
  // We render the client component, passing the pollId to it directly.
  return <PollDetailsPageClient pollId={params.pollId} />;
}
