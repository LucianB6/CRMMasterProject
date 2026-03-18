'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, ListTodo, Phone, Send } from 'lucide-react';

import { ApiError } from '../../lib/api';
import {
  createManagerLeadCall,
  createManagerLeadNote,
  createManagerLeadTask,
  fetchManagerLeadActivities,
  fetchManagerLeadEvents,
  fetchManagerLeadTasks,
  type LeadActivityResponse,
  type LeadActivityType,
  type LeadEventResponse,
  type LeadNoteCategory,
  type LeadTaskResponse,
} from '../../lib/leads';
import { useToast } from '../../hooks/use-toast';
import type { TimelineActivity, TimelineActivityType } from './lead-detail-types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

type LeadTimelineProps = {
  leadId: string;
  stageName?: string | null;
  assigneeUserId?: string | null;
  onLeadChanged: () => Promise<void> | void;
};

type EventTimelineItem = {
  id: string;
  type: LeadEventResponse['type'];
  title: string;
  description: string;
  createdAt: string;
  actor: string;
  category: LeadNoteCategory | 'UNCATEGORIZED' | null;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
};

const parseApiError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Unable to complete request.';
  }

  if (!error.body) return error.message;

  try {
    const parsed = JSON.parse(error.body) as { message?: string };
    return parsed.message?.trim() || error.message;
  } catch {
    return error.body || error.message;
  }
};

const noteCategoryLabels: Record<
  LeadNoteCategory | 'UNCATEGORIZED',
  string
> = {
  TYPE_DISCOVERY: 'Discovery',
  TYPE_CONFIRMATION: 'Confirmation',
  TYPE_OBJECTION: 'Objection',
  TYPE_NEXT_STEP: 'Next Step',
  TYPE_INTERNAL: 'Internal',
  UNCATEGORIZED: 'Uncategorized',
};

const predefinedNoteSections = [
  {
    title: '1. Rezultatul Dorit',
    subtitle: 'Outcome',
    questions: [
      'Ce te-a determinat să îți aloci timp pentru această discuție chiar acum?',
      'Dacă am găsi soluția perfectă azi, cum s-ar schimba activitatea/viața ta în următoarele luni?',
      'Care este „punctul critic” pe care speri să îl rezolvăm prin această colaborare?',
    ],
  },
  {
    title: '2. Situația Curentă',
    subtitle: 'Situation',
    questions: [
      'Cum gestionezi în prezent acest domeniu/proces în cadrul activității tale?',
      'Ce resurse (timp, bani, personal) investești în prezent pentru a menține lucrurile în mișcare?',
      'În general, când iei decizii majore de investiție, pe ce criterii te bazezi cel mai mult? (Analiză, recomandări, intuiție?)',
    ],
  },
  {
    title: '3. Provocarea',
    subtitle: 'Problem & Obstacles',
    questions: [
      'Care este cel mai mare blocaj care te împiedică să ajungi la nivelul următor?',
      'Ce alte variante ai încercat pentru a rezolva asta și de ce crezi că nu au oferit rezultatele așteptate?',
      'Cât de mult te încetinește acest obstacol în atingerea obiectivelor tale globale?',
    ],
  },
  {
    title: '4. Obiectivul',
    subtitle: 'Ideal State',
    questions: [
      'Cum arată succesul pentru tine peste 6 luni? (Indicatori concreți, nu doar dorințe).',
      'Care este termenul tău ideal pentru a vedea primele semne de progres?',
      'Ce așteptări ai de la un partener/sistem pentru a simți că investiția este justificată?',
    ],
  },
  {
    title: '5. Costul Inacțiunii',
    subtitle: 'Cost of Inaction',
    questions: [
      'Dacă decidem să nu facem nicio schimbare azi, unde vei fi peste un an în raport cu acest obiectiv?',
      'Ce pierzi (oportunități, timp, liniște) în fiecare zi în care amâni rezolvarea acestei probleme?',
      'Ai mai amânat decizii similare în trecut? Ce impact a avut acea amânare asupra ta?',
    ],
  },
  {
    title: '6. Nivelul de Interes și Urgență',
    subtitle: 'Authority & Readiness',
    questions: [
      'Pe o scară de la 1 la 10, cât de prioritară este rezolvarea acestei probleme pentru tine azi?',
      'Există și alte persoane implicate în procesul de decizie sau ești singurul care validează această direcție?',
      'Ai stabilit un buget sau o fereastră de timp concretă în care dorești să începi implementarea?',
    ],
  },
  {
    title: '7. Observații și Context',
    subtitle: `The "Human" Factor`,
    questions: [
      'Tonul prospectului: (Entuziasmat / Sceptic / Analitic / Urgentat)',
      'Factorul decizional dominant: (Siguranță / Profit / Timp liber / Statut)',
      'Note suplimentare: (Obiecții menționate discret, bariere de limbaj, context de viață relevant).',
    ],
  },
] as const;

