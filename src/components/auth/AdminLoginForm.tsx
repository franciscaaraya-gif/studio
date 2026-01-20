"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor ingresa un correo electrónico válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Set persistence to SESSION before signing in.
      // This means the user will be logged out when the browser session ends (e.g., tab is closed).
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // Redirection is handled by the AdminLayout which will detect the auth state change.
    } catch (error: any) {
      console.error("Login failed:", error);
      let errorMessage = "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Correo electrónico o contraseña inválidos.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Por favor, ingresa una dirección de correo electrónico válida.';
            break;
          default:
            errorMessage = `Error: ${error.message}`;
            break;
        }
      }
      toast({
        variant: "destructive",
        title: "Acceso Fallido",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Acceso Administrador</CardTitle>
        <CardDescription>
         Para acceder, crea un usuario en tu Consola de Firebase (Authentication &gt; Users &gt; Add User) y luego inicia sesión aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@ejemplo.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Acceder con Correo
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
