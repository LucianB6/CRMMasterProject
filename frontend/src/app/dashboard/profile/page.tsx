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
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.'),
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
    console.log('Changing password');
    toast({
      title: 'Password changed!',
      description: 'Your password has been updated successfully.',
    });
    passwordForm.reset();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">My Profile</h1>
        <p className="text-muted-foreground">
          View and update your account details.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            Update your photo and personal details here.
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
                    Change photo
                  </Button>
                </div>
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" readOnly disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            For account security, choose a strong password.
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
                    <FormLabel>Current password</FormLabel>
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
                    <FormLabel>New password</FormLabel>
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
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Change password</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
