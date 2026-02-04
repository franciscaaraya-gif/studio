'use client';

import { useState, ChangeEvent, DragEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as XLSX from 'xlsx';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FileUp, Loader2, PlusCircle, Trash2 } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(50, { message: 'El nombre no puede tener más de 50 caracteres.' }),
});

type ParsedVoter = {
    id: string;
    nombre: string;
    apellido: string;
    enabled: boolean;
}

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedVoters, setParsedVoters] = useState<ParsedVoter[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const resetState = () => {
    form.reset();
    setIsLoading(false);
    setIsDragging(false);
    setFileName('');
    setParsedVoters([]);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        const voters = rows
            .map(row => {
                // Find keys for id, nombre, apellido, ignoring case and spaces
                const idKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('id'));
                const apellidoKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('apellido'));
                const nombreKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('nombre'));

                if (!idKey || !row[idKey]) return null; // Skip rows without a valid ID

                return {
                    id: String(row[idKey]).trim(),
                    apellido: apellidoKey ? String(row[apellidoKey] || '').trim() : '',
                    nombre: nombreKey ? String(row[nombreKey] || '').trim() : '',
                    enabled: true,
                };
            }).filter((v): v is ParsedVoter => v !== null);


        if (voters.length === 0){
            toast({
                variant: 'destructive',
                title: 'Archivo no válido',
                description: "No se encontraron votantes. Asegúrate de que el archivo tenga una fila de cabecera y datos válidos."
            })
            setFileName('');
            return;
        }
        setParsedVoters(voters);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error al procesar el archivo', description: 'El formato del archivo es incorrecto.' });
        setFileName('');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error al leer el archivo' });
        setIsLoading(false);
    }
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFile(e.target.files[0]); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleRemoveFile = () => { setFileName(''); setParsedVoters([]); const fileInput = document.getElementById('file-upload') as HTMLInputElement; if(fileInput) fileInput.value = ''; };

  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return toast({ variant: 'destructive', title: 'Error de Autenticación' });
    if (parsedVoters.length === 0) return toast({ variant: 'destructive', title: 'No hay votantes', description: 'Por favor, sube una lista de votantes.' });

    setIsLoading(true);
    const uniqueVoters = Array.from(new Map(parsedVoters.map(item => [item.id, item])).values());
    const newGroupData = { name: values.name, adminId: user.uid, voters: uniqueVoters, createdAt: serverTimestamp() };
    const groupsCollection = collection(firestore, 'admins', user.uid, 'groups');

    addDoc(groupsCollection, newGroupData)
        .then(() => {
            toast({ title: 'Grupo Creado', description: `El grupo "${values.name}" se creó con ${uniqueVoters.length} votantes.` });
            resetState();
            setOpen(false);
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: groupsCollection.path, operation: 'create', requestResourceData: newGroupData }));
        })
        .finally(() => setIsLoading(false));
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Crear Grupo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          <DialogDescription>Sube un archivo Excel (.xlsx, .csv) para crear un nuevo grupo de votantes.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Grupo</FormLabel><FormControl><Input placeholder="Ej: Empleados de la empresa" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <FormItem>
                <FormLabel>Archivo de Votantes</FormLabel>
                <div className={cn("relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors", isDragging && "border-primary bg-primary/10")}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onClick={() => document.getElementById('file-upload')?.click()}>
                    <FileUp className="w-10 h-10 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para subir</span> o arrastra</p><p className="text-xs text-muted-foreground">Archivo Excel (.xlsx, .csv)</p>
                    <Input id="file-upload" type="file" className="hidden" accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} disabled={isLoading}/>
                </div>
                <FormDescription className="pt-2">
                    Asegúrate de que tu archivo tenga una fila de cabecera. El sistema buscará columnas que contengan 'id', 'apellido' y 'nombre' para mapear los datos.
                </FormDescription>
            </FormItem>

            {parsedVoters.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Votantes a Importar: {parsedVoters.length}</h4>
                        <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleRemoveFile}><Trash2 className="mr-1 h-3 w-3" /> Limpiar</Button>
                    </div>
                    <p className='text-sm text-muted-foreground -mt-2'>Fuente: <span className='font-medium'>{fileName}</span>. Los IDs duplicados serán omitidos.</p>
                    <ScrollArea className="h-40 border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre Completo</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {parsedVoters.map((voter, index) => (
                                    <TableRow key={`${voter.id}-${index}`}><TableCell className="font-mono text-xs">{voter.id}</TableCell><TableCell>{voter.nombre} {voter.apellido}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading || parsedVoters.length === 0}>
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
