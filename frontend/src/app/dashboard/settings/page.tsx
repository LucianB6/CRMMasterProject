'use client';

import type { ReactNode } from 'react';
import { Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Label } from '../../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    description: 'Interfață luminoasă, curată și ușor de citit.',
    icon: Sun,
    previewClass: 'from-white via-slate-50 to-sky-50',
    iconClass: 'text-amber-500',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Contrast mai mare pentru sesiuni lungi de lucru.',
    icon: Moon,
    previewClass: 'from-slate-950 via-slate-900 to-slate-800',
    iconClass: 'text-sky-300',
  },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-auto bg-slate-50 p-8">
      <div className="mx-auto flex w-full max-w-[1700px] min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Setări</h2>
            <p className="text-slate-500">
              Controlează preferințele interfeței și modul în care lucrezi în aplicație.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Preferință activă"
            value={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            icon={<Palette className="h-5 w-5 text-blue-600" />}
          />
          <SummaryCard
            label="Personalizare"
            value="Temă vizuală"
            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
          />
          <SummaryCard
            label="Disponibil acum"
            value="2 variante"
            icon={<Sun className="h-5 w-5 text-amber-500" />}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-800">Aspectul aplicației</h3>
            <p className="mt-1 text-sm text-slate-500">
              Alege stilul de interfață pe care vrei să îl folosești în dashboard.
            </p>
          </div>

          <div className="p-6">
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-1 gap-5 lg:grid-cols-2"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;

                return (
                  <div key={option.value}>
                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                    <Label
                      htmlFor={option.value}
                      className={`block cursor-pointer rounded-2xl border p-5 transition-all ${
                        isActive
                          ? 'border-[#38bdf8] bg-sky-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-white p-3 shadow-sm">
                              <Icon className={`h-5 w-5 ${option.iconClass}`} />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900">{option.label}</p>
                              <p className="text-sm text-slate-500">{option.description}</p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${
                            isActive
                              ? 'border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#0f5b84]'
                              : 'border-slate-200 bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isActive ? 'Activă' : 'Selectează'}
                        </div>
                      </div>

                      <div
                        className={`mt-5 h-40 rounded-2xl border border-slate-200 bg-gradient-to-br ${option.previewClass} p-4`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#38bdf8]/80" />
                            <div className="h-3 w-24 rounded-full bg-slate-300/60" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="h-20 rounded-xl border border-white/40 bg-white/70 shadow-sm" />
                            <div className="h-20 rounded-xl border border-white/40 bg-white/55 shadow-sm" />
                            <div className="h-20 rounded-xl border border-white/40 bg-white/40 shadow-sm" />
                          </div>
                          <div className="h-8 rounded-xl bg-white/70 shadow-sm" />
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
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
  icon: ReactNode;
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
