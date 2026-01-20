'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
        <CardHeader className="p-0">
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">Encuestas</CardTitle>
            <CardDescription>Crea y administra tus encuestas de votación anónima.</CardDescription>
        </CardHeader>
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle>Tus Encuestas</CardTitle>
                    <Button className="w-full sm:w-auto" disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Encuesta
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-24 text-center flex flex-col justify-center items-center">
                    <p>La funcionalidad de encuestas ha sido deshabilitada.</p>
                    <p className="text-muted-foreground text-sm">Se ha eliminado la integración con Firebase.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
