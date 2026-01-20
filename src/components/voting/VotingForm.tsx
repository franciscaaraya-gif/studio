'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poll } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { runTransaction, doc, collection, Timestamp } from 'firebase/firestore';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type VotingFormProps = {
  poll: Poll;
  voterId: string;
};

export function VotingForm({ poll, voterId }: VotingFormProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleCheckboxChange = (option: string, checked: boolean) => {
    setSelectedOptions(prev => {
        if (checked) {
            if (poll.maxChoices && prev.length >= poll.maxChoices) {
                toast({
                    variant: 'destructive',
                    title: `Puedes seleccionar como máximo ${poll.maxChoices} ${poll.maxChoices > 1 ? 'opciones' : 'opción'}.`,
                });
                return prev;
            }
            return [...prev, option];
        } else {
            return prev.filter(item => item !== option);
        }
    });
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      toast({ variant: 'destructive', title: 'Ninguna opción seleccionada', description: 'Por favor, selecciona al menos una opción para votar.' });
      return;
    }

    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido completar la acción. Por favor, recarga la página e inténtalo de nuevo.' });
      return;
    }
    
    setIsLoading(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const adminUserId = poll.userId;
        const pollId = poll.id;
        
        // 1. Check if the voter has already voted within the transaction
        const voterRecordRef = doc(firestore, 'users', adminUserId, 'polls', pollId, 'voters', voterId);
        const voterDoc = await transaction.get(voterRecordRef);
        if (voterDoc.exists()) {
          throw new Error("Ya has votado en esta encuesta.");
        }

        // 2. Record the vote
        const newVoteRef = doc(collection(firestore, 'users', adminUserId, 'polls', pollId, 'votes'));
        transaction.set(newVoteRef, {
          pollId,
          selectedOptions,
          createdAt: Timestamp.now(),
        });

        // 3. Mark the voter as having voted
        transaction.set(voterRecordRef, {
          pollId: pollId,
          hasVoted: true,
          isEligible: true,
          createdAt: Timestamp.now(),
        });
      });

      // If transaction is successful
      router.push('/vote/success');

    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Voto Fallido', 
        description: error.message || "No se pudo emitir tu voto. Puede que ya hayas votado o que la encuesta esté cerrada." 
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">{poll.question}</CardTitle>
        <CardDescription>
            {poll.pollType === 'multiple' 
                ? `Puedes seleccionar hasta ${poll.maxChoices} opciones. Tu voto es anónimo y final.`
                : 'Selecciona una de las opciones a continuación y emite tu voto. Esta acción es final.'
            }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {poll.pollType === 'single' ? (
            <RadioGroup onValueChange={(value) => setSelectedOptions([value])} disabled={isLoading} className="space-y-2">
            {poll.options.map((option) => (
                <div key={option} className="flex items-center space-x-2 rounded-md border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="text-base flex-1 cursor-pointer">{option}</Label>
                </div>
            ))}
            </RadioGroup>
        ) : (
            <div className="space-y-2">
                {poll.options.map((option) => (
                    <div key={option} className="flex items-center space-x-3 rounded-md border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
                        <Checkbox
                            id={option}
                            onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                            checked={selectedOptions.includes(option)}
                            disabled={isLoading || (!selectedOptions.includes(option) && poll.maxChoices != null && selectedOptions.length >= poll.maxChoices)}
                        />
                        <Label htmlFor={option} className="text-base flex-1 cursor-pointer">{option}</Label>
                    </div>
                ))}
            </div>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" size="lg" disabled={isLoading || selectedOptions.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir Voto
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirma tu Voto</AlertDialogTitle>
              <AlertDialogDescription>
                Has seleccionado: <span className="font-bold text-foreground">{selectedOptions.join(', ')}</span>.
                <br />
                Esta acción no se puede deshacer. ¿Estás seguro de que quieres emitir este voto?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>Confirmar y Votar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}
