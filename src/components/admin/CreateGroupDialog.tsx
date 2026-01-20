'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FileUp, Loader2, PlusCircle, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription as CardDescriptionShad, CardHeader as CardHeaderShad, CardTitle as CardTitleShad } from '@/components/ui/card';


const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(50, { message: 'El nombre no puede tener más de 50 caracteres.' }),
  voterIds: z.string().optional(),
});

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      voterIds: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se ha podido crear el grupo. Inténtalo de nuevo.',
      });
      return;
    }

    setIsLoading(true);

    const voterIds = values.voterIds
      ? [
          ...new Set(
            values.voterIds
              .split(/[\n,]+/)
              .map((id) => id.trim())
              .filter((id) => id.length > 0)
          ),
        ]
      : [];

    const groupsCollection = collection(firestore, 'admins', user.uid, 'groups');
    const newGroupData = {
        name: values.name,
        adminId: user.uid,
        voterIds: voterIds,
        createdAt: serverTimestamp(),
    };

    addDoc(groupsCollection, newGroupData)
        .then(() => {
            toast({
                title: 'Grupo Creado',
                description: `El grupo "${values.name}" ha sido creado con ${voterIds.length} votantes.`,
            });
            form.reset();
            setOpen(false);
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: groupsCollection.path,
                operation: 'create',
                requestResourceData: newGroupData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsLoading(false);
        });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Grupo de Votantes</DialogTitle>
          <DialogDescription>
            Define un nombre para tu grupo y añade a los votantes. Puedes pegar una lista de IDs o cargarlos desde un archivo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Empleados de la empresa" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual"><UserPlus className="mr-2 h-4 w-4"/>Ingreso Manual</TabsTrigger>
                    <TabsTrigger value="file" disabled><FileUp className="mr-2 h-4 w-4" />Cargar Archivo</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="pt-4">
                    <FormField
                        control={form.control}
                        name="voterIds"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>IDs de Votantes</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Pega aquí los IDs, separados por comas o saltos de línea."
                                className="min-h-[120px] resize-y font-mono text-xs"
                                {...field}
                                disabled={isLoading}
                                />
                            </FormControl>
                            <FormDescription>
                                Los IDs duplicados o vacíos serán ignorados.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </TabsContent>
                <TabsContent value="file">
                    <Card className="border-dashed mt-4">
                        <CardHeaderShad className="text-center items-center">
                            <FileUp className="h-8 w-8 text-muted-foreground mb-2"/>
                            <CardTitleShad>Próximamente</CardTitleShad>
                            <CardDescriptionShad>
                                La carga de archivos Excel (.xlsx, .csv) estará disponible pronto.
                            </CardDescriptionShad>
                        </CardHeaderShad>
                    </Card>
                </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Grupo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
