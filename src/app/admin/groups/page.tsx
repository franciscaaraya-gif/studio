import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function GroupsPage() {
  return (
    <div className="space-y-6">
        <CardHeader className="p-0">
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">Grupos de Votantes</CardTitle>
            <CardDescription>Crea y administra listas de votantes reutilizables para tus encuestas.</CardDescription>
        </CardHeader>
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <CardTitle>Tus Grupos</CardTitle>
                <Button className="w-full sm:w-auto" disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Grupo
                </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-24 text-center flex flex-col justify-center items-center">
                <p>La funcionalidad de grupos ha sido deshabilitada.</p>
                <p className="text-muted-foreground text-sm">Se ha eliminado la integración con Firebase.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
