'use client';

import Image from "next/image";
import Link from "next/link";
import { Check, Menu } from "lucide-react";

import { Logo } from "../components/logo";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";

const assets = {
  logo: "https://i.imgur.com/lZ9NXdQ.png",
  iphone1: "https://i.imgur.com/Rd4GlCH.png",
  iphone2: "https://i.imgur.com/P9gVLfv.png",
  featureIcon1: "https://i.imgur.com/PQuDvx8.png",
  featureIcon2: "https://i.imgur.com/Lrl19vy.png",
  featureIcon3: "https://i.imgur.com/4p7Bnoj.png",
  featureIcon4: "https://i.imgur.com/e263IYy.png",
};

const features = [
  {
    icon: assets.featureIcon1,
    title: "Daily Activity Reporting",
    description:
      "Centralize reporting and visualize KPIs with our interactive dashboard.",
  },
  {
    icon: assets.featureIcon2,
    title: "Full Transparency",
    description:
      "Gain complete visibility into your team's daily activities and historical trends.",
  },
  {
    icon: assets.featureIcon3,
    title: "AI Sales Assistant",
    description:
      "Provide your team with instant coaching and data-driven recommendations.",
  },
  {
    icon: assets.featureIcon4,
    title: "Performance Management",
    description:
      "Set goals, track progress, and foster a transparent environment to drive your team's growth.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    planCode: "STARTER",
    price: "$29",
    description: "For individuals and small teams just getting started.",
    features: [
      "Up to 3 users",
      "Daily Activity Reporting",
      "Basic Dashboard",
      "Community Support",
    ],
    cta: "Choose Starter",
    popular: false,
  },
  {
    name: "Pro",
    planCode: "PRO",
    price: "$79",
    description: "For growing teams that need more power and automation.",
    features: [
      "Up to 10 users",
      "Advanced Analytics",
      "AI Sales Assistant",
      "Priority Email Support",
      "Goal Tracking",
    ],
    cta: "Choose Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    planCode: "ENTERPRISE",
    price: "Custom",
    description: "For large organizations with specific needs.",
    features: [
      "Unlimited users",
      "Dedicated Account Manager",
      "Custom Integrations",
      "24/7 Phone Support",
      "Onboarding & Training",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const reviews = [
  {
    quote:
      "SalesWay has completely transformed how we manage our sales pipeline. The transparency is a game-changer for our team's performance.",
    author: "John Doe",
    title: "Sales Director, TechCorp",
  },
  {
    quote:
      "The AI assistant provides actionable insights that have directly led to a 20% increase in our conversion rates. Highly recommended!",
    author: "Jane Smith",
    title: "CEO, Innovate Solutions",
  },
  {
    quote:
      "Finally, a tool that understands the needs of a service-based sales team. The daily reporting is simple yet incredibly powerful.",
    author: "Alex Johnson",
    title: "Founder, Growth Services",
  },
];

const smoothScrollTo = (targetY: number, duration = 1200) => {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startY + distance * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

const scrollToPricing = () => {
  const el = document.getElementById('pricing');
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  smoothScrollTo(top, 1400);
};

export default function LandingPage() {
  return (
    <div className="font-body bg-[#F3F6F8]">
      <header className="sticky top-0 z-50 border-b border-white/30 bg-[#67C6EE]/40 shadow-sm backdrop-blur-sm">
        <nav className="container mx-auto flex h-20 items-center justify-between px-6">
          <Logo className="text-white" />
          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              href="#features"
              className="text-white/80 transition-colors hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-white/80 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="#"
              className="text-white/80 transition-colors hover:text-white"
            >
              Contact
            </Link>
          </div>
          <div className="hidden items-center gap-2 md:flex md:gap-4">
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-colors hover:bg-white/20 sm:flex"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={scrollToPricing}
              className="flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#67C6EE] shadow-sm transition-transform hover:scale-105"
            >
              Create Company
            </button>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[280px] flex-col border-l-white/30 bg-[#67C6EE] p-6 text-white"
              >
                <div className="mb-8">
                  <Logo className="text-white" />
                </div>
                <nav className="flex flex-col gap-6 text-lg">
                  <Link
                    href="#features"
                    className="font-medium text-white/80 transition-colors hover:text-white"
                  >
                    Features
                  </Link>
                  <Link
                    href="#pricing"
                    className="font-medium text-white/80 transition-colors hover:text-white"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="#"
                    className="font-medium text-white/80 transition-colors hover:text-white"
                  >
                    Contact
                  </Link>
                </nav>
                <div className="mt-auto flex flex-col gap-4 pt-8">
                  <Link
                    href="/login"
                    className="flex h-12 items-center justify-center rounded-full border border-white/50 px-5 text-base font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Login
                  </Link>
                  <button
                    type="button"
                    onClick={scrollToPricing}
                    className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-base font-semibold text-[#67C6EE] shadow-sm transition-transform hover:scale-105"
                  >
                    Create Company
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main className="min-h-screen -mt-20 bg-transparent">
        <section className="relative overflow-hidden bg-[#67C6EE] text-white">
          <div className="container mx-auto max-w-[1200px] px-6 pb-6 pt-40">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold !leading-tight text-white drop-shadow-xl md:text-6xl lg:text-7xl">
                Empower Your <br />
                Sales Team, Effortlessly.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-white/90 drop-shadow-md md:text-xl">
                SalesWay is the all-in-one workspace for service-based companies
                to track activity, manage performance, and drive growth with
                unprecedented transparency.
              </p>
              <button
                type="button"
                onClick={scrollToPricing}
                className="relative z-20 mt-10 inline-block rounded-full bg-sky-500 px-10 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
              >
                Join Now
              </button>
            </div>
          </div>

          <div className="relative mx-auto -mt-20 h-[700px] max-w-7xl lg:h-[800px]">
            <Image
              src={assets.iphone1}
              alt="SalesWay App Screenshot"
              width={800}
              height={1600}
              className="absolute left-1/2 top-0 w-[400px] -translate-x-[60%] -rotate-12 rounded-2xl md:w-[450px]"
              priority
            />
            <Image
              src={assets.iphone2}
              alt="SalesWay App Screenshot"
              width={1000}
              height={2000}
              className="absolute left-1/2 top-0 z-10 w-[590px] -translate-x-[40%] rotate-12 rounded-2xl md:w-[770px]"
              priority
            />
          </div>
        </section>

        <section id="features" className="bg-white py-12 sm:py-24">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-[#6CD3FF] md:text-5xl">
                A Smarter Way to Manage Sales
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                From daily reporting to AI-powered coaching, SalesWay gives you
                the tools to build a high-performance team.
              </p>
            </div>

            <div className="mt-20 flex flex-wrap justify-center gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex size-64 flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100">
                    <Image
                      src={feature.icon}
                      alt=""
                      width={128}
                      height={128}
                      className="h-20 w-20 object-contain"
                    />
                  </div>
                  <h3 className="mt-6 text-sm font-bold text-gray-700">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-[#67C6EE] py-12 sm:py-24">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-white md:text-5xl">
                Flexible Pricing for Every Team
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
                Choose the plan that fits your needs and start empowering your
                sales team today.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 items-center gap-8 md:grid-cols-2 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border bg-card p-8 shadow-lg transition-transform ${
                    plan.popular
                      ? 'border-2 border-black scale-105'
                      : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 -translate-y-1/2 rounded-full bg-[#67C6EE] px-4 py-1 text-sm font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-sky-800">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-sky-700">{plan.description}</p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-[#67C6EE]">
                      {plan.price}
                    </span>
                    {plan.price !== 'Custom' && (
                      <span className="text-base font-medium text-sky-700">
                        /mo
                      </span>
                    )}
                  </p>
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((featureItem) => (
                      <li key={featureItem} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-[#67C6EE]" />
                        <span className="text-sky-800/90">{featureItem}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup/create-account?plan=${plan.planCode}`}
                    className={`mt-10 block w-full rounded-md px-6 py-3 text-center font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-[#67C6EE] text-white hover:bg-opacity-90'
                        : 'border border-[#67C6EE] bg-white text-[#67C6EE] hover:bg-[#67C6EE] hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="bg-white py-12 sm:py-24">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-[#67C6EE] md:text-5xl">
                What Our Customers Say
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Hear directly from the teams that use SalesWay to drive success.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <div
                  key={review.author}
                  className="flex flex-col justify-between rounded-lg border bg-card p-8 text-center shadow-sm"
                >
                  <blockquote className="italic text-foreground before:content-['“'] after:content-['”']">
                    {review.quote}
                  </blockquote>
                  <footer className="mt-6">
                    <p className="font-semibold text-[#67C6EE]">
                      {review.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {review.title}
                    </p>
                  </footer>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-[#67C6EE] py-12">
          <div className="container mx-auto px-6 text-center text-sm text-white/90">
            <p>&copy; {new Date().getFullYear()} SalesWay. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
