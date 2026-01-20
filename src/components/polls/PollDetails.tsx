'use client';

import {useMemo, useState, useEffect} from 'react';
import {Poll, Voter, Vote, VoterGroup} from '@/lib/types';
import {useFirebase} from '@/firebase';
import {useToast} from '@/hooks/use-toast';
import {useRouter} from 'next/navigation';
import { doc, writeBatch, getDocs, collection } from 'firebase/firestore';
import QRCode from 'react-qr-code';

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {PollResultsChart} from '@/components/polls/PollResultsChart';
import {Lock, Unlock, Users, ClipboardCopy, ArrowLeft, Trash2, Loader2, QrCode} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

type PollDetailsProps = {
  poll: Poll;
  eligibleVoters?: VoterGroup;
  submittedVoters: Voter[];
  votes: Vote[];
};

type VoterInfo = {
    id: string;
    voterId: string;
    hasVoted: boolean;
}

// Mobile-friendly card for a single voter
function VoterCard({ voter }: { voter: VoterInfo }) {
  const { toast } = useToast();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({title: '¡Copiado al portapapeles!', description: text});
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-mono">{voter.voterId}</CardTitle>
        <Badge variant={voter.hasVoted ? 'default' : 'secondary'} className={voter.hasVoted ? 'bg-green-500 text-white' : ''}>
            {voter.hasVoted ? 'Sí ha Votado' : 'No ha Votado'}
        </Badge>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="outline" className="w-full" onClick={() => copyToClipboard(voter.voterId)}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copiar ID
        </Button>
      </CardContent>
    </Card>
  )
}

