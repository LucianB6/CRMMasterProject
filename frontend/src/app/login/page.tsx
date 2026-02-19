"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Logo } from "../../components/logo";
import { ApiError, apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  password: z.string().min(1, {
    message: "Password is required."
  })
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });


  const resolveLandingRoute = async (token: string) => {
    try {
      await apiFetch("/manager/overview/agents", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });
      return { route: "/dashboard/manager/overview", role: "manager" };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return { route: "/dashboard", role: "agent" };
      }
      // Swallow probe errors to avoid leaking role information.
    }
    return { route: "/dashboard", role: "agent" };
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const payload = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      localStorage.setItem("salesway_token", payload.token);
      const { route: landingRoute, role } = await resolveLandingRoute(
        payload.token
      );
      localStorage.setItem("userRole", role);
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard..."
      });
      router.push(landingRoute);
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Email or password is incorrect.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 font-body">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="manager@example.com"
                        {...field}
                        type="email"
                      />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="#"
                        className="text-sm font-medium text-[#67C6EE] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  type="submit"
                  className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
