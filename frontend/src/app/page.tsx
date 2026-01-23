import { AreaChart, Bot, ShieldCheck, Telescope } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "../lib/placeholder-images";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Logo } from "../components/logo";

const heroImage = PlaceHolderImages.find((img) => img.id === "landing-hero");
const featureImages = {
  reporting: PlaceHolderImages.find((img) => img.id === "feature-reporting"),
  ai: PlaceHolderImages.find((img) => img.id === "feature-ai"),
  performance: PlaceHolderImages.find(
    (img) => img.id === "feature-performance"
  )
};
const avatars = {
  "avatar-1": PlaceHolderImages.find((img) => img.id === "avatar-1"),
  "avatar-2": PlaceHolderImages.find((img) => img.id === "avatar-2"),
  "avatar-3": PlaceHolderImages.find((img) => img.id === "avatar-3")
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section
          id="hero"
          className="container mx-auto px-4 py-20 text-center md:px-6 md:py-32"
        >
          <h1 className="font-headline text-4xl font-bold tracking-tight md:text-6xl">
            Empower Your Sales Team, Effortlessly.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            SalesWay is the all-in-one workspace for service-based companies to
            track activity, manage performance, and drive growth with
            unprecedented transparency.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">Request a Demo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
          {heroImage && (
            <div className="mt-12 rounded-lg border bg-card p-2 shadow-2xl">
              {/* <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                data-ai-hint={heroImage.imageHint}
                width={1200}
                height={800}
                className="rounded-md"
              /> */}
            </div>
          )}
        </section>

        <section id="features" className="bg-muted py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">
                A Smarter Way to Manage Sales
              </h2>
              <p className="mt-4 text-muted-foreground">
                From daily reporting to AI-powered coaching, SalesWay gives you
                the tools to build a high-performance team.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary p-4 text-primary-foreground">
                  <AreaChart className="h-8 w-8" />
                </div>
                <h3 className="font-headline text-xl font-semibold">
                  Real-Time Analytics
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Centralize reporting and visualize KPIs with our interactive
                  dashboard.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary p-4 text-primary-foreground">
                  <Telescope className="h-8 w-8" />
                </div>
                <h3 className="font-headline text-xl font-semibold">
                  Full Transparency
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Gain complete visibility into your team's daily activities and
                  historical trends.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary p-4 text-primary-foreground">
                  <Bot className="h-8 w-8" />
                </div>
                <h3 className="font-headline text-xl font-semibold">
                  AI Sales Assistant
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Provide your team with instant coaching and data-driven
                  recommendations.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary p-4 text-primary-foreground">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="font-headline text-xl font-semibold">
                  Scalable Management
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Control roles, access, and reporting workflows as your company
                  grows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">
                Trusted by Top-Performing Teams
              </h2>
              <p className="mt-4 text-muted-foreground">
                See what managers and agents are saying about SalesWay.
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <p className="mb-4">
                    "SalesWay has revolutionized how we track performance. The
                    real-time dashboard gives me the insights I need to manage my
                    team effectively without constant check-ins."
                  </p>
                  <div className="flex items-center gap-4">
                    {avatars['avatar-1'] && (
                      <Avatar>
                        <AvatarImage
                          src={avatars['avatar-1'].imageUrl}
                          alt={avatars['avatar-1'].description}
                          data-ai-hint={avatars['avatar-1'].imageHint}
                        />
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">Sarah, Manager</p>
                      <p className="text-sm text-muted-foreground">
                        Acme Solutions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="mb-4">
                    "The daily activity report is so simple to use. I love that I
                    can update it throughout the day. The AI assistant is a
                    game-changer for getting quick tips."
                  </p>
                  <div className="flex items-center gap-4">
                    {avatars['avatar-2'] && (
                      <Avatar>
                        <AvatarImage
                          src={avatars['avatar-2'].imageUrl}
                          alt={avatars['avatar-2'].description}
                          data-ai-hint={avatars['avatar-2'].imageHint}
                        />
                        <AvatarFallback>JA</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">John, Sales Agent</p>
                      <p className="text-sm text-muted-foreground">
                        Innovate Corp
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="mb-4">
                    "As an admin, provisioning accounts and managing roles is a
                    breeze. SalesWay is powerful yet incredibly intuitive.
                    Finally, a platform built for how sales teams actually work."
                  </p>
                  <div className="flex items-center gap-4">
                    {avatars['avatar-3'] && (
                      <Avatar>
                        <AvatarImage
                          src={avatars['avatar-3'].imageUrl}
                          alt={avatars['avatar-3'].description}
                          data-ai-hint={avatars['avatar-3'].imageHint}
                        />
                        <AvatarFallback>DC</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">David, Admin</p>
                      <p className="text-sm text-muted-foreground">
                        Strive Enterprises
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SalesWay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
