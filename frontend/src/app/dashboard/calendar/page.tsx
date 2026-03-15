'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { enUS, ro } from 'date-fns/locale';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { useToast } from '../../../hooks/use-toast';
import { apiFetch } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const eventSchema = z
  .object({
    title: z.string().min(1, 'Motivul este obligatoriu.'),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data este obligatorie.' }),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/, {
        message: 'Invalid time format (HH:mm).',
      }),
    endTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/, {
        message: 'Invalid time format (HH:mm).',
      }),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

type Event = {
  id: string;
  date: Date;
  title: string;
  startTime: string;
  endTime: string;
};

type ApiCalendarEvent = {
  id: string;
  event_date: string;
  title: string;
  start_time: string;
  end_time: string;
};

type EventLayout = {
  event: Event;
  column: number;
  columns: number;
};

const normalizeTimeForInput = (value: string) => {
  if (!value) {
    return '';
  }
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const parseTimeToMinutes = (value: string) => {
  if (!value) {
    return 0;
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTimeString = (minutes: number) => {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}`;
};

const computeEventLayout = (dayEvents: Event[]): EventLayout[] => {
  if (!dayEvents.length) {
    return [];
  }

  const sorted = [...dayEvents].sort((a, b) => {
    const startDiff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    if (startDiff !== 0) {
      return startDiff;
    }
    return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime);
  });

  const active: Array<{
    event: Event;
    end: number;
    column: number;
    maxColumns: number;
  }> = [];
  const layoutMap = new Map<
    string,
    { event: Event; column: number; columns: number }
  >();

  for (const event of sorted) {
    const start = parseTimeToMinutes(event.startTime);
    const end = parseTimeToMinutes(event.endTime);

    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= start) {
        const finished = active[i];
        const existing = layoutMap.get(finished.event.id);
        if (existing) {
          existing.columns = Math.max(existing.columns, finished.maxColumns);
        }
        active.splice(i, 1);
      }
    }

    const usedColumns = new Set(active.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column += 1;
    }

    const entry = { event, end, column, maxColumns: 1 };
    active.push(entry);

    const currentColumns = active.length;
    for (const item of active) {
      item.maxColumns = Math.max(item.maxColumns, currentColumns);
    }

    layoutMap.set(event.id, { event, column, columns: currentColumns });
  }

  for (const item of active) {
    const existing = layoutMap.get(item.event.id);
    if (existing) {
      existing.columns = Math.max(existing.columns, item.maxColumns);
    }
  }

  return sorted.map((event) => {
    const layout = layoutMap.get(event.id);
    return layout ?? { event, column: 0, columns: 1 };
  });
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    title: string;
  } | null>(null);

  const [hourHeight, setHourHeight] = useState(64);
  const weekGridRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    event: Event;
    date: Date;
    columnTop: number;
    gridLeft: number;
    columnWidth: number;
    offsetY: number;
    durationMinutes: number;
    startClientY: number;
    previewStart: string;
    previewEnd: string;
    previewDate: Date;
    hasMoved: boolean;
  } | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setHourHeight(isMobile ? 40 : 52);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      eventDate: '',
      startTime: '',
      endTime: '',
    },
  });

  const calendarTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ro });
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    const startYear = format(start, 'yyyy');
    const endYear = format(end, 'yyyy');

    if (startYear !== endYear) {
      return `${format(start, 'd MMMM yyyy', { locale: ro })} - ${format(
        end,
        'd MMMM yyyy',
        { locale: ro }
      )}`;
    }

    const startMonth = format(start, 'MMMM', { locale: ro });
    const endMonth = format(end, 'MMMM', { locale: ro });

    if (startMonth !== endMonth) {
      return `${format(start, 'd MMMM', { locale: ro })} - ${format(
        end,
        'd MMMM yyyy',
        { locale: ro }
      )}`;
    }

    return `${format(start, 'd')} - ${format(end, 'd MMMM yyyy', {
      locale: ro,
    })}`;
  }, [currentDate, view]);

  const days = useMemo(() => {
    if (view === 'month') {
      const firstDayOfMonth = startOfMonth(currentDate);
      const lastDayOfMonth = endOfMonth(currentDate);
      const firstDayOfCalendar = startOfWeek(firstDayOfMonth, {
        weekStartsOn: 1,
      });
      const lastDayOfCalendar = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });
      return eachDayOfInterval({
        start: firstDayOfCalendar,
        end: lastDayOfCalendar,
      });
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, view]);

  const weekDays = [
    'Luni',
    'Tue',
    'Miercuri',
    'Joi',
    'Vineri',
    'Sat',
    'Sun',
  ];

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDayClick = (day: Date) => {
    setEditingEventId(null);
    setSelectedDate(day);
    setIsDialogOpen(true);
    form.reset({
      title: '',
      eventDate: formatIsoDate(day),
      startTime: '',
      endTime: '',
    });
  };

  const handleEventClick = (
    eventItem: Event,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    if (suppressClickRef.current === eventItem.id) {
      suppressClickRef.current = null;
      return;
    }
    setEditingEventId(eventItem.id);
    setSelectedDate(eventItem.date);
    setIsDialogOpen(true);
    form.reset({
      title: eventItem.title,
      eventDate: formatIsoDate(eventItem.date),
      startTime: normalizeTimeForInput(eventItem.startTime),
      endTime: normalizeTimeForInput(eventItem.endTime),
    });
  };

  const normalizeEvent = useCallback((event: ApiCalendarEvent): Event => {
    return {
      id: event.id,
      date: parseISO(event.event_date),
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
    };
  }, []);

  const formatIsoDate = useCallback((date: Date) => {
    return format(date, 'yyyy-MM-dd');
  }, []);

  const fetchEvents = useCallback(
    async (from: Date, to: Date) => {
      try {
        setIsLoadingEvents(true);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const data = await apiFetch<ApiCalendarEvent[]>(
          `/calendar/events?from=${formatIsoDate(from)}&to=${formatIsoDate(to)}`,
          { headers }
        );
        setEvents(data.map(normalizeEvent));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Unable to load events',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [formatIsoDate, getAuthToken, normalizeEvent, toast]
  );

  const upsertEvent = useCallback((event: Event) => {
    setEvents((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.id === event.id
      );
      if (existingIndex === -1) {
        return [...previous, event].sort((a, b) => {
          if (a.date.getTime() === b.date.getTime()) {
            return a.startTime.localeCompare(b.startTime);
          }
          return a.date.getTime() - b.date.getTime();
        });
      }
      const next = [...previous];
      next[existingIndex] = event;
      return next;
    });
  }, []);

  async function onSubmit(values: z.infer<typeof eventSchema>) {
    if (!values.eventDate) {
      return;
    }

    try {
      const token = getAuthToken();
      const isEditing = Boolean(editingEventId);
      const targetDate = parseISO(values.eventDate);
      const createdEvent = normalizeEvent(await apiFetch<ApiCalendarEvent>(
        isEditing
          ? `/calendar/events/${editingEventId}`
          : '/calendar/events',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        body: JSON.stringify({
          ...(isEditing ? { id: editingEventId } : {}),
          title: values.title,
          event_date: values.eventDate,
          start_time: normalizeTimeForInput(values.startTime),
          end_time: normalizeTimeForInput(values.endTime),
        }),
        }
      ));
      upsertEvent(createdEvent);
      toast({
        title: isEditing ? 'Event updated' : 'Event added',
        description: `Evenimentul "${values.title}" a fost ${
          isEditing ? 'actualizat' : 'added'
        } pe ${format(
          targetDate,
          'dd MMMM yyyy',
          { locale: enUS }
        )} between ${values.startTime} - ${values.endTime}.`,
      });
      setIsDialogOpen(false);
      setEditingEventId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to save event',
        description: message,
        variant: 'destructive',
      });
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const timeToPosition = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * hourHeight + (m / 60) * hourHeight;
  };

  const startDrag = (
    eventItem: Event,
    day: Date,
    clientY: number,
    target: HTMLElement
  ) => {
    const grid = weekGridRef.current;
    if (!grid) {
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const columnWidth = gridRect.width / 7;
    const startMinutes = parseTimeToMinutes(eventItem.startTime);
    const endMinutes = parseTimeToMinutes(eventItem.endTime);
    const durationMinutes = Math.max(15, endMinutes - startMinutes);
    const offsetY =
      clientY - (gridRect.top + timeToPosition(eventItem.startTime));

    dragStateRef.current = {
      event: eventItem,
      date: day,
      columnTop: gridRect.top,
      gridLeft: gridRect.left,
      columnWidth,
      offsetY,
      durationMinutes,
      startClientY: clientY,
      previewStart: minutesToTimeString(startMinutes),
      previewEnd: minutesToTimeString(startMinutes + durationMinutes),
      previewDate: day,
      hasMoved: false,
    };
    setIsDragging(true);
    setDragPreview({
      id: eventItem.id,
      date: day,
      startTime: minutesToTimeString(startMinutes),
      endTime: minutesToTimeString(startMinutes + durationMinutes),
      title: eventItem.title,
    });
  };

  const handleDragMove = useCallback(
    (clientY: number, clientX: number) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const rawMinutes =
        ((clientY - dragState.columnTop - dragState.offsetY) / hourHeight) * 60;
      const snappedMinutes = Math.round(rawMinutes / 15) * 15;
      const clampedMinutes = Math.max(
        0,
        Math.min(24 * 60 - dragState.durationMinutes, snappedMinutes)
      );
      const columnIndex = Math.min(
        6,
        Math.max(
          0,
          Math.floor((clientX - dragState.gridLeft) / dragState.columnWidth)
        )
      );
      const nextDate = days[columnIndex] ?? dragState.previewDate;
      const startTime = minutesToTimeString(clampedMinutes);
      const endTime = minutesToTimeString(
        clampedMinutes + dragState.durationMinutes
      );
      const moved = Math.abs(clientY - dragState.startClientY) > 3;

      if (
        startTime !== dragState.previewStart ||
        endTime !== dragState.previewEnd ||
        nextDate.getTime() !== dragState.previewDate.getTime()
      ) {
        dragStateRef.current = {
          ...dragState,
          previewStart: startTime,
          previewEnd: endTime,
          previewDate: nextDate,
          hasMoved: dragState.hasMoved || moved,
        };
        setDragPreview({
          id: dragState.event.id,
          date: nextDate,
          startTime,
          endTime,
          title: dragState.event.title,
        });
      } else if (moved && !dragState.hasMoved) {
        dragStateRef.current = {
          ...dragState,
          hasMoved: true,
        };
      }
    },
    [days, hourHeight]
  );

  const finalizeDrag = useCallback(async () => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (!dragState.hasMoved) {
      setDragPreview(null);
      return;
    }

    const updatedEvent: Event = {
      ...dragState.event,
      date: dragState.previewDate,
      startTime: dragState.previewStart,
      endTime: dragState.previewEnd,
    };

    setDragPreview(null);
    suppressClickRef.current = updatedEvent.id;
    setTimeout(() => {
      if (suppressClickRef.current === updatedEvent.id) {
        suppressClickRef.current = null;
      }
    }, 0);

    const previousEvent = dragState.event;
    upsertEvent(updatedEvent);

    try {
      const token = getAuthToken();
      const savedEvent = normalizeEvent(await apiFetch<ApiCalendarEvent>(
        `/calendar/events/${updatedEvent.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: updatedEvent.id,
            title: updatedEvent.title,
            event_date: formatIsoDate(updatedEvent.date),
            start_time: normalizeTimeForInput(updatedEvent.startTime),
            end_time: normalizeTimeForInput(updatedEvent.endTime),
          }),
        }
      ));
      upsertEvent(savedEvent);
      toast({
        title: 'Event updated',
        description: `Evenimentul "${savedEvent.title}" a fost mutat la ${savedEvent.startTime} - ${savedEvent.endTime}.`,
      });
    } catch (error) {
      upsertEvent(previousEvent);
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to update event',
        description: message,
        variant: 'destructive',
      });
    }
  }, [formatIsoDate, getAuthToken, normalizeEvent, toast, upsertEvent]);

  const getEventsForDay = (day: Date) =>
    events
      .filter((event) => isSameDay(event.date, day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  useEffect(() => {
    if (!days.length) {
      return;
    }
    void fetchEvents(days[0], days[days.length - 1]);
  }, [days, fetchEvents]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      handleDragMove(event.clientY, event.clientX);
    };
    const handleMouseUp = () => {
      void finalizeDrag();
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) {
        event.preventDefault();
        handleDragMove(event.touches[0].clientY, event.touches[0].clientX);
      }
    };
    const handleTouchEnd = () => {
      void finalizeDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [finalizeDrag, handleDragMove, isDragging]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Calendar</h1>
          <p className="mt-1 font-medium text-slate-500">
            Organizeaza-ti programul si gestioneaza evenimentele intr-un calendar aliniat cu design-ul curent.
          </p>
        </div>
        <Button
          onClick={() => handleDayClick(new Date())}
          className="bg-[#38bdf8] text-white hover:bg-sky-500"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      <Card className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-black capitalize text-slate-800">
            {calendarTitle}
          </CardTitle>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as 'month' | 'week')}
              className="flex-grow sm:flex-grow-0"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="month" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]">
                  Luna
                </TabsTrigger>
                <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]">
                  Saptamana
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={handlePrev} className="border-slate-200 bg-white">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Perioada anterioara</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="border-slate-200 bg-white">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Perioada urmatoare</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className={cn('px-0 pb-0 pt-0', view === 'week' && 'p-0')}>
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px border-l border-t border-slate-200 bg-slate-200">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-white p-2 text-center text-xs font-bold capitalize text-slate-500 sm:p-3 sm:text-sm"
                >
                  <span className="hidden sm:inline">{day.substring(0, 3)}</span>
                  <span className="sm:hidden">{day.substring(0, 1)}</span>
                </div>
              ))}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      'relative min-h-[88px] cursor-pointer bg-white p-2 transition-colors hover:bg-slate-50 sm:min-h-[104px] sm:p-2.5',
                      !isSameMonth(day, currentDate) &&
                        'bg-slate-50/70 text-slate-400'
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <time
                      dateTime={format(day, 'yyyy-MM-dd')}
                      className={cn(
                        'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold sm:right-3 sm:top-3',
                        isToday(day) ? 'bg-[#38bdf8] text-white' : 'text-slate-700'
                      )}
                    >
                      {format(day, 'd')}
                    </time>
                    <div className="mt-7 space-y-1 sm:mt-7">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="overflow-hidden rounded-xl bg-sky-100 p-1.5 px-2 text-xs text-sky-900 sm:px-2.5"
                          onClick={(e) => handleEventClick(event, e)}
                        >
                          <div className="font-semibold">{`${event.startTime}`}</div>
                          <div className="truncate">{event.title}</div>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <button
                          type="button"
                          className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setView('week');
                            setCurrentDate(day);
                          }}
                        >
                          {`Inca ${dayEvents.length - 2} evenimente`}
                        </button>
                      )}
                      {isLoadingEvents && dayEvents.length === 0 && (
                        <div className="text-[10px] text-slate-400">
                          Se incarca...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="max-h-[68vh] overflow-auto">
              <div className="flex min-w-[860px]">
              <div className="flex w-14 flex-col">
                <div className="h-[65px] border-r border-slate-200 bg-slate-50 sm:h-[69px]">&nbsp;</div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="shrink-0 border-r border-slate-200 pt-1 text-center"
                    style={{ height: `${hourHeight}px` }}
                  >
                    <span className="text-xs text-slate-400">
                      {hour}:00
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-x-hidden">
                <div className="sticky top-0 z-20 grid grid-cols-7 bg-white">
                  {days.map((day) => (
                    <div
                      key={day.toString()}
                      className="border-b border-l border-slate-200 p-2 text-center sm:p-3"
                    >
                      <p className="hidden text-sm capitalize text-slate-500 sm:block">
                        {format(day, 'E', { locale: ro })}
                      </p>
                      <p className="text-sm capitalize text-slate-500 sm:hidden">
                        {format(day, 'EEEEE', { locale: ro })}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-semibold text-slate-800 sm:text-xl',
                          isToday(day) && 'text-[#38bdf8]'
                        )}
                      >
                        {format(day, 'd')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7" ref={weekGridRef}>
                  {days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn(
                        'relative h-full w-full border-l border-slate-200',
                        isToday(day) && 'bg-sky-50/40'
                      )}
                      onClick={() => handleDayClick(day)}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="border-b border-slate-200"
                          style={{ height: `${hourHeight}px` }}
                        />
                      ))}

                      {(() => {
                        const baseEvents = getEventsForDay(day).filter(
                          (event) =>
                            !dragPreview || dragPreview.id !== event.id
                        );
                        if (dragPreview && isSameDay(dragPreview.date, day)) {
                          const previewEvent: Event = {
                            id: dragPreview.id,
                            date: dragPreview.date,
                            title: dragPreview.title,
                            startTime: dragPreview.startTime,
                            endTime: dragPreview.endTime,
                          };
                          return computeEventLayout([...baseEvents, previewEvent]);
                        }
                        return computeEventLayout(baseEvents);
                      })().map((layout) => {
                        const event = layout.event;
                        const preview =
                          dragPreview && dragPreview.id === event.id
                            ? dragPreview
                            : null;
                        const startTime = preview?.startTime ?? event.startTime;
                        const endTime = preview?.endTime ?? event.endTime;
                        const top = timeToPosition(startTime);
                        const height =
                          timeToPosition(endTime) - timeToPosition(startTime);
                        const widthPercent = 100 / layout.columns;
                        const leftOffset = layout.column * widthPercent;

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'absolute z-10 cursor-grab overflow-hidden rounded-xl border border-sky-200 bg-[#38bdf8] p-1 text-xs text-white shadow-lg shadow-sky-200/50 backdrop-blur-sm active:cursor-grabbing sm:p-2',
                              preview && 'opacity-90'
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 24)}px`,
                              left: `calc(${leftOffset}% + 2px)`,
                              width: `calc(${widthPercent}% - 4px)`,
                            }}
                            onClick={(e) => handleEventClick(event, e)}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              startDrag(
                                event,
                                day,
                                e.clientY,
                                e.currentTarget
                              );
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const touch = e.touches[0];
                              if (touch) {
                                startDrag(
                                  event,
                                  day,
                                  touch.clientY,
                                  e.currentTarget
                                );
                              }
                            }}
                          >
                            <p className="truncate font-semibold">{event.title}</p>
                            <p className="truncate">{`${startTime} - ${endTime}`}</p>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="overflow-hidden rounded-[28px] border border-slate-100 bg-white p-0 shadow-2xl shadow-slate-300/30 sm:max-w-[520px]">
          <DialogHeader className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-800">
              {editingEventId ? 'Editeaza evenimentul' : 'Adauga eveniment nou'}
            </DialogTitle>
            <DialogDescription className="mt-1 font-medium text-slate-500">
              {selectedDate &&
                `Adauga un eveniment pentru ${format(
                  selectedDate,
                  'dd MMMM yyyy',
                  { locale: ro }
                )}.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5 px-6 py-6"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-800">Titlu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Sales meeting"
                        className="h-12 rounded-xl border-slate-200 px-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-800">Data</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12 rounded-xl border-slate-200 px-4"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (event.target.value) {
                            setSelectedDate(parseISO(event.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-800">Ora inceput</FormLabel>
                      <FormControl>
                        <Input type="time" className="h-12 rounded-xl border-slate-200 px-4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-800">Ora final</FormLabel>
                      <FormControl>
                        <Input type="time" className="h-12 rounded-xl border-slate-200 px-4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Anuleaza
                </Button>
                <Button type="submit" className="bg-[#38bdf8] text-white hover:bg-sky-500">
                  Salveaza evenimentul
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