const answerPrompt = 'Scrie răspunsul aici...';

const buildPredefinedNoteTemplate = () =>
  predefinedNoteSections
    .map((section) =>
      [
        `${section.title} (${section.subtitle})`,
        ...section.questions.flatMap((question) => [question, `Răspuns: ${answerPrompt}`, '']),
      ].join('\n')
    )
    .join('\n');

const iconByActivityType: Record<TimelineActivityType, ReactNode> = {
  status_change: <CheckCircle2 size={14} className="text-[#38bdf8]" />,
  email: <Send size={14} className="text-[#38bdf8]" />,
  note: <FileText size={14} className="text-[#38bdf8]" />,
  call: <Phone size={14} className="text-[#38bdf8]" />,
  task: <ListTodo size={14} className="text-[#38bdf8]" />,
};

const iconByEventType: Record<EventTimelineItem['type'], ReactNode> = {
  LEAD_CREATED: <CheckCircle2 size={14} className="text-[#38bdf8]" />,
  STATUS_CHANGED: <CheckCircle2 size={14} className="text-[#38bdf8]" />,
  NOTE_ADDED: <FileText size={14} className="text-[#38bdf8]" />,
  CALL_LOGGED: <Phone size={14} className="text-[#38bdf8]" />,
  TASK_CREATED: <ListTodo size={14} className="text-[#38bdf8]" />,
  TASK_COMPLETED: <ListTodo size={14} className="text-[#38bdf8]" />,
  ASSIGNEE_CHANGED: <CheckCircle2 size={14} className="text-[#38bdf8]" />,
  EMAIL_SENT: <Send size={14} className="text-[#38bdf8]" />,
};

const toRelativeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} days ago`;
};

const normalizeActivityType = (value: LeadActivityResponse['type']): TimelineActivityType => {
  if (
    value === 'note' ||
    value === 'call' ||
    value === 'task' ||
    value === 'email' ||
    value === 'status_change'
  ) {
    return value;
  }
  return 'note';
};

const mapActivity = (activity: LeadActivityResponse): TimelineActivity => ({
  id: activity.id,
  type: normalizeActivityType(activity.type as LeadActivityType),
  title: activity.title || 'Activitate',
  description: activity.description || '',
  createdAt: activity.createdAt,
  actor: activity.actorName?.trim() || 'System',
});

const inferDefaultNoteCategory = (stageName?: string | null): LeadNoteCategory | undefined => {
  if (!stageName) return undefined;
  const normalized = stageName.toLowerCase();
  if (
    normalized.includes('discover') ||
    normalized.includes('qualif') ||
    normalized.includes('intro')
  ) {
    return 'TYPE_DISCOVERY';
  }
  if (normalized.includes('follow') || normalized.includes('objection')) {
    return 'TYPE_OBJECTION';
  }
  if (normalized.includes('next')) {
    return 'TYPE_NEXT_STEP';
  }
  return undefined;
};

const titleByEventType: Record<EventTimelineItem['type'], string> = {
  LEAD_CREATED: 'Lead creat',
  STATUS_CHANGED: 'Status schimbat',
  NOTE_ADDED: 'Notă adăugată',
  CALL_LOGGED: 'Apel logat',
  TASK_CREATED: 'Task creat',
  TASK_COMPLETED: 'Task finalizat',
  ASSIGNEE_CHANGED: 'Assignee actualizat',
  EMAIL_SENT: 'Email trimis',
};

const mapEvent = (event: LeadEventResponse): EventTimelineItem => {
  const payload = event.payload ?? {};
  const noteCategory =
    typeof payload.category === 'string'
      ? ((payload.category as LeadNoteCategory) || 'TYPE_INTERNAL')
      : event.type === 'NOTE_ADDED'
        ? 'TYPE_INTERNAL'
        : null;
  const description =
    typeof payload.text === 'string'
      ? payload.text
      : typeof payload.description === 'string'
        ? payload.description
        : typeof payload.title === 'string'
          ? payload.title
          : event.summary || '';

  return {
    id: event.eventId,
    type: event.type,
    title: titleByEventType[event.type] || event.summary || 'Eveniment',
    description,
    createdAt: event.createdAt,
    actor: event.actorUserId ? 'Manager' : 'System',
    category: noteCategory,
  };
};

export function LeadTimeline({
  leadId,
  stageName,
  assigneeUserId,
  onLeadChanged,
}: LeadTimelineProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventTimelineItem[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTaskResponse[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [callSummary, setCallSummary] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<
    LeadNoteCategory | undefined
  >(inferDefaultNoteCategory(stageName));
  const [activeSection, setActiveSection] = useState<'timeline' | 'activities' | 'tasks'>(
    'timeline'
  );
  const [timelineView, setTimelineView] = useState<'chronological' | 'grouped'>(
    'chronological'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  useEffect(() => {
    const inferredCategory = inferDefaultNoteCategory(stageName);
    setSelectedNoteCategory((current) => current ?? inferredCategory);
  }, [stageName]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const [eventsResponse, activitiesResponse, tasksResponse] = await Promise.all([
        fetchManagerLeadEvents(leadId, token, { page: 0, size: 100 }),
        fetchManagerLeadActivities(leadId, token, 0, 100),
        fetchManagerLeadTasks(leadId, token),
      ]);
      setEvents(eventsResponse.content.map(mapEvent));
      setActivities(activitiesResponse.content.map(mapActivity));
      setTasks(tasksResponse);
    } catch (error) {
      toast({
        title: 'Nu am putut incarca istoricul lead-ului',
        description: parseApiError(error),
        variant: 'destructive',
      });
      setEvents([]);
      setActivities([]);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadData(), Promise.resolve(onLeadChanged())]);
  }, [loadData, onLeadChanged]);

  const orderedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [events]
  );

  const orderedActivities = useMemo(
    () =>
      [...activities].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [activities]
  );

  const groupedNotes = useMemo(() => {
    const groups = new Map<LeadNoteCategory | 'UNCATEGORIZED', EventTimelineItem[]>();
    orderedEvents
      .filter((event) => event.type === 'NOTE_ADDED')
      .forEach((event) => {
        const key = event.category ?? 'UNCATEGORIZED';
        const current = groups.get(key) ?? [];
        current.push(event);
        groups.set(key, current);
      });
    return groups;
  }, [orderedEvents]);

  const predefinedNoteTemplate = useMemo(() => buildPredefinedNoteTemplate(), []);

  useEffect(() => {
    setNoteInput((current) => (current.trim() ? current : predefinedNoteTemplate));
  }, [predefinedNoteTemplate]);

  const handleSaveNote = async () => {
    const trimmedNote = noteInput.trim();
    if (!trimmedNote || isSavingNote) return;

    try {
      setIsSavingNote(true);
      const payload = selectedNoteCategory
        ? { text: trimmedNote, category: selectedNoteCategory }
        : { text: trimmedNote };
      await createManagerLeadNote(leadId, payload, getAuthToken());
      setNoteInput('');
      if (selectedNoteCategory) {
        window.localStorage.setItem('lead-note-category', selectedNoteCategory);
      }
      await reloadAll();
      toast({ title: 'Nota a fost salvata' });
    } catch (error) {
      toast({
        title: 'Nu am putut salva nota',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveCall = async () => {
    const trimmedSummary = callSummary.trim();
    if (!trimmedSummary || isSavingCall) return;

    try {
      setIsSavingCall(true);
      await createManagerLeadCall(
        leadId,
        {
          title: trimmedSummary.slice(0, 80) || 'Apel lead',
          description: trimmedSummary,
          callTime: new Date().toISOString(),
        },
        getAuthToken()
      );
      setCallSummary('');
      await reloadAll();
      toast({ title: 'Apelul a fost salvat' });
    } catch (error) {
      toast({
        title: 'Nu am putut salva apelul',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSavingCall(false);
    }
  };

  const handleSaveTask = async () => {
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle || isSavingTask) return;

    try {
      setIsSavingTask(true);
      await createManagerLeadTask(
        leadId,
        {
          title: trimmedTitle,
          assigneeUserId: assigneeUserId || undefined,
        },
        getAuthToken()
      );
      setTaskTitle('');
      await reloadAll();
      setActiveSection('tasks');
      toast({ title: 'Task-ul a fost creat' });
    } catch (error) {
      toast({
        title: 'Nu am putut crea task-ul',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSavingTask(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedCategory = window.localStorage.getItem('lead-note-category');
    if (
      persistedCategory === 'TYPE_DISCOVERY' ||
      persistedCategory === 'TYPE_CONFIRMATION' ||
      persistedCategory === 'TYPE_OBJECTION' ||
      persistedCategory === 'TYPE_NEXT_STEP' ||
      persistedCategory === 'TYPE_INTERNAL'
    ) {
      setSelectedNoteCategory((current) => current ?? persistedCategory);
    }
  }, []);

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-transparent">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200/80 bg-[#f8fafc]/95 px-4 pb-3 pt-4 backdrop-blur-sm sm:px-6 sm:pt-5 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-2 lg:pt-6">
        <div className="flex gap-3 overflow-x-auto pb-1 sm:gap-6 sm:pb-0">
          {[
            ['timeline', 'Timeline'],
            ['activities', 'Activities'],
            ['tasks', 'Tasks'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key as 'timeline' | 'activities' | 'tasks')}
              className={`shrink-0 border-b-2 pb-2 text-sm font-semibold transition-all sm:pb-3 ${
                activeSection === key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {activeSection === 'timeline' ? (
          <div className="flex w-full self-start rounded-xl bg-slate-100 p-1 sm:w-auto lg:self-center">
            {[
              ['chronological', 'Chronological'],
              ['grouped', 'Grouped'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setTimelineView(key as 'chronological' | 'grouped')
                }
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold sm:flex-none sm:py-1 ${
                  timelineView === key ? 'bg-white text-[#38bdf8] shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col px-6 py-8 lg:px-8">
        <div className="mb-10 overflow-hidden border-b border-slate-200/80 pb-8">
          <Tabs defaultValue="note">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-200/80 bg-transparent p-0">
              <TabsTrigger value="note" className="rounded-none border-b-2 border-[#38bdf8] px-4 py-2 text-xs font-bold text-[#38bdf8] data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-400">
                Notă
              </TabsTrigger>
              <TabsTrigger value="call" className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-bold data-[state=active]:border-[#38bdf8] data-[state=active]:text-[#38bdf8] data-[state=inactive]:text-slate-400">
                Apel
              </TabsTrigger>
              <TabsTrigger value="task" className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-bold data-[state=active]:border-[#38bdf8] data-[state=active]:text-[#38bdf8] data-[state=inactive]:text-slate-400">
                Task
              </TabsTrigger>
            </TabsList>

            <TabsContent value="note" className="mt-0 space-y-0">
              <div className="space-y-0">
                <Textarea
                  className="min-h-[90px] resize-y overflow-auto border-0 p-4 text-sm focus-visible:ring-0"
                  placeholder="Adaugă o notă..."
                  value={noteInput}
                  onChange={(event) => setNoteInput(event.target.value)}
                />
                <div className="border-t border-slate-200/80 bg-white p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Categorie</span>
                      <Select
                        value={selectedNoteCategory ?? 'none'}
                        onValueChange={(value) =>
                          setSelectedNoteCategory(value === 'none' ? undefined : (value as LeadNoteCategory))
                        }
                      >
                        <SelectTrigger className="h-8 w-[170px] border-slate-200 bg-white text-xs">
                          <SelectValue placeholder="Alege categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Fără categorie</SelectItem>
                          {(
                            [
                              'TYPE_DISCOVERY',
                              'TYPE_CONFIRMATION',
                              'TYPE_OBJECTION',
                              'TYPE_NEXT_STEP',
                              'TYPE_INTERNAL',
                            ] as LeadNoteCategory[]
                          ).map((category) => (
                            <SelectItem key={category} value={category}>
                              {noteCategoryLabels[category]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      className="bg-[#38bdf8] text-xs font-bold text-white hover:bg-sky-500"
                      onClick={() => void handleSaveNote()}
                      disabled={!noteInput.trim() || isSavingNote}
                    >
                      {isSavingNote ? 'Se salvează...' : 'Salvează'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="call" className="mt-0 space-y-0">
              <Textarea
                className="min-h-[90px] resize-none border-0 p-4 text-sm focus-visible:ring-0"
                placeholder="Rezumat apel..."
                value={callSummary}
                onChange={(event) => setCallSummary(event.target.value)}
              />
              <div className="flex justify-end border-t border-slate-200/80 bg-white p-2">
                <Button
                  type="button"
                  className="bg-[#38bdf8] text-xs font-bold text-white hover:bg-sky-500"
                  onClick={() => void handleSaveCall()}
                  disabled={!callSummary.trim() || isSavingCall}
                >
                  {isSavingCall ? 'Se salvează...' : 'Log Call'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="task" className="mt-0 space-y-0">
              <Input
                className="h-[90px] border-0 p-4 text-sm focus-visible:ring-0"
                placeholder="Titlu task..."
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
              <div className="flex justify-end border-t border-slate-200/80 bg-white p-2">
                <Button
                  type="button"
                  className="bg-[#38bdf8] text-xs font-bold text-white hover:bg-sky-500"
                  onClick={() => void handleSaveTask()}
                  disabled={!taskTitle.trim() || isSavingTask}
                >
                  {isSavingTask ? 'Se salvează...' : 'Create Task'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : null}

        {!isLoading && activeSection === 'timeline' ? (
          timelineView === 'grouped' && groupedNotes.size > 0 ? (
            <div className="space-y-6">
              {Array.from(groupedNotes.entries()).map(([category, items]) => (
                <section key={category} className="border-b border-slate-200/80 pb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      {noteCategoryLabels[category]}
                    </h3>
                    <span className="text-xs text-slate-500">{items.length} note</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <TimelineCard
                        key={item.id}
                        icon={iconByEventType[item.type]}
                        title={item.title}
                        description={item.description}
                        createdAt={item.createdAt}
                        actor={item.actor}
                        badge={item.category ? noteCategoryLabels[item.category] : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="relative ml-4 min-h-[420px] flex-1 space-y-10 border-l border-slate-200 pl-8">
              {orderedEvents.length === 0 ? (
                <EmptyState text="Nu există încă evenimente pentru acest lead." />
              ) : (
                orderedEvents.map((item) => (
                  <TimelineLineItem
                    key={item.id}
                    icon={iconByEventType[item.type]}
                    title={item.title}
                    description={item.description}
                    createdAt={item.createdAt}
                    actor={item.actor}
                    badge={item.category ? noteCategoryLabels[item.category] : undefined}
                  />
                ))
              )}
            </div>
          )
        ) : null}

        {!isLoading && activeSection === 'activities' ? (
          <div className="flex min-h-[420px] flex-col space-y-3">
            {orderedActivities.length === 0 ? (
              <EmptyState text="Nu există încă activități operaționale pentru acest lead." />
            ) : (
              orderedActivities.map((item) => (
                <TimelineCard
                  key={item.id}
                  icon={iconByActivityType[item.type]}
                  title={item.title}
                  description={item.description}
                  createdAt={item.createdAt}
                  actor={item.actor}
                />
              ))
            )}
          </div>
        ) : null}

        {!isLoading && activeSection === 'tasks' ? (
          <div className="flex min-h-[420px] flex-col space-y-3">
            {tasks.length === 0 ? (
              <EmptyState text="Nu există task-uri asociate acestui lead." />
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="border-b border-slate-200/80 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {task.description || task.goal || 'Fără descriere'}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#38bdf8]/25 bg-[#38bdf8]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#38bdf8]">
                      {task.status || 'open'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      Due {task.dueDate || task.deadline || '-'}
                    </span>
                    <span>Assignee {task.assigneeUserId || '-'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TimelineLineItem({
  icon,
  title,
  description,
  createdAt,
  actor,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
  badge?: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200/70 px-4 py-3">
      <div className="absolute -left-[45px] top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#38bdf8]/35 bg-white">
        {icon}
      </div>
      <div className="mb-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          {badge ? (
            <span className="rounded-full border border-[#38bdf8]/25 bg-[#38bdf8]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#38bdf8]">
              {badge}
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          {toRelativeLabel(createdAt)}
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#38bdf8]/20 text-[8px] font-bold text-[#38bdf8]">
          {actor[0] ?? 'U'}
        </div>
        <span className="text-xs text-slate-500">{actor}</span>
      </div>
      {description ? (
        <div className="rounded-xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-3 text-sm text-slate-600">
          {description}
        </div>
      ) : null}
    </div>
  );
}

function TimelineCard({
  icon,
  title,
  description,
  createdAt,
  actor,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#38bdf8]/25 bg-[#38bdf8]/10">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500">{actor}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span className="rounded-full border border-[#38bdf8]/25 bg-[#38bdf8]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#38bdf8]">
              {badge}
            </span>
          ) : null}
          <span className="text-[10px] font-medium text-slate-400">
            {toRelativeLabel(createdAt)}
          </span>
        </div>
      </div>
      {description ? <p className="text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-3xl border border-dashed border-[#38bdf8]/35 bg-gradient-to-b from-[#38bdf8]/10 to-white px-8 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#38bdf8]/25 bg-white shadow-sm">
          <Clock3 size={20} className="text-[#38bdf8]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Nimic de afișat încă</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
      </div>
    </div>
  );
}
