'use client';

import { useState, ChangeEvent, DragEvent, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as XLSX from 'xlsx';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FileUp, Loader2, PlusCircle, Trash2, Import, ChevronDown } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(50, { message: 'El nombre no puede tener más de 50 caracteres.' }),
});

type ParsedVoter = {
    id: string;
    nombre: string;
    apellido: string;
    enabled: boolean;
}

type Llamado = {
    id: string;
    nombre: string;
    fecha: { seconds: number, nanoseconds: number };
}

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedVoters, setParsedVoters] = useState<ParsedVoter[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // State for the new import flow
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importStep, setImportStep] = useState<'initial' | 'llamados_loaded'>('initial');
  const [selectedLlamadoId, setSelectedLlamadoId] = useState<string>('');

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
    setActiveTab('upload');
    // Reset import flow state
    setLlamados([]);
    setIsImportLoading(false);
    setImportStep('initial');
    setSelectedLlamadoId('');
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
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        const voters = rows
            .filter(row => Array.isArray(row) && row[0]) 
            .map(row => ({
                id: String(row[0]).trim(),
                apellido: String(row[1] || '').trim(),
                nombre: String(row[2] || '').trim(),
                enabled: true,
            }));

        if (voters.length === 0){
            toast({
                variant: 'destructive',
                title: 'Archivo no válido',
                description: "No se encontraron votantes válidos. Asegúrate de que la primera columna contenga los IDs."
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

  // Step 1: Fetch list of "llamados"
  const handleFetchLlamados = async () => {
    setIsImportLoading(true);
    setParsedVoters([]);
    
    // --- GUÍA DE CONFIGURACIÓN DE API ---
    // 1. Despliega la Cloud Function 'getLlamados' en tu otro proyecto de Firebase.
    // 2. Al desplegarla, Firebase te dará una URL. Pégala en la constante de abajo.
    const getLlamadosApiUrl = 'URL_DE_TU_FUNCION_GETLLAMADOS_AQUI';

    if (getLlamadosApiUrl === 'URL_DE_TU_FUNCION_GETLLAMADOS_AQUI') {
        toast({ variant: "destructive", title: "Configuración Requerida", description: "Edita 'CreateGroupDialog.tsx' y configura la URL de la API 'getLlamados'.", duration: 8000 });
        setIsImportLoading(false);
        return;
    }

    try {
        const response = await fetch(getLlamadosApiUrl);
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);
        
        const data: Llamado[] = await response.json();
        if (data.length === 0) {
            toast({ title: "No se encontraron llamados", description: "La API no devolvió ningún llamado para importar." });
        } else {
            setLlamados(data);
            setImportStep('llamados_loaded');
            toast({ title: "Llamados Cargados", description: "Selecciona un llamado para importar sus voluntarios." });
        }
    } catch (error: any) {
        console.error("Error al importar llamados:", error);
        toast({ variant: "destructive", title: "Error de importación", description: error.message || "No se pudo obtener la lista de llamados." });
    } finally {
        setIsImportLoading(false);
    }
  };
  
  // Step 2: Fetch volunteers for the selected "llamado"
  const handleLlamadoSelection = async (llamadoId: string) => {
    if (!llamadoId) return;
    setSelectedLlamadoId(llamadoId);
    setIsImportLoading(true);
    setParsedVoters([]);
    
    // --- GUÍA DE CONFIGURACIÓN DE API ---
    // 1. Despliega la Cloud Function 'getVoluntariosFromLlamado' en tu otro proyecto.
    // 2. Al desplegarla, Firebase te dará una URL. Pégala en la constante de abajo.
    const getVoluntariosApiUrl = 'URL_DE_TU_FUNCION_GETVOLUNTARIOS_AQUI';

    if (getVoluntariosApiUrl === 'URL_DE_TU_FUNCION_GETVOLUNTARIOS_AQUI') {
        toast({ variant: "destructive", title: "Configuración Requerida", description: "Edita 'CreateGroupDialog.tsx' y configura la URL de la API 'getVoluntariosFromLlamado'.", duration: 8000 });
        setIsImportLoading(false);
        return;
    }
    
    try {
        // La URL debe incluir el ID del llamado como parámetro de consulta.
        const response = await fetch(`${getVoluntariosApiUrl}?id=${llamadoId}`);
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);
        
        const data: ParsedVoter[] = await response.json();
        if (data.length === 0) {
            toast({ title: 'Llamado sin voluntarios', description: 'Este llamado no tiene voluntarios para importar.' });
            setParsedVoters([]);
        } else {
            setParsedVoters(data);
            const llamadoName = llamados.find(l => l.id === llamadoId)?.nombre || 'Llamado seleccionado';
            setFileName(`Importado de "${llamadoName}"`);
            toast({ title: '¡Voluntarios cargados!', description: `Se han cargado ${data.length} voluntarios.` });
        }
    } catch (error: any) {
        console.error("Error al importar voluntarios:", error);
        toast({ variant: "destructive", title: "Error de importación", description: error.message || "No se pudo obtener la lista de voluntarios." });
    } finally {
        setIsImportLoading(false);
    }
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return toast({ variant: 'destructive', title: 'Error de Autenticación' });
    if (parsedVoters.length === 0) return toast({ variant: 'destructive', title: 'No hay votantes', description: 'Por favor, sube o importa una lista de votantes.' });

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
          <DialogDescription>Sube un archivo o importa desde tu app para crear un nuevo grupo de votantes.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Grupo</FormLabel><FormControl><Input placeholder="Ej: Empleados de la empresa" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
                <TabsTrigger value="import">Importar de App</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-4">
                 <FormItem>
                    <FormLabel className='sr-only'>Archivo de Votantes</FormLabel>
                    <div className={cn("relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors", isDragging && "border-primary bg-primary/10")}
                        onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onClick={() => document.getElementById('file-upload')?.click()}>
                        <FileUp className="w-10 h-10 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para subir</span> o arrastra</p><p className="text-xs text-muted-foreground">Archivo Excel (.xlsx, .csv)</p>
                        <Input id="file-upload" type="file" className="hidden" accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} disabled={isLoading}/>
                    </div>
                    <FormDescription className="pt-2">Se usará la primera columna para 'id', la segunda para 'apellido' y la tercera para 'nombre'.</FormDescription>
                </FormItem>
              </TabsContent>
              <TabsContent value="import" className="mt-4 space-y-4">
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <Import className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-semibold">Importación en 2 pasos</h3>
                    <p className="text-sm text-muted-foreground">Primero, busca los llamados disponibles. Luego, selecciona uno para importar sus voluntarios.</p>
                </div>
                
                {importStep === 'initial' && (
                    <Button type="button" onClick={handleFetchLlamados} disabled={isImportLoading} className='w-full'>
                        {isImportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Import className="mr-2 h-4 w-4" />}
                        Buscar Llamados en la App
                    </Button>
                )}

                {importStep === 'llamados_loaded' && (
                    <div className='space-y-4'>
                        <FormItem>
                            <FormLabel>1. Selecciona un Llamado</FormLabel>
                            <Select onValueChange={handleLlamadoSelection} value={selectedLlamadoId} disabled={isImportLoading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Elige un llamado para importar..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {llamados.map(l => (
                                        <SelectItem key={l.id} value={l.id}>
                                            {l.nombre} - {l.fecha ? format(new Date(l.fecha.seconds * 1000), "d MMM yyyy", { locale: es }) : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                        
                        <Button type="button" variant="outline" onClick={() => { setImportStep('initial'); setLlamados([]); setSelectedLlamadoId(''); }} className='w-full'>
                            Volver a buscar
                        </Button>
                    </div>
                )}
              </TabsContent>
            </Tabs>

            {parsedVoters.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Votantes a Importar: {parsedVoters.length}</h4>
                        <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleRemoveFile}><Trash2 className="mr-1 h-3 w-3" /> Limpiar</Button>
                    </div>
                    <p className='text-sm text-muted-foreground -mt-2'>Fuente: <span className='font-medium'>{fileName}</span>. Duplicados serán omitidos.</p>
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

    