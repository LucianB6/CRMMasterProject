'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Mail, ShieldCheck, User } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
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
import { apiFetch } from '../../../lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
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
      title: 'Profile updated!',
      description: 'Your information has been saved successfully.',
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
    console.log('Changing password', values);
    toast({
      title: 'Password changed!',
      description: 'Your password has been updated successfully.',
    });
    passwordForm.reset();
  }

  const watchedProfile = profileForm.watch();
  const displayName =
    [watchedProfile.firstName, watchedProfile.lastName].filter(Boolean).join(' ').trim() ||
    'Profil utilizator';

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-auto bg-slate-50 p-8">
      <div className="mx-auto flex w-full max-w-[1700px] min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Profil</h2>
            <p className="text-slate-500">
              Gestionează datele personale și securitatea contului tău.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Cont activ"
            value={displayName}
            icon={<User className="h-5 w-5 text-blue-600" />}
          />
          <SummaryCard
            label="Email"
            value={watchedProfile.email || 'Nedisponibil'}
            icon={<Mail className="h-5 w-5 text-emerald-600" />}
          />
          <SummaryCard
            label="Securitate"
            value="Parolă protejată"
            icon={<ShieldCheck className="h-5 w-5 text-amber-500" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-sm font-semibold text-slate-800">Informații personale</h3>
              <p className="mt-1 text-sm text-slate-500">
                Actualizează identitatea vizibilă în platformă.
              </p>
            </div>

            <div className="p-6">
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                    <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <Avatar className="h-24 w-24 border border-slate-200">
                        <AvatarFallback className="bg-white text-xl font-semibold text-slate-700">
                          {initials || <User className="h-12 w-12 text-slate-400" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prenume</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ion" className="border-slate-200 bg-white" />
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
                              <Input {...field} placeholder="Popescu" className="border-slate-200 bg-white" />
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
                        <FormLabel>Adresă de email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" readOnly disabled className="border-slate-200 bg-slate-50 text-slate-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      Salvează modificările
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-50 p-3">
                  <KeyRound className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Schimbă parola</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Folosește o parolă puternică pentru siguranța contului.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
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
                          <Input {...field} type="password" placeholder="••••••••" className="border-slate-200 bg-white" />
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
                          <Input {...field} type="password" placeholder="••••••••" className="border-slate-200 bg-white" />
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
                          <Input {...field} type="password" placeholder="••••••••" className="border-slate-200 bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                      Actualizează parola
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-full bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}
