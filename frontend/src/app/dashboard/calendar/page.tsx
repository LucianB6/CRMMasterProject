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
import { enUS } from 'date-fns/locale';
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
      setHourHeight(isMobile ? 48 : 64);
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
      return format(currentDate, 'MMMM yyyy', { locale: enUS });
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    const startYear = format(start, 'yyyy');
    const endYear = format(end, 'yyyy');

    if (startYear !== endYear) {
      return `${format(start, 'd MMMM yyyy', { locale: enUS })} - ${format(
        end,
        'd MMMM yyyy',
        { locale: enUS }
      )}`;
    }

    const startMonth = format(start, 'MMMM', { locale: enUS });
    const endMonth = format(end, 'MMMM', { locale: enUS });

    if (startMonth !== endMonth) {
      return `${format(start, 'd MMMM', { locale: enUS })} - ${format(
        end,
        'd MMMM yyyy',
        { locale: enUS }
      )}`;
    }

    return `${format(start, 'd')} - ${format(end, 'd MMMM yyyy', {
      locale: enUS,
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">Calendar</h1>
          <p className="text-muted-foreground">
            View and add events to your calendar.
          </p>
        </div>
        <Button onClick={() => handleDayClick(new Date())}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-headline text-xl capitalize">
            {calendarTitle}
          </CardTitle>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as 'month' | 'week')}
              className="flex-grow sm:flex-grow-0"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous period</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next period</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className={cn(view === 'week' && 'p-0')}>
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px border-l border-t border-border bg-border">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-card p-1 text-center text-xs font-medium capitalize text-muted-foreground sm:p-2 sm:text-sm"
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
                      'relative min-h-[100px] cursor-pointer bg-card p-1 transition-colors hover:bg-muted/50 sm:min-h-[120px] sm:p-2',
                      !isSameMonth(day, currentDate) &&
                        'bg-muted/50 text-muted-foreground'
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <time
                      dateTime={format(day, 'yyyy-MM-dd')}
                      className={cn(
                        'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-sm sm:right-2 sm:top-2',
                        isToday(day) && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </time>
                    <div className="mt-7 space-y-1 sm:mt-8">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="overflow-hidden rounded-md bg-accent p-1 px-1.5 text-xs text-accent-foreground sm:px-2"
                          onClick={(e) => handleEventClick(event, e)}
                        >
                          <div className="font-semibold">{`${event.startTime}`}</div>
                          <div className="truncate">{event.title}</div>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <button
                          type="button"
                          className="w-full rounded-md border border-dashed border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/60"
                          onClick={(e) => {
                            e.stopPropagation();
                            setView('week');
                            setCurrentDate(day);
                          }}
                        >
                          {`Still ${dayEvents.length - 2} events`}
                        </button>
                      )}
                      {isLoadingEvents && dayEvents.length === 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="flex">
              <div className="flex w-14 flex-col">
                <div className="h-[65px] border-r sm:h-[69px]">&nbsp;</div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="shrink-0 border-r pt-1 text-center"
                    style={{ height: `${hourHeight}px` }}
                  >
                    <span className="text-xs text-muted-foreground">
                      {hour}:00
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-x-hidden">
                <div className="sticky top-0 z-20 grid grid-cols-7 bg-background">
                  {days.map((day) => (
                    <div
                      key={day.toString()}
                      className="border-b border-l p-1 text-center sm:p-2"
                    >
                      <p className="hidden text-sm capitalize text-muted-foreground sm:block">
                        {format(day, 'E', { locale: enUS })}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground sm:hidden">
                        {format(day, 'EEEEE', { locale: enUS })}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-semibold sm:text-xl',
                          isToday(day) && 'text-primary'
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
                        'relative h-full w-full border-l',
                        isToday(day) && 'bg-primary/5'
                      )}
                      onClick={() => handleDayClick(day)}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="border-b"
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
                              'absolute z-10 cursor-grab overflow-hidden rounded-md border bg-primary/80 p-1 text-xs text-primary-foreground shadow-md backdrop-blur-sm active:cursor-grabbing sm:p-2',
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingEventId ? 'Edit event' : 'Add new event'}
            </DialogTitle>
            <DialogDescription>
              {selectedDate &&
                `Add an event for ${format(
                  selectedDate,
                  'dd MMMM yyyy',
                  { locale: enUS }
                )}.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivul</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sales meeting"
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
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                      <FormLabel>Start time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormLabel>End time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Event</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