export function PollDetails({poll, eligibleVoters, submittedVoters, votes}: PollDetailsProps) {
  const {toast} = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const [isDeleting, setIsDeleting] = useState(false);
  const [voteUrl, setVoteUrl] = useState('');

  useEffect(() => {
    // This code runs only on the client side where `window` is available.
    setVoteUrl(`${window.location.origin}/vote/${poll.id}`);
  }, [poll.id]);

  const voterIdsWhoVoted = useMemo(() => new Set(submittedVoters.map(v => v.id)), [submittedVoters]);

  const voterList: VoterInfo[] = useMemo(() => {
    if (!eligibleVoters?.voterIds) return [];
    return eligibleVoters.voterIds.map(voterId => ({
      voterId: voterId,
      hasVoted: voterIdsWhoVoted.has(voterId),
      id: `${poll.id}-${voterId}`, 
    }));
  }, [eligibleVoters?.voterIds, voterIdsWhoVoted, poll.id]);
  
  const handleDeletePoll = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Por favor, recarga la página e inténtalo de nuevo.' });
      return;
    }
    setIsDeleting(true);
    try {
        const db = firestore;
        const privatePollRef = doc(db, 'users', user.uid, 'polls', poll.id);
        const publicPollRef = doc(db, 'polls', poll.id);

        const votersRef = collection(privatePollRef, 'voters');
        const votesRef = collection(privatePollRef, 'votes');

        const votersSnapshot = await getDocs(votersRef);
        const votesSnapshot = await getDocs(votesRef);
        
        const batch = writeBatch(db);

        votersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        votesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(privatePollRef);
        batch.delete(publicPollRef);

        await batch.commit();

        toast({ title: "Encuesta Eliminada", description: "La encuesta ha sido eliminada exitosamente." });
        router.push('/admin/dashboard');

    } catch (error: any) {
        console.error('Error deleting poll', error);
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: error.message || 'Fallo al eliminar la encuesta.' });
        setIsDeleting(false);
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Por favor, recarga la página e inténtalo de nuevo.' });
      return;
    }
    const newStatus = checked ? 'open' : 'closed';

    try {
        const batch = writeBatch(firestore);
        
        const privatePollRef = doc(firestore, 'users', user.uid, 'polls', poll.id);
        batch.update(privatePollRef, { status: newStatus });
        
        const publicPollRef = doc(firestore, 'polls', poll.id);
        batch.update(publicPollRef, { status: newStatus });

        await batch.commit();
        toast({title: `La encuesta ahora está ${newStatus === 'open' ? 'abierta' : 'cerrada'}`});
    } catch (error: any) {
        console.error("Error updating poll status:", error);
        toast({variant: 'destructive', title: 'La actualización falló', description: error.message || "No se pudo actualizar el estado. Revisa tus permisos."});
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({title: '¡Copiado al portapapeles!', description: text});
  };

  const isPollOpen = poll.status === 'open';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al panel
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar Encuesta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta encuesta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la encuesta y todos sus datos asociados (votantes y votos).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePoll} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Eliminar Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full">
              <CardTitle className="text-2xl font-headline leading-tight">{poll.question}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <CardDescription>ID: {poll.id}</CardDescription>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(poll.id)}>
                  <ClipboardCopy className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!voteUrl}>
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Compartir Encuesta</DialogTitle>
                            <DialogDescription>
                                Cualquier persona con este código QR puede acceder a la página de votación.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                            {voteUrl ? <QRCode value={voteUrl} size={256} /> : <p>Generando código QR...</p>}
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                    Link
                                </Label>
                                <Input
                                    id="link"
                                    defaultValue={voteUrl}
                                    readOnly
                                />
                            </div>
                            <Button type="button" size="sm" className="px-3" onClick={() => copyToClipboard(voteUrl)} disabled={!voteUrl}>
                                <span className="sr-only">Copiar</span>
                                <ClipboardCopy className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Switch id="poll-status" checked={isPollOpen} />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cambiar el estado de la encuesta la {isPollOpen ? 'cerrará a nuevos votos' : 'abrirá para votación'}. Esta acción
                      puede revertirse, pero puede afectar los procesos de votación en curso.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange(!isPollOpen)}>Continuar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Label htmlFor="poll-status" className="flex items-center gap-2 font-semibold">
                {isPollOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {isPollOpen ? 'Abierta' : 'Cerrada'}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Opciones</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {poll.options.map(option => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </div>
            <Separator />
             <div>
                <h3 className="font-semibold mb-2">Configuración de la Encuesta</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Tipo de Voto:</span> {poll.pollType === 'single' ? 'Opción Única' : 'Opción Múltiple'}</p>
                    {poll.pollType === 'multiple' && (
                        <p><span className="font-medium text-foreground">Máximo de Opciones a Elegir:</span> {poll.maxChoices}</p>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

      {poll.status === 'closed' && <PollResultsChart poll={poll} votes={votes} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users />
            Registro de Votantes
          </CardTitle>
          <CardDescription>{!eligibleVoters ? "No se ha asignado un grupo de votantes a esta encuesta." : "Una lista de votantes elegibles para esta encuesta y su estado de votación."}</CardDescription>
        </CardHeader>
        <CardContent>
            {!eligibleVoters ? (
                <p className="text-muted-foreground text-center p-8">No se pueden mostrar votantes porque no hay un grupo asignado.</p>
            ) : (
                <>
                    {/* Mobile View: Card List */}
                    <div className="md:hidden space-y-4">
                        {voterList.map(voter => (
                            <VoterCard key={voter.id} voter={voter} />
                        ))}
                        {voterList.length === 0 && (
                            <div className="h-24 text-center flex flex-col justify-center items-center">
                            <p>Este grupo no tiene votantes elegibles.</p>
                            </div>
                        )}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>ID de Votante</TableHead>
                                <TableHead>Ha Votado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {voterList.map(voter => (
                                <TableRow key={voter.id}>
                                <TableCell className="font-mono">{voter.voterId}</TableCell>
                                <TableCell>
                                    <Badge variant={voter.hasVoted ? 'default' : 'secondary'} className={voter.hasVoted ? 'bg-green-500 text-white' : ''}>
                                    {voter.hasVoted ? 'Sí' : 'No'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(voter.voterId)}>
                                    <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                            {voterList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                    Este grupo no tiene votantes elegibles.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
