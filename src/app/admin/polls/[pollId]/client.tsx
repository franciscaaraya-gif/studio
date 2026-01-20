'use client';

import { doc, collection } from 'firebase/firestore';
import { Poll, Voter, Vote, VoterGroup } from '@/lib/types';
import { useRouter } from 'next/navigation';
import PollDetailsLoading from './loading';
import { useEffect } from 'react';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PollDetails } from '@/components/polls/PollDetails';

export default function PollDetailsPageClient({ pollId }: { pollId: string }) {
  const { isUserLoading, user, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const uid = user?.uid;

  // Step 1: Fetch the main poll document.
  const pollRef = useMemoFirebase(() => {
    // CRUCIAL GUARD: Wait for auth, firestore, uid, and pollId to be ready.
    if (isUserLoading || !firestore || !uid || !pollId) return null;
    return doc(firestore, 'users', uid, 'polls', pollId);
  }, [isUserLoading, firestore, uid, pollId]);
  
  const { data: poll, isLoading: isLoadingPoll, error: pollError } = useDoc<Poll>(pollRef);

  // Step 2: Fetch the associated VoterGroup, but only if we have the poll and its voterGroupId.
  const voterGroupRef = useMemoFirebase(() => {
    if (isUserLoading || !firestore || !uid || !pollId || !poll?.voterGroupId) return null;
    return doc(firestore, 'users', uid, 'voterGroups', poll.voterGroupId);
  }, [isUserLoading, firestore, uid, pollId, poll]);

  const { data: voterGroup, isLoading: isLoadingVoterGroup, error: voterGroupError } = useDoc<VoterGroup>(voterGroupRef);

  // Step 3: Fetch the submitted voters subcollection
  const submittedVotersRef = useMemoFirebase(() => {
    if (isUserLoading || !firestore || !uid || !pollId || !poll?.id) return null;
    return collection(firestore, 'users', uid, 'polls', poll.id, 'voters');
  }, [isUserLoading, firestore, uid, pollId, poll]);

  const { data: submittedVoters, isLoading: isLoadingSubmittedVoters, error: submittedVotersError } = useCollection<Voter>(submittedVotersRef);

  // Step 4: Fetch the votes subcollection
  const votesRef = useMemoFirebase(() => {
    if (isUserLoading || !firestore || !uid || !pollId || !poll?.id) return null;
    return collection(firestore, 'users', uid, 'polls', poll.id, 'votes');
  }, [isUserLoading, firestore, uid, pollId, poll]);

  const { data: votes, isLoading: isLoadingVotes, error: votesError } = useCollection<Vote>(votesRef);

  // Effect to handle any data loading errors and redirect
  useEffect(() => {
    const error = pollError || voterGroupError || submittedVotersError || votesError;
    if (error) {
      console.error("Failed to fetch poll data:", error);
      toast({
        variant: 'destructive',
        title: 'Error al Cargar la Encuesta',
        description: 'No se pudieron cargar todos los datos. Es posible que no tengas permiso o que la encuesta no exista.'
      });
      router.push('/admin/dashboard');
    }
  }, [pollError, voterGroupError, submittedVotersError, votesError, router, toast]);
  
  // The page is loading if any of these are true.
  // Note: We check for `isLoading...` flags. They will be true only when their respective refs are not null.
  const isLoading = isUserLoading || isLoadingPoll || isLoadingVoterGroup || isLoadingSubmittedVoters || isLoadingVotes;

  if (isLoading) {
    return <PollDetailsLoading />;
  }
  
  // This should be handled by the layout, but as a fallback.
  if (!user) {
    return <PollDetailsLoading />;
  }

  // If after loading, the poll is not found.
  if (!poll) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Encuesta no encontrada</CardTitle>
                <CardDescription>La encuesta que buscas no existe o no tienes permiso para verla.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/admin/dashboard')}>Volver al panel</Button>
            </CardContent>
        </Card>
    );
  }

  // If everything loaded, render the details.
  // Pass empty arrays as fallbacks if data is null (shouldn't happen if not loading, but for type safety).
  return <PollDetails 
            poll={poll} 
            eligibleVoters={voterGroup || undefined}
            submittedVoters={submittedVoters || []} 
            votes={votes || []} 
        />;
}
