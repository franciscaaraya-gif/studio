'use client';

import { useState, ChangeEvent, DragEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as XLSX from 'xlsx';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, where, type Firestore } from 'firebase/firestore';
import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FileUp, Loader2, PlusCircle, Trash2, Import, Link2 } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    key: string;
    fecha: any;
    clave: string;
    maquina: string;
    direccion: string;
};

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedVoters, setParsedVoters] = useState<ParsedVoter[]>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // State for direct import
  const [secondaryFirestore, setSecondaryFirestore] = useState<Firestore | null>(null);
  const [connectError, setConnectError] = useState('');
  const [otherConfig, setOtherConfig] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [selectedLlamadoKey, setSelectedLlamadoKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const resetState = () => {
    form.reset();
    setIsLoading(false);
    setIsDragging(false);
    setFileName('');
    setParsedVoters([]);
    // Reset import state
    setSecondaryFirestore(null);
    setConnectError('');
    setOtherConfig('');
    setIsConnecting(false);
    setLlamados([]);
    setSelectedLlamadoKey('');
    setIsImporting(false);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setParsedVoters([]);
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
                const idKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('id'));
                const apellidoKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('apellido'));
                const nombreKey = Object.keys(row).find(k => k.toLowerCase().trim().includes('nombre'));

                if (!idKey || !row[idKey]) return null;

                return {
                    id: String(row[idKey]).trim(),
                    apellido: apellidoKey ? String(row[apellidoKey] || '').trim() : '',
                    nombre: nombreKey ? String(row[nombreKey] || '').trim() : '',
                    enabled: true,
                };
            }).filter((v): v is ParsedVoter => v !== null);


        if (voters.length === 0){
            toast({ variant: 'destructive', title: 'Archivo no válido', description: "No se encontraron votantes. Asegúrate de que el archivo tenga una fila de cabecera y datos válidos."});
            setFileName('');
            return;
        }
        setParsedVoters(voters);
        toast({ title: 'Archivo procesado', description: `Se han encontrado ${voters.length} votantes para importar.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error al procesar el archivo', description: 'El formato del archivo es incorrecto.' });
        setFileName('');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => { toast({ variant: 'destructive', title: 'Error al leer el archivo' }); setIsLoading(false); }
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFile(e.target.files[0]); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleRemoveFile = () => { setFileName(''); setParsedVoters([]); const fileInput = document.getElementById('file-upload') as HTMLInputElement; if(fileInput) fileInput.value = ''; };

  const handleConnectToOtherDb = async () => {
    setIsConnecting(true);
    setConnectError('');
    setLlamados([]);
    setParsedVoters([]);

    let config;
    try {
        config = (new Function(`return ${otherConfig}`))();
        if (!config.apiKey || !config.projectId) {
            throw new Error("El objeto de configuración no es válido. Faltan 'apiKey' o 'projectId'.");
        }
    } catch (e) {
        setConnectError("La configuración de Firebase no es un objeto JavaScript válido.");
        setIsConnecting(false);
        return;
    }

    try {
        let secondaryApp: FirebaseApp;
        try {
            secondaryApp = getApp('import-app');
        } catch (e) {
            secondaryApp = initializeApp(config, 'import-app');
        }
        const db = getFirestore(secondaryApp);
        setSecondaryFirestore(db);

        // Fetch Llamados (API 1)
        const callsCol = collection(db, 'llamados');
        const q = query(callsCol, orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);

        const callsMap = new Map<string, Llamado>();
        snapshot.forEach(doc => {
            const data = doc.data();
            const key = `${data.fecha}-${data.clave}-${data.maquina}-${data.direccion}`;
            if (!callsMap.has(key)) {
                callsMap.set(key, { key, fecha: data.fecha, clave: data.clave, maquina: data.maquina, direccion: data.direccion });
            }
        });
        
        const callsArray = Array.from(callsMap.values());
        setLlamados(callsArray);
        toast({ title: "Conexión exitosa", description: `Se encontraron ${callsArray.length} llamados únicos.`});

    } catch (error: any) {
        setConnectError(`Error al conectar o leer datos: ${error.message}`);
    } finally {
        setIsConnecting(false);
    }
  }

  const handleImportFromLlamado = async () => {
      if (!secondaryFirestore || !selectedLlamadoKey) return;

      const llamado = llamados.find(l => l.key === selectedLlamadoKey);
      if (!llamado) return;

      setIsImporting(true);
      setParsedVoters([]);
      try {
        // Find volunteer IDs (API 2 part 1)
        const llamadosCol = collection(secondaryFirestore, 'llamados');
        const qLlamados = query(llamadosCol,
            where('fecha', '==', llamado.fecha),
            where('clave', '==', llamado.clave),
            where('maquina', '==', llamado.maquina),
            where('direccion', '==', llamado.direccion)
        );
        const llamadosSnap = await getDocs(qLlamados);
        const volunteerIds = llamadosSnap.docs.map(doc => doc.data().voluntarioId).filter(id => id);

        if (volunteerIds.length === 0) {
            toast({ title: "No se encontraron voluntarios", description: "Este llamado no tiene voluntarios asociados." });
            setIsImporting(false);
            return;
        }

        // Fetch volunteer details (API 2 part 2)
        const volunteersData: ParsedVoter[] = [];
        const volunteersCol = collection(secondaryFirestore, 'voluntarios');
        
        for (let i = 0; i < volunteerIds.length; i += 30) {
            const chunk = volunteerIds.slice(i, i + 30);
            const qVoluntarios = query(volunteersCol, where(document.Id, 'in', chunk));
            const voluntariosSnap = await getDocs(qVoluntarios);
            
            voluntariosSnap.forEach(doc => {
                const data = doc.data();
                volunteersData.push({ id: doc.id, nombre: data.nombre || '', apellido: data.apellido || '', enabled: true });
            });
        }

        setParsedVoters(volunteersData);
        setFileName(`Importado de: Llamado del ${llamado.fecha}`);
        toast({ title: "Voluntarios importados", description: `Se han cargado ${volunteersData.length} voluntarios.` });

      } catch (error: any) {
         toast({ variant: "destructive", title: "Error al importar", description: error.message });
      } finally {
        setIsImporting(false);
      }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return toast({ variant: 'destructive', title: 'Error de Autenticación' });
    if (parsedVoters.length === 0) return toast({ variant: 'destructive', title: 'No hay votantes', description: 'Por favor, sube o importa una lista de votantes.' });

    setIsLoading(true);
    const uniqueVoters = Array.from(new Map(parsedVoters.map(item => [item.id, item])).values());
    const newGroupData = { name: values.name, adminId: user.uid, voters: uniqueVoters, createdAt: serverTimestamp() };
    const groupsCollection = collection(firestore, 'admins', user.uid, 'groups');

    try {
        await addDoc(groupsCollection, newGroupData);
        toast({ title: 'Grupo Creado', description: `El grupo "${values.name}" se creó con ${uniqueVoters.length} votantes.` });
        setOpen(false);
        resetState();
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: groupsCollection.path, operation: 'create', requestResourceData: newGroupData }));
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Crear Grupo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          <DialogDescription>Crea un grupo de votantes subiendo un archivo o importándolo desde tu App de Listas.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Grupo</FormLabel><FormControl><Input placeholder="Ej: Voluntarios de la campaña" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload"><FileUp className="mr-2 h-4 w-4"/>Subir Archivo</TabsTrigger>
                    <TabsTrigger value="import"><Import className="mr-2 h-4 w-4"/>Importar de App</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="pt-4">
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
                </TabsContent>
                <TabsContent value="import" className="pt-4 space-y-4">
                    <FormItem>
                        <FormLabel>1. Conectar con la App de Listas</FormLabel>
                         <FormDescription>Pega la configuración de Firebase de tu otra aplicación para permitir una conexión de solo lectura segura.</FormDescription>
                        <Textarea 
                            placeholder={'const firebaseConfig = {\n  apiKey: "AIza...",\n  authDomain: "...",\n  projectId: "..."\n};'}
                            value={otherConfig}
                            onChange={(e) => setOtherConfig(e.target.value)}
                            rows={6}
                            className="font-mono text-xs"
                            disabled={isConnecting}
                        />
                    </FormItem>
                     <Button type="button" onClick={handleConnectToOtherDb} disabled={isConnecting || !otherConfig}>
                        {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Link2 className="mr-2 h-4 w-4" />}
                        Conectar y Cargar Llamados
                      </Button>

                    {connectError && <Alert variant="destructive"><AlertTitle>Error de Conexión</AlertTitle><AlertDescription>{connectError}</AlertDescription></Alert>}

                     {llamados.length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                            <FormItem>
                                <FormLabel>2. Seleccionar Llamado e Importar</FormLabel>
                                <FormDescription>Elige uno de los llamados únicos encontrados en tu otra aplicación.</FormDescription>
                                <Select onValueChange={setSelectedLlamadoKey} value={selectedLlamadoKey} disabled={isImporting}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un llamado..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {llamados.map((l) => (
                                        <SelectItem key={l.key} value={l.key}>
                                           Llamado del {new Date(l.fecha).toLocaleDateString()} en {l.direccion}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                            <Button type="button" onClick={handleImportFromLlamado} disabled={isImporting || !selectedLlamadoKey}>
                                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Import className="mr-2 h-4 w-4" />}
                                Importar Voluntarios del Llamado
                            </Button>
                        </div>
                     )}

                </TabsContent>
            </Tabs>


            {parsedVoters.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
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
