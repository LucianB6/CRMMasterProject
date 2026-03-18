'use client';

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Check,
  CreditCard,
  Database,
  Eye,
  FileEdit,
  LineChart,
  Megaphone,
  Menu,
  MessageSquare,
  Play,
  Sparkles,
  Target,
  UserPlus
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import logoFullFundalTransparent from "../assets/selfCRMLogo.svg";

const assets = {
  iphone1: "https://i.imgur.com/Rd4GlCH.png",
  iphone2: "https://i.imgur.com/P9gVLfv.png",
};

const features = [
  {
    icon: BarChart3,
    title: "Raportare zilnică",
    description:
      "Centralizează raportarea și vizualizează KPI-urile într-un dashboard interactiv.",
  },
  {
    icon: Eye,
    title: "Transparență totală",
    description:
      "Ai vizibilitate completă asupra activității zilnice a echipei și a tendințelor istorice.",
  },
  {
    icon: Sparkles,
    title: "Asistent AI pentru vânzări",
    description:
      "Oferă echipei coaching instant și recomandări bazate pe date reale.",
  },
  {
    icon: Target,
    title: "Managementul performanței",
    description:
      "Setează obiective, urmărește progresul și construiește un mediu clar pentru creșterea echipei.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    planCode: "STARTER",
    price: "€20",
    description: "Pentru echipe mici care vor să organizeze vânzările și marketingul într-un singur workspace.",
    features: [
      "Până la 3 conturi de tip agent create",
      "Asistent AI specific pentru zona de vânzări și marketing",
      "Recomandări AI pe baza informațiilor din interiorul unui client",
      "Goals tracking",
      "Calendar integrat pentru gestionarea muncii",
      "Task manager",
      "Creare de campanii pentru zona de advertising",
      "Tracking KPI",
    ],
    cta: "Alege Starter",
    popular: true,
  },
];

const reviews = [
  {
    quote:
      "SalesWay a schimbat complet modul în care gestionăm pipeline-ul de vânzări. Transparența a devenit un avantaj real pentru performanța echipei.",
    author: "Andrei Popescu",
    title: "Director de vânzări, TechCorp",
  },
  {
    quote:
      "Asistentul AI oferă recomandări aplicabile imediat și ne-a ajutat direct să creștem rata de conversie cu 20%.",
    author: "Ioana Marin",
    title: "CEO, Innovate Solutions",
  },
  {
    quote:
      "În sfârșit, un tool care înțelege nevoile unei echipe comerciale din servicii. Raportarea zilnică este simplă, dar extrem de puternică.",
    author: "Alex Ionescu",
    title: "Fondator, Growth Services",
  },
];

const processSteps = [
  {
    id: 1,
    title: "Accesează un abonament",
    icon: CreditCard,
    row: 0,
    col: 0,
    color: "bg-[#e0f2fe]",
    desktopPosition: "sm:col-start-1 sm:row-start-1",
  },
  {
    id: 2,
    title: "Creează cont",
    icon: UserPlus,
    row: 0,
    col: 1,
    color: "bg-[#dbeafe]",
    desktopPosition: "sm:col-start-2 sm:row-start-1",
  },
  {
    id: 3,
    title: "Gestionează formularul campaniei",
    icon: FileEdit,
    row: 1,
    col: 1,
    color: "bg-[#e0f2fe]",
    desktopPosition: "sm:col-start-2 sm:row-start-2",
  },
  {
    id: 4,
    title: "Adu clienți prin advertising",
    icon: Megaphone,
    row: 1,
    col: 0,
    color: "bg-[#f0f9ff]",
    desktopPosition: "sm:col-start-1 sm:row-start-2",
  },
  {
    id: 5,
    title: "Contactează-i",
    icon: MessageSquare,
    row: 2,
    col: 0,
    color: "bg-[#e0f2fe]",
    desktopPosition: "sm:col-start-1 sm:row-start-3",
  },
  {
    id: 6,
    title: "Introdu activitatea clienți",
    icon: Database,
    row: 2,
    col: 1,
    color: "bg-[#dbeafe]",
    desktopPosition: "sm:col-start-2 sm:row-start-3",
  },
  {
    id: 7,
    title: "Vezi performanțele companiei",
    icon: LineChart,
    row: 3,
    col: 1,
    color: "bg-[#e0f2fe]",
    desktopPosition: "sm:col-start-2 sm:row-start-4",
  },
] as const;

