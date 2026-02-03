import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElectorIcon } from "@/components/icons";

export default function VoteSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-8">
                <Link href="/" className="flex items-center justify-center gap-2" prefetch={false}>
                    <ElectorIcon className="h-10 w-10 text-primary" />
                    <span className="text-2xl font-bold tracking-tight text-primary font-headline">E-lector</span>
                </Link>
            </div>
            <Card className="shadow-lg">
                <CardHeader className="items-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                    <CardTitle className="text-3xl font-headline">¡Voto Emitido Exitosamente!</CardTitle>
                    <CardDescription>Gracias por participar.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    <p className="text-muted-foreground">Tu voto anónimo ha sido registrado de forma segura.</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/inbox">Volver a la bandeja de entrada</Link>
                        </Button>
                        <Button asChild className="w-full">
                            <Link href="/">Volver al Inicio</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
