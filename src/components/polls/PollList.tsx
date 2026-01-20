'use client';

import {useState, useEffect} from 'react';
import {useForm, useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {collection, query, orderBy, doc, setDoc, Timestamp, writeBatch, getDocs} from 'firebase/firestore';
import {useCollection, useFirebase, useMemoFirebase} from '@/firebase';
import {Poll, VoterGroup} from '@/lib/types';
import {useRouter} from 'next/navigation';

import {Button} from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardHeader, CardTitle, CardFooter} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {PlusCircle, Loader2, Trash2, Vote, Eye} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {Tooltip, TooltipProvider, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

const pollSchema = z.object({
  question: z.string().min(10, 'La pregunta debe tener al menos 10 caracteres.'),
  options: z.array(z.object({value: z.string().min(1, 'La opción no puede estar vacía.')})).min(2, 'Debe tener al menos dos opciones.'),
  voterGroupId: z.string({required_error: 'Debes seleccionar un grupo de votantes.'}).min(1, 'Debes seleccionar un grupo de votantes.'),
  pollType: z.enum(['single', 'multiple'], { required_error: 'Debes seleccionar un tipo de encuesta.' }),
  maxChoices: z.coerce.number().optional(),
}).refine(data => {
    if (data.pollType === 'multiple') {
        return data.maxChoices && data.maxChoices > 1 && data.maxChoices <= data.options.length;
    }
    return true;
}, {
    message: 'Para selección múltiple, el número de opciones debe ser mayor que 1 y no mayor que el número total de opciones.',
    path: ['maxChoices'],
});


type PollFormValues = z.infer<typeof pollSchema>;

function PollCard({poll, onDelete, isDeleting}: {poll: Poll, onDelete: (pollId: string) => void, isDeleting: boolean}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{poll.question}</CardTitle>
        <div className="flex items-center gap-2 pt-1">
            <Badge variant={poll.status === 'open' ? 'default' : 'secondary'} className={poll.status === 'open' ? 'bg-green-500 text-white' : ''}>
                {poll.status === 'open' ? 'Abierta' : 'Cerrada'}
            </Badge>
            <span className="text-sm text-muted-foreground">{(poll.createdAt as any)?.toDate?.().toLocaleDateString() ?? ''}</span>
        </div>
      </CardHeader>
      <CardContent>
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Vote className="h-4 w-4" />
            <span>{poll.options.length} opciones</span>
          </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={() => router.push(`/admin/polls/${poll.id}`)} className="w-full">
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalles
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" className="shrink-0" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
              <AlertDialogAction onClick={() => onDelete(poll.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export function PollList({initialPolls}: {initialPolls: Poll[]}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const {toast} = useToast();
  const router = useRouter();
  const {firestore, user} = useFirebase();

  const pollsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'polls'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const groupsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'voterGroups'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const {data: polls, error: pollsError} = useCollection<Poll>(pollsQuery);
  const {data: groups, error: groupsError} = useCollection<VoterGroup>(groupsQuery);

  useEffect(() => {
    const anyError = pollsError || groupsError;
    if (anyError) {
      console.error("Error fetching data:", anyError);
      toast({
        variant: 'destructive',
        title: 'Error al Cargar Datos',
        description: 'No se pudieron obtener los datos. Revisa tus permisos e inténtalo de nuevo.',
      });
    }
  }, [pollsError, groupsError, toast]);

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      question: '',
      options: [{value: ''}, {value: ''}],
      voterGroupId: '',
      pollType: 'single',
    },
  });
  
  const {fields, append, remove} = useFieldArray({control: form.control, name: 'options'});
  const pollType = form.watch('pollType');

  useEffect(() => {
    if (pollType === 'single') {
        form.setValue('maxChoices', undefined);
        form.clearErrors('maxChoices');
    }
  }, [pollType, form]);

  const handleDeletePoll = async (pollId: string) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Por favor, recarga la página e inténtalo de nuevo.' });
      return;
    }
    setIsDeleting(pollId);

    try {
        const db = firestore;
        const privatePollRef = doc(db, 'users', user.uid, 'polls', pollId);
        const publicPollRef = doc(db, 'polls', pollId);

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
        
    } catch (error: any) {
        console.error('Error deleting poll', error);
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: error.message || 'Fallo al eliminar la encuesta.' });
    } finally {
        setIsDeleting(null);
    }
  }

  const handleDeleteAllPolls = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Debes iniciar sesión.' });
      return;
    }
    setIsDeletingAll(true);

    try {
      const db = firestore;
      const privatePollsQuery = query(collection(db, 'users', user.uid, 'polls'));
      const privatePollsSnapshot = await getDocs(privatePollsQuery);

      if (privatePollsSnapshot.empty) {
        toast({ title: "Nada que eliminar", description: "No se encontraron encuestas para eliminar." });
        setIsDeletingAll(false);
        return;
      }

      // Firestore batches are limited to 500 operations. This might fail for a very large number of polls with many sub-documents.
      const batch = writeBatch(db);
      
      for (const pollDoc of privatePollsSnapshot.docs) {
        const pollId = pollDoc.id;
        const privatePollRef = pollDoc.ref;
        
        const votersRef = collection(privatePollRef, 'voters');
        const votesRef = collection(privatePollRef, 'votes');
        
        const votersSnapshot = await getDocs(votersRef);
        votersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        const votesSnapshot = await getDocs(votesRef);
        votesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        batch.delete(privatePollRef);

        const publicPollRef = doc(db, 'polls', pollId);
        batch.delete(publicPollRef);
      }

      await batch.commit();
      toast({ title: "Colecciones Vaciadas", description: "Todas las encuestas y sus datos asociados han sido eliminados." });
    } catch (error: any) {
      console.error('Error deleting all polls', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error al Vaciar', 
        description: error.message || 'Fallo al eliminar las encuestas. Podría ser un problema de permisos o de demasiadas operaciones a la vez.' 
      });
    } finally {
      setIsDeletingAll(false);
    }
  }


  async function onSubmit(data: PollFormValues) {
    if (!user || !firestore) {
      toast({variant: 'destructive', title: 'No autenticado', description: 'Debes iniciar sesión para crear una encuesta.'});
      return;
    }
  
    setIsSubmitting(true);
    let pollId = '';
  
    try {
      const selectedGroup = groups?.find(g => g.id === data.voterGroupId);
      if (!selectedGroup) {
        throw new Error("El grupo de votantes seleccionado no es válido.");
      }

      const privatePollRef = doc(collection(firestore, 'users', user.uid, 'polls'));
      pollId = privatePollRef.id;

      const newPollData: Poll = {
        id: pollId,
        question: data.question,
        options: data.options.map(o => o.value),
        status: 'open',
        createdAt: Timestamp.now(),
        userId: user.uid,
        voterGroupId: data.voterGroupId,
        voterIdHashes: selectedGroup.voterIdHashes || [],
        pollType: data.pollType,
        ...(data.pollType === 'multiple' && { maxChoices: data.maxChoices }),
      };
  
      await setDoc(privatePollRef, newPollData);
  
      const publicPollData = {
        question: newPollData.question,
        options: newPollData.options,
        status: newPollData.status,
        userId: newPollData.userId,
        createdAt: newPollData.createdAt,
        pollType: newPollData.pollType,
        voterIdHashes: newPollData.voterIdHashes,
        ...(newPollData.pollType === 'multiple' && { maxChoices: newPollData.maxChoices }),
      };
      
      const publicPollRef = doc(firestore, 'polls', pollId);
      await setDoc(publicPollRef, publicPollData);
  
      toast({title: '¡Encuesta Creada!', description: 'Tu nueva encuesta ha sido creada exitosamente.'});
      form.reset();
      setOpen(false);
      router.push(`/admin/polls/${pollId}`);
  
    } catch (error: any) {
      console.error("Error creating poll:", error);
      toast({
        variant: 'destructive', 
        title: 'Error al Crear la Encuesta', 
        description: error.message || 'No se pudo escribir en la base de datos. Revisa tus reglas de seguridad de Firestore.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasGroups = groups && groups.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle>Tus Encuestas</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto" disabled={isDeletingAll || !polls || polls.length === 0}>
                  {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Vaciar Encuestas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán permanentemente TODAS tus encuestas, junto con todos sus votantes y votos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllPolls} className="bg-destructive hover:bg-destructive/90">
                    Sí, eliminar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {hasGroups ? (
              <>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Encuesta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Crear Nueva Encuesta</DialogTitle>
                      <DialogDescription>
                        Completa los detalles a continuación para lanzar tu encuesta anónima.
                      </DialogDescription>
                    </DialogHeader>
                    <div className='flex-1 overflow-y-auto -mx-6 px-6 border-y'>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} id="poll-form" className="space-y-6 py-6">
                          <FormField
                            control={form.control}
                            name="question"
                            render={({field}) => (
                              <FormItem>
                                <FormLabel>Pregunta de la Encuesta</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="ej., ¿Cuál es tu lenguaje de programación preferido?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-4">
                            <Label>Opciones de Votación</Label>
                            {fields.map((field, index) => (
                              <FormField
                                key={field.id}
                                control={form.control}
                                name={`options.${index}.value`}
                                render={({field}) => (
                                  <FormItem>
                                    <div className="flex items-center gap-2">
                                      <FormControl>
                                        <Input {...field} placeholder={`Opción ${index + 1}`} />
                                      </FormControl>
                                      {fields.length > 2 && (
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({value: ''})}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Añadir Opción
                            </Button>
                          </div>

                          <FormField
                            control={form.control}
                            name="pollType"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Tipo de Encuesta</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                  >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="single" />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Opción Única - Los votantes solo pueden elegir una opción.
                                      </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="multiple" />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Opción Múltiple - Los votantes pueden elegir varias opciones.
                                      </FormLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {pollType === 'multiple' && (
                              <FormField
                                  control={form.control}
                                  name="maxChoices"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>Máximo de Opciones a Elegir</FormLabel>
                                      <FormControl>
                                          <Input type="number" min="2" {...field} onChange={event => field.onChange(+event.target.value)} />
                                      </FormControl>
                                      <FormDescription>
                                          El número máximo de opciones que un votante puede seleccionar.
                                      </FormDescription>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          )}
                          
                          <FormField
                              control={form.control}
                              name="voterGroupId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Grupo de Votantes</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!groups}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un grupo de votantes elegibles..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {groups?.map(group => (
                                        <SelectItem key={group.id} value={group.id}>{group.name} ({group.voterCount} votantes)</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Solo los miembros de este grupo podrán votar en la encuesta.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </form>
                      </Form>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isSubmitting}>
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button type="submit" form="poll-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Encuesta
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div tabIndex={0} className="w-full sm:w-auto">
                      <Button disabled className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Encuesta
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Debes crear un grupo de votantes antes de poder crear una encuesta.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile View: Card List */}
        <div className="md:hidden space-y-4">
          {polls && polls.length > 0 ? (
            polls.map((poll) => <PollCard key={poll.id} poll={poll} onDelete={handleDeletePoll} isDeleting={isDeleting === poll.id} />)
          ) : (
             <div className="h-24 text-center flex flex-col justify-center items-center">
              <p>No se encontraron encuestas.</p>
              <p className="text-muted-foreground text-sm">{!hasGroups ? "Primero necesitas crear un grupo." : "¡Crea la primera!"}</p>
              {!hasGroups && <Button variant="link" onClick={() => router.push('/admin/groups')}>Ir a Grupos</Button>}
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pregunta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polls && polls.map((poll) => (
                <TableRow key={poll.id} onDoubleClick={() => router.push(`/admin/polls/${poll.id}`)} className="cursor-pointer">
                  <TableCell className="font-medium">{poll.question}</TableCell>
                  <TableCell>
                    <Badge variant={poll.status === 'open' ? 'default' : 'secondary'} className={poll.status === 'open' ? 'bg-green-500 text-white' : ''}>
                      {poll.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </TableCell>
                  <TableCell>{(poll.createdAt as any)?.toDate?.().toLocaleDateString() ?? ''}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/polls/${poll.id}`)}>
                      Ver Detalles
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting === poll.id}>
                          {isDeleting === poll.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
                          <AlertDialogAction onClick={() => handleDeletePoll(poll.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {(!polls || polls.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron encuestas. {!hasGroups ? "Primero necesitas crear un grupo." : "¡Crea la primera!"}
                    {!hasGroups && <Button variant="link" onClick={() => router.push('/admin/groups')}>Ir a Grupos</Button>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
