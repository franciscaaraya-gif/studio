'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  pollId: z.string().min(1, { message: 'El ID de la encuesta es requerido.' }),
  voterId: z.string().min(1, { message: 'Tu ID de votante es requerido.' }),
});

export function UserLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { pollId: '', voterId: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const pollId = values.pollId.trim();
    const voterId = values.voterId.trim();
    
    if (pollId && voterId) {
      router.push(`/vote/${pollId}?voterId=${voterId}`);
    } else {
      toast({
        variant: 'destructive',
        title: 'Datos Incompletos',
        description: 'Por favor, ingresa el ID de la encuesta y tu ID de votante.',
      });
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Acceder a Encuesta</CardTitle>
        <CardDescription>
            Ingresa el ID de la encuesta y tu ID de votante. Encontrarás ambos en la invitación o en el enlace que te enviaron.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pollId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de la Encuesta</FormLabel>
                  <FormControl>
                    <Input placeholder="Pega el ID de la encuesta aquí" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="voterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tu ID de Votante</FormLabel>
                  <FormControl>
                    <Input placeholder="Pega tu ID de votante aquí" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ir a Votar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
