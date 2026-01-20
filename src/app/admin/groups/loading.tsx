import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

function LoadingGroupCard() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-36" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-9 w-full" />
            </CardFooter>
        </Card>
    )
}

export default function GroupsLoading() {
  return (
    <div className="space-y-6">
        <CardHeader className="p-0">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-96 mt-2" />
        </CardHeader>
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle>Tus Grupos</CardTitle>
                    <Button disabled className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Grupo
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Mobile Skeleton */}
                <div className="md:hidden space-y-4">
                    <LoadingGroupCard />
                    <LoadingGroupCard />
                    <LoadingGroupCard />
                </div>
                {/* Desktop Skeleton */}
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
                        {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
