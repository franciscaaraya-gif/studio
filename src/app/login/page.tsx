import { UserLoginForm } from "@/components/auth/UserLoginForm";
import Link from "next/link";
import { ElectorIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function UserLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2" prefetch={false}>
              <ElectorIcon className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold tracking-tight text-primary font-headline">E-lector</span>
            </Link>
        </div>
        <UserLoginForm />
        <div className="mt-4 text-center">
            <Button variant="link" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Inicio
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
