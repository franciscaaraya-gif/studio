import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function GroupDetailsLoading() {
  return (
    <div className="space-y-6">
        <div className='flex items-center justify-between'>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
        </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-5 w-80 mt-2" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
