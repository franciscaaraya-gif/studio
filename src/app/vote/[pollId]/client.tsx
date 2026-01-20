'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { SHA256 } from 'crypto-js';

import { Poll } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ElectorIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VotingForm } from '@/components/voting/VotingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function LoadingSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cargando Encuesta...</CardTitle>
                <CardDescription>Por favor, espera un momento.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md mt-4" />
            </CardContent>
        </Card>
    );
}

function ErrorCard({ title, message, showBackButton = false }: { title: string; message: string; showBackButton?: boolean }) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{message}</CardDescription>
            </CardHeader>
            {showBackButton && (
                <CardContent className="flex flex-col items-start space-y-4">
                    <Button asChild variant="outline">
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ingresar otro ID de Encuesta
                        </Link>
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}

export default function VotePageClient() {
    const params = useParams();
    const pollId = params?.pollId as string | undefined;

    const { firestore, auth } = useFirebase();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    
    const [poll, setPoll] = useState<Poll | null>(null);
    const [isFetchingPoll, setIsFetchingPoll] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [voterId, setVoterId] = useState('');
    const [isVoterIdVerified, setIsVoterIdVerified] = useState(false);
    const [isCheckingVoterId, setIsCheckingVoterId] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    useEffect(() => {
        // Step 1: Wait until auth state is resolved and services are available.
        if (isUserLoading || !auth || !firestore) {
            return;
        }

        // Step 2: If there's no user, start an anonymous session. The effect will
        // re-run once the user state is updated by the provider.
        if (!user) {
            signInAnonymously(auth).catch(err => {
                console.error("Anonymous sign-in failed", err);
                setFetchError("No se pudo iniciar una sesión de votación segura.");
                setIsFetchingPoll(false);
            });
            return;
        }

        // Step 3: Now that we have a user, we can fetch the poll data.
        if (!pollId) {
            setFetchError("No se proporcionó un ID de encuesta.");
            setIsFetchingPoll(false);
            return;
        }

        const fetchPoll = async () => {
            setIsFetchingPoll(true);
            try {
                const pollRef = doc(firestore, 'polls', pollId);
                const pollSnap = await getDoc(pollRef);

                if (!pollSnap.exists() || pollSnap.data().status !== 'open') {
                    throw new Error("La encuesta no existe o ya está cerrada.");
                }
                
                setPoll({ id: pollSnap.id, ...pollSnap.data() } as Poll);
            } catch (e: any) {
                setFetchError(e.message || "Ocurrió un error al cargar la encuesta.");
            } finally {
                setIsFetchingPoll(false);
            }
        };

        fetchPoll();
    }, [pollId, firestore, auth, user, isUserLoading]);


    const handleVoterIdCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckError(null);

        if (!voterId.trim()) {
            setCheckError("Por favor, ingresa tu ID de Votante.");
            return;
        }
        if (!poll || !firestore) {
            setCheckError("La información de la encuesta no está disponible. Inténtalo de nuevo.");
            return;
        }

        setIsCheckingVoterId(true);
        try {
            const voterIdHash = SHA256(voterId.trim()).toString();
            if (!poll.voterIdHashes?.includes(voterIdHash)) {
                throw new Error("Tu ID de Votante no es válido para esta encuesta.");
            }

            const voterRecordRef = doc(firestore, 'users', poll.userId, 'polls', poll.id, 'voters', voterId.trim());
            const voterDocSnap = await getDoc(voterRecordRef);
            if (voterDocSnap.exists()) {
                throw new Error("Ya has votado en esta encuesta. No puedes votar dos veces.");
            }

            setIsVoterIdVerified(true);
            toast({ title: "ID verificado", description: "Ahora puedes emitir tu voto." });

        } catch (error: any) {
            setCheckError(error.message);
        } finally {
            setIsCheckingVoterId(false);
        }
    };


    const headerContent = (
        <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2" prefetch={false}>
                <ElectorIcon className="h-10 w-10 text-primary" />
                <span className="text-2xl font-bold tracking-tight text-primary font-headline">E-lector</span>
            </Link>
        </div>
    );

    let bodyContent;
    
    if (isUserLoading || isFetchingPoll) {
        bodyContent = <LoadingSkeleton />;
    } else if (fetchError) {
        bodyContent = <ErrorCard title="Error al Cargar Encuesta" message={fetchError} showBackButton={true} />;
    } else if (poll) {
        if (!isVoterIdVerified) {
            bodyContent = (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{poll.question}</CardTitle>
                        <CardDescription>Para continuar, por favor verifica tu identidad ingresando tu ID de Votante.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleVoterIdCheck} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="voterId">Tu ID de Votante</Label>
                                <Input
                                    id="voterId"
                                    placeholder="Ingresa tu ID único"
                                    value={voterId}
                                    onChange={(e) => setVoterId(e.target.value)}
                                    disabled={isCheckingVoterId}
                                />
                                {checkError && <p className="text-sm text-destructive">{checkError}</p>}
                            </div>
                            <Button type="submit" className="w-full" disabled={isCheckingVoterId}>
                                {isCheckingVoterId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verificar y Continuar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            );
        } else {
             bodyContent = <VotingForm poll={poll} voterId={voterId.trim()} />;
        }
    } else {
        bodyContent = <ErrorCard title="Error Inesperado" message="No se pudo cargar la información de la votación. Revisa que la URL sea correcta." showBackButton={true} />;
    }
    
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                {headerContent}
                {bodyContent}
            </div>
        </div>
    );
}
