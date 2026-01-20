import { GroupList } from '@/components/groups/GroupList';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GroupsPage() {
  return (
    <div className="space-y-6">
        <CardHeader className="p-0">
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">Grupos de Votantes</CardTitle>
            <CardDescription>Crea y administra listas de votantes reutilizables para tus encuestas.</CardDescription>
        </CardHeader>
        <GroupList />
    </div>
  );
}
