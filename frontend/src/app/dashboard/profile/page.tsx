'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import { Separator } from '../../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Prenumele este obligatoriu.'),
  lastName: z.string().min(1, 'Numele este obligatoriu.'),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Parola curentă este obligatorie.'),
    newPassword: z
      .string()
      .min(8, 'Parola nouă trebuie să aibă minim 8 caractere.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Parolele nu se potrivesc.',
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const { toast } = useToast();
  const [initials, setInitials] = React.useState('??');

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    console.log('Updating profile:', values);
    toast({
      title: 'Profil actualizat!',
      description: 'Informațiile tale au fost salvate cu succes.',
    });
  }

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (typeof window === 'undefined') return;
      const token = window.localStorage.getItem('salesway_token');
      if (!token) return;

      try {
        const data = await apiFetch<{
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
        }>('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const firstName = data.firstName ?? '';
        const lastName = data.lastName ?? '';
        const email = data.email ?? '';
        profileForm.reset({ firstName, lastName, email });

        const fallbackName = email ? email.split('@')[0] : '';
        const resolvedName = `${firstName} ${lastName}`.trim() || fallbackName;
        const nextInitials = resolvedName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
        setInitials(nextInitials || '??');
      } catch (error) {
        console.error('Failed to load profile info', error);
      }
    };

    void fetchProfile();
  }, [profileForm]);

  function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    console.log('Changing password');
    toast({
      title: 'Parolă schimbată!',
      description: 'Parola ta a fost actualizată cu succes.',
    });
    passwordForm.reset();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Profilul Meu</h1>
        <p className="text-muted-foreground">
          Vezi și actualizează detaliile contului tău.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Informații personale</CardTitle>
          <CardDescription>
            Actualizează fotografia și detaliile personale aici.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-6"
            >
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-muted text-lg font-semibold">
                      {initials || <User className="h-12 w-12 text-muted-foreground" />}
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm">
                    <Camera className="mr-2 h-4 w-4" />
                    Schimbă poza
                  </Button>
                </div>
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prenume</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nume</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresă de Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" readOnly disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Salvează modificările</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Schimbă parola</CardTitle>
          <CardDescription>
            Pentru securitatea contului tău, alege o parolă puternică.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parola curentă</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parola nouă</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmă parola nouă</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Schimbă parola</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