const processFlowOrder = [1, 2, 3, 4, 5, 6, 7];

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

const scrollToTop = () => {
  smoothScrollTo(0, 1400);
};

function ProcessSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const updatePaths = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const nextPaths: string[] = [];

      const getRelativeRect = (id: number) => {
        const el = nodeRefs.current[id];
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          centerX: rect.left - containerRect.left + rect.width / 2,
          centerY: rect.top - containerRect.top + rect.height / 2,
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
        };
      };

      for (let i = 0; i < processFlowOrder.length - 1; i += 1) {
        const from = getRelativeRect(processFlowOrder[i]);
        const to = getRelativeRect(processFlowOrder[i + 1]);

        if (!from || !to) continue;

        const sameRow = Math.abs(from.centerY - to.centerY) < 20;

        if (sameRow) {
          const isForward = from.centerX < to.centerX;
          const startX = isForward ? from.right : from.left;
          const endX = isForward ? to.left : to.right;

          nextPaths.push(`M ${startX} ${from.centerY} L ${endX} ${to.centerY}`);
          continue;
        }

        const startX = from.centerX;
        const startY = from.bottom;
        const endX = to.centerX;
        const endY = to.top;
        const midY = (startY + endY) / 2;

        nextPaths.push(
          `M ${startX} ${startY}
           L ${startX} ${midY - 15}
           Q ${startX} ${midY} ${(startX + endX) / 2} ${midY}
           Q ${endX} ${midY} ${endX} ${midY + 15}
           L ${endX} ${endY}`
        );
      }

      setPaths(nextPaths);
    };

    updatePaths();

    const observer = new ResizeObserver(updatePaths);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    Object.values(nodeRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });

    window.addEventListener("resize", updatePaths);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePaths);
    };
  }, []);

  return (
    <section className="bg-transparent py-12 sm:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-6 lg:flex-row lg:px-8">
        <div ref={containerRef} className="relative order-2 lg:order-1 lg:w-2/3">
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
            {paths.map((d, index) => (
              <path
                key={index}
                d={d}
                stroke="#bae6fd"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="transition-all duration-500"
              />
            ))}
          </svg>

          <div className="relative grid grid-cols-1 gap-x-16 gap-y-24 sm:grid-cols-2">
            {processSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  ref={(el) => {
                    nodeRefs.current[step.id] = el;
                  }}
                  className={`relative z-10 flex min-h-[160px] flex-col items-center justify-center rounded-[3rem] border-2 border-white/80 p-8 shadow-[0_10px_40px_rgba(103,198,238,0.12)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_22px_45px_rgba(56,189,248,0.16)] ${step.color} ${step.desktopPosition} ${step.col === 1 ? "sm:translate-y-5" : ""}`}
                >
                  <div className="absolute -left-2 -top-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-50 bg-white font-black text-slate-800 shadow-md">
                    {step.id}
                  </div>

                  <div className="mb-4 rounded-2xl bg-white/55 p-4 shadow-inner backdrop-blur-sm">
                    <Icon className="h-8 w-8 text-[#38bdf8]" />
                  </div>

                  <h3 className="text-center text-sm font-black uppercase leading-tight tracking-tight text-slate-800">
                    {step.title}
                  </h3>

                  {step.id === 1 ? (
                    <div className="absolute -top-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Start
                      </span>
                      <Play size={14} className="fill-[#67C6EE] text-[#67C6EE]" />
                    </div>
                  ) : null}

                  {step.id === 7 ? (
                    <div className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
                      <Check size={20} className="mb-1 text-[#38bdf8]" strokeWidth={3} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#38bdf8]">
                        Gata
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="order-1 h-fit space-y-8 lg:sticky lg:top-24 lg:order-2 lg:w-1/3">
          <div className="inline-block rounded-full bg-sky-50 px-4 py-1 text-sm font-bold uppercase tracking-wide text-[#38bdf8]">
            Flux de lucru
          </div>
          <h2 className="text-5xl font-black leading-tight text-slate-900">
            Performanță <br /> pas cu <span className="text-[#38bdf8] italic">pas.</span>
          </h2>
          <div className="h-2 w-16 rounded-full bg-[#67C6EE]" />
          <p className="text-xl font-medium leading-relaxed text-slate-500">
            Întregul proces operațional al companiei a fost digitalizat și organizat
            într-un flux clar, astfel încât să ai vizibilitate totală și control asupra
            fiecărei decizii și oportunități din business.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [activeReview, setActiveReview] = useState(0);

  const showPreviousReview = () => {
    setActiveReview((current) => (current === 0 ? reviews.length - 1 : current - 1));
  };

  const showNextReview = () => {
    setActiveReview((current) => (current === reviews.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] font-body">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/55 shadow-sm backdrop-blur-sm">
        <nav className="container mx-auto grid h-20 grid-cols-[40px_1fr_40px] items-center px-4 md:flex md:justify-between md:px-6">
          <div className="md:hidden" />

          <div className="flex items-center justify-center py-2 md:justify-start md:p-6">
            <button
              type="button"
              onClick={scrollToTop}
              className="transition-transform duration-300 hover:scale-[1.02]"
              aria-label="Mergi la începutul paginii"
            >
              <Image
                src={logoFullFundalTransparent}
                alt="SalesWay"
                className="h-20 w-auto md:h-[150px]"
                priority
              />
            </button>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              href="#features"
              className="text-slate-700 transition-colors hover:text-black"
            >
              Funcționalități
            </Link>
            <Link
              href="#pricing"
              className="text-slate-700 transition-colors hover:text-black"
            >
              Prețuri
            </Link>
            <Link
              href="#"
              className="text-slate-700 transition-colors hover:text-black"
            >
              Contact
            </Link>
          </div>
          <div className="hidden items-center gap-2 md:flex md:gap-4">
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-black/5 sm:flex"
            >
              Autentificare
            </Link>
            <button
              type="button"
              onClick={scrollToPricing}
              className="flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#67C6EE] shadow-sm transition-transform hover:scale-105"
            >
              Creează companie
            </button>
          </div>

          <div className="justify-self-end md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Deschide meniul</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[280px] flex-col border-l-slate-200 bg-white p-6 text-slate-900"
              >
                <div className="mb-8">
                  <div className="flex items-center p-2">
                    <button
                      type="button"
                      onClick={scrollToTop}
                      className="transition-transform duration-300 hover:scale-[1.02]"
                      aria-label="Mergi la începutul paginii"
                    >
                      <Image
                        src={logoFullFundalTransparent}
                        alt="SalesWay"
                        className="h-20 w-auto px-12"
                      />
                    </button>
                  </div>
                </div>
                <nav className="flex flex-col gap-6 text-lg">
                  <Link
                    href="#features"
                    className="font-medium text-slate-700 transition-colors hover:text-black"
                  >
                    Funcționalități
                  </Link>
                  <Link
                    href="#pricing"
                    className="font-medium text-slate-700 transition-colors hover:text-black"
                  >
                    Prețuri
                  </Link>
                  <Link
                    href="#"
                    className="font-medium text-slate-700 transition-colors hover:text-black"
                  >
                    Contact
                  </Link>
                </nav>
                <div className="mt-auto flex flex-col gap-4 pt-8">
                  <Link
                    href="/login"
                    className="flex h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    Autentificare
                  </Link>
                  <button
                    type="button"
                    onClick={scrollToPricing}
                    className="flex h-12 items-center justify-center rounded-full bg-white px-5 text-base font-semibold text-[#67C6EE] shadow-sm transition-transform hover:scale-105"
                  >
                    Creează companie
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main className="min-h-screen -mt-20 bg-transparent">
        <section className="bg-transparent py-12 sm:py-24">
          <div className="container mx-auto max-w-[1200px] px-6 pb-6 pt-40">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold !leading-tight text-slate-900 drop-shadow-[0_16px_38px_rgba(15,23,42,0.45)] [text-shadow:0_3px_10px_rgba(15,23,42,0.35)] md:text-6xl lg:text-7xl">
                Crește performanța <br />
                echipei tale de <span className="text-[#38bdf8] italic">vânzări</span>.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-600 md:text-xl">
                SalesWay este workspace-ul complet pentru companiile de servicii
                care vor să urmărească activitatea, să gestioneze performanța și
                să crească prin transparență reală.
              </p>
              <button
                type="button"
                onClick={scrollToPricing}
                className="relative z-20 mt-10 inline-block rounded-full bg-white px-10 py-3 text-lg font-bold text-[#67C6EE] shadow-lg transition-transform hover:scale-105"
              >
                Începe acum
              </button>
            </div>
          </div>

          <div className="relative mx-auto -mt-20 h-[700px] max-w-7xl lg:h-[800px]">
            <Image
              src={assets.iphone1}
              alt="Captură din aplicația SalesWay"
              width={800}
              height={1600}
              className="absolute left-1/2 top-0 w-[400px] -translate-x-[60%] -rotate-12 rounded-2xl md:w-[450px]"
              priority
            />
            <Image
              src={assets.iphone2}
              alt="Captură din aplicația SalesWay"
              width={1000}
              height={2000}
              className="absolute left-1/2 top-0 z-10 w-[590px] -translate-x-[40%] rotate-12 rounded-2xl md:w-[770px]"
              priority
            />
          </div>
        </section>

        <section id="features" className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="mb-6 inline-block rounded-full bg-sky-50 px-4 py-1 text-sm font-bold uppercase tracking-wide text-[#38bdf8]">
                  Funcționalități
                </div>

                <h2 className="text-5xl font-black leading-tight text-slate-900">
                  O metodă mai inteligentă <br /> de a <span className="text-[#38bdf8] italic">gestiona vânzările</span>
                </h2>

                <div className="mb-6 mt-4 h-2 w-16 rounded-full bg-[#67C6EE]" />

                <p className="text-lg leading-relaxed text-slate-600">
                  De la raportare zilnică la coaching susținut de AI, SalesWay îți oferă
                  instrumentele necesare pentru a construi o echipă performantă și pentru
                  a închide mai multe vânzări mai ușor.
                </p>
              </div>

              <div className="order-2 relative lg:order-1 lg:col-span-7">
                <div
                  className="absolute inset-0 -z-10 opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(56,189,248,0.35) 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                <div className="grid grid-cols-1 gap-6 p-4 md:p-8 sm:grid-cols-2">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;

                    return (
                      <div
                        key={feature.title}
                        className={`${index % 2 === 1 ? 'sm:translate-y-12' : ''} transition-all duration-300`}
                      >
                        <div className="group flex h-full flex-col items-center justify-center rounded-xl border border-sky-100 bg-white/95 p-8 text-center shadow-[0_8px_30px_rgba(56,189,248,0.10)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(14,165,233,0.18)]">
                          <Icon
                            className="mb-6 h-12 w-12 text-[#38bdf8] transition-transform duration-300 group-hover:scale-110"
                            strokeWidth={1.5}
                          />
                          <h3 className="mb-3 text-lg font-bold text-slate-800">
                            {feature.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-500">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProcessSection />

        <section id="pricing" className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
              <div className="order-1 lg:order-1 lg:col-span-5">
                <div className="mb-6 inline-block rounded-full bg-sky-50 px-4 py-1 text-sm font-bold uppercase tracking-wide text-[#38bdf8]">
                  Pricing
                </div>

                <h2 className="mb-6 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                  Preț simplu <br /> pentru echipe care vor <span className="text-[#38bdf8] italic">claritate</span>
                </h2>

                <div className="mb-6 h-2 w-16 rounded-full bg-[#67C6EE]" />

                <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
                  Alege planul care se potrivește acum echipei tale și începe să
                  organizezi vânzările și marketingul într-un singur loc.
                </p>
              </div>

              <div className="order-2 lg:order-2 lg:col-span-7">
                <div className="mx-auto grid max-w-xl grid-cols-1 items-center gap-8 lg:mr-0 lg:ml-auto">
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
                    <div className="absolute top-0 -translate-y-1/2 rounded-full bg-[#38bdf8] px-4 py-1 text-sm font-semibold text-white">
                      Cel mai ales
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
            </div>
          </div>
        </section>

        <section id="reviews" className="bg-transparent py-12 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
              <div className="order-2 relative lg:order-1 lg:col-span-7">
                <div
                  className="absolute inset-0 -z-10 opacity-40"
                  style={{
                    backgroundImage: "radial-gradient(rgba(56,189,248,0.25) 1.5px, transparent 1.5px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                <div className="p-4 md:p-8">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reviews.map((review, index) => (
                        <button
                          key={review.author}
                          type="button"
                          onClick={() => setActiveReview(index)}
                          className={`h-2.5 rounded-full transition-all ${
                            index === activeReview ? "w-8 bg-[#38bdf8]" : "w-2.5 bg-sky-100 hover:bg-sky-200"
                          }`}
                          aria-label={`Afișează review-ul ${index + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={showPreviousReview}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-100 bg-white/95 text-[#38bdf8] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-50"
                        aria-label="Review anterior"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={showNextReview}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-100 bg-white/95 text-[#38bdf8] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-50"
                        aria-label="Review următor"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white/95 shadow-[0_8px_30px_rgba(56,189,248,0.10)]">
                    <div
                      className="flex transition-transform duration-500 ease-out"
                      style={{ transform: `translateX(-${activeReview * 100}%)` }}
                    >
                      {reviews.map((review) => (
                        <div
                          key={review.author}
                          className="min-w-full p-8 md:p-10"
                        >
                          <div className="flex min-h-[320px] flex-col justify-between">
                            <blockquote className="text-lg italic leading-relaxed text-slate-600 before:content-['“'] after:content-['”']">
                              {review.quote}
                            </blockquote>
                            <footer className="mt-8 border-t border-sky-100 pt-5">
                              <p className="font-semibold text-slate-900">{review.author}</p>
                              <p className="text-sm text-slate-500">{review.title}</p>
                            </footer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:col-span-5">
                <div className="mb-6 inline-block rounded-full bg-sky-50 px-4 py-1 text-sm font-bold uppercase tracking-wide text-[#38bdf8]">
                  Testimoniale
                </div>

                <h2 className="mb-6 text-5xl font-black leading-tight text-slate-900">
                  Ce spun <br /> <span className="text-[#38bdf8] italic">clienții noștri</span>
                </h2>

                <div className="mb-6 h-2 w-16 rounded-full bg-[#67C6EE]" />

                <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
                  Vezi direct opiniile echipelor care folosesc SalesWay pentru a performa
                  mai bine și pentru a aduce mai multă claritate în procesele lor zilnice.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-transparent py-12">
          <div className="container mx-auto px-6 text-center text-sm text-slate-600">
            <p>&copy; {new Date().getFullYear()} selfCRM.ai. Toate drepturile rezervate.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
