'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const createAgentSchema = z.object({
  firstName: z.string().min(1, 'Prenumele este obligatoriu.'),
  lastName: z.string().min(1, 'Numele este obligatoriu.'),
  email: z.string().email('Te rugăm să introduci o adresă de email validă.'),
});

export default function CreateAgentPage() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createAgentSchema>>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof createAgentSchema>) {
    console.log('Creating new agent:', values);
    toast({
      title: 'Cont creat cu succes!',
      description: `Contul pentru ${values.firstName} ${values.lastName} a fost creat.`,
    });
    form.reset();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Creează Cont Agent</h1>
        <p className="text-muted-foreground">
          Adaugă un nou membru în echipa ta de vânzări.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalii Agent</CardTitle>
          <CardDescription>
            Completează detaliile de mai jos pentru a crea un cont nou. Agentul
            va primi un email pentru a-și seta parola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prenume</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume</FormLabel>
                      <FormControl>
                        <Input placeholder="Popescu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresă de Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="alex.popescu@exemplu.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Creează Cont</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
