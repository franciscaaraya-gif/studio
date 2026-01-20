'use client';

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, query, orderBy, addDoc, Timestamp, getDocs, where, limit, doc, deleteDoc } from "firebase/firestore";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { VoterGroup } from "@/lib/types";
import * as XLSX from 'xlsx';
import { SHA256 } from 'crypto-js';

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Loader2, Upload, Eye, Calendar, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const groupFormSchema = z.object({
  name: z.string().min(3, "El nombre del grupo debe tener al menos 3 caracteres."),
  voters: z.string().min(1, "Debes cargar o pegar una lista de votantes."),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

// Mobile-friendly card for a single group
function GroupCard({ group, onDelete, isDeleting }: { group: VoterGroup, onDelete: (groupId: string) => void, isDeleting: boolean }) {
  const date = (group.createdAt as any).toDate().toLocaleDateString();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{group.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground gap-2">
          <Users className="h-4 w-4" />
          <span>{group.voterCount} votantes</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground gap-2">
          <Calendar className="h-4 w-4" />
          <span>Creado el {date}</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" className="w-full" disabled>
          <Eye className="mr-2 h-4 w-4" />
          Ver Grupo
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" className="shrink-0" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro de que quieres eliminar este grupo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el grupo "{group.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(group.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}

export function GroupList() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { firestore, user } = useFirebase();

  const groupsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, "users", user.uid, "voterGroups"), orderBy("createdAt", "desc"));
  }, [firestore, user]);

  const { data: groups, error: groupsError } = useCollection<VoterGroup>(groupsQuery);

  useEffect(() => {
    if (groupsError) {
      console.error("Error fetching groups:", groupsError);
      toast({
          variant: "destructive",
          title: "Error al Cargar Grupos",
          description: "No se pudieron obtener los grupos. Revisa tus permisos e inténtalo de nuevo."
      });
    }
  }, [groupsError, toast]);
  
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      voters: "",
    },
  });

  const handleDeleteGroup = async (groupId: string) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Por favor, recarga la página e inténtalo de nuevo.' });
      return;
    }
    setIsDeleting(groupId);

    try {
        const db = firestore;
        const groupRef = doc(db, 'users', user.uid, 'voterGroups', groupId);
        
        // Check if any poll uses this group before deleting
        const pollsRef = collection(db, 'users', user.uid, 'polls');
        const q = query(pollsRef, where('voterGroupId', '==', groupId), limit(1));
        const pollsUsingGroupQuery = await getDocs(q);
        
        if (!pollsUsingGroupQuery.empty) {
          toast({ variant: 'destructive', title: 'Error al Eliminar', description: 'Este grupo está siendo utilizado por al menos una encuesta y no puede ser eliminado.' });
          setIsDeleting(null);
          return;
        }

        await deleteDoc(groupRef);
        toast({ title: "Grupo Eliminado", description: "El grupo ha sido eliminado exitosamente." });

    } catch (error: any) {
        console.error('Error deleting group', error);
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: error.message || 'Fallo al eliminar el grupo.' });
    }

    setIsDeleting(null);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as (string | number)[][];
        
        const voterIds = json
          .map(row => row[0])
          .filter(id => id !== null && id !== undefined && String(id).trim() !== '')
          .map(String)
          .join('\n');
        
        if (event.target) {
            event.target.value = '';
        }

        if (voterIds.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No se encontraron votantes',
                description: 'Asegúrate de que el archivo Excel no esté vacío y que los IDs de votante estén en la primera columna.',
            });
            return;
        }

        form.setValue('voters', voterIds, { shouldValidate: true });
        toast({
          title: 'Votantes Cargados',
          description: `Se han cargado ${voterIds.split('\n').length} IDs de votantes desde el archivo.`,
        });

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Error al Procesar el Archivo",
          description: "No se pudo leer el archivo Excel. Por favor, asegúrate de que tiene el formato correcto.",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  async function onSubmit(data: GroupFormValues) {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un grupo." });
      return;
    }
    
    setIsSubmitting(true);
    let newGroupDataForError: any = null;

    try {
      const { name, voters } = data;
      const voterIds = voters
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (voterIds.length === 0) {
        throw new Error("La lista de votantes no puede estar vacía.");
      }
      const uniqueVoterIds = [...new Set(voterIds)];
      const voterIdHashes = uniqueVoterIds.map(id => SHA256(id).toString());

      const newGroup = {
        name,
        userId: user.uid,
        voterIds: uniqueVoterIds,
        voterIdHashes,
        voterCount: uniqueVoterIds.length,
        createdAt: Timestamp.now(),
      };
      newGroupDataForError = { ...newGroup };
      
      const groupCollectionRef = collection(firestore, 'users', user.uid, 'voterGroups');
      await addDoc(groupCollectionRef, newGroup);
      
      toast({ title: "¡Grupo Creado!", description: "Tu nuevo grupo de votantes ha sido creado exitosamente." });
      form.reset();
      setOpen(false);

    } catch (error: any) {
        if (newGroupDataForError) {
            const groupCollectionRef = collection(firestore, 'users', user.uid, 'voterGroups');
            const contextualError = new FirestorePermissionError({
                operation: 'create',
                path: groupCollectionRef.path,
                requestResourceData: newGroupDataForError
            });
            errorEmitter.emit('permission-error', contextualError);
        }
        toast({ 
          variant: "destructive", 
          title: "Error al Crear Grupo", 
          description: error.message || "Ocurrió un problema al enviar el formulario."
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle>Tus Grupos</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Crear un Nuevo Grupo de Votantes</DialogTitle>
                <DialogDescription>
                  Dale un nombre a tu grupo y carga la lista de IDs de votantes.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} id="group-form" className="space-y-4 py-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Grupo</FormLabel>
                          <FormControl>
                            <Input placeholder="ej., Departamento de Marketing" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="voters"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center mb-2">
                            <FormLabel>Lista de Votantes</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isSubmitting}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Cargar Excel
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="Pega una lista de IDs de votantes, uno por línea, o carga un archivo Excel."
                              className="resize-y"
                              rows={8}
                              {...field}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormDescription>
                            Cada ID debe estar en una nueva línea o en la primera columna de un archivo Excel.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".xlsx, .xls"
                    />
                  </form>
                </Form>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" form="group-form" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Crear Grupo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         {/* Mobile View: Card List */}
        <div className="md:hidden space-y-4">
          {groups && groups.length > 0 ? (
            groups.map((group) => <GroupCard key={group.id} group={group} onDelete={handleDeleteGroup} isDeleting={isDeleting === group.id} />)
          ) : (
            <div className="h-24 text-center flex flex-col justify-center items-center">
              <p>No se encontraron grupos.</p>
              <p className="text-muted-foreground text-sm">¡Crea el primero!</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nº de Votantes</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {groups && groups.map((group) => (
                <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.voterCount}</TableCell>
                    <TableCell>{(group.createdAt as any).toDate().toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled>
                        <Eye className="h-4 w-4"/>
                        <span className="sr-only">Ver Grupo</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting === group.id}>
                          {isDeleting === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro de que quieres eliminar este grupo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el grupo "{group.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </TableCell>
                </TableRow>
                ))}
                {(!groups || groups.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No se encontraron grupos. ¡Crea el primero!
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
