'use client';

import { useMemo, useState, useEffect } from 'react';
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
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ro } from 'date-fns/locale';
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
import { cn } from '../../../lib/utils';

const eventSchema = z
  .object({
    title: z.string().min(1, 'Motivul este obligatoriu.'),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Format oră invalid (HH:mm).',
      }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Format oră invalid (HH:mm).',
    }),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Ora de sfârșit trebuie să fie după ora de început.',
    path: ['endTime'],
  });

type Event = {
  date: Date;
  title: string;
  startTime: string;
  endTime: string;
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const [hourHeight, setHourHeight] = useState(64);

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
    'Marți',
    'Miercuri',
    'Joi',
    'Vineri',
    'Sâmbătă',
    'Duminică',
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
    setSelectedDate(day);
    setIsDialogOpen(true);
    form.reset({ title: '', startTime: '', endTime: '' });
  };

  function onSubmit(values: z.infer<typeof eventSchema>) {
    if (selectedDate) {
      const newEvent: Event = {
        date: selectedDate,
        title: values.title,
        startTime: values.startTime,
        endTime: values.endTime,
      };
      setEvents([...events, newEvent]);
      toast({
        title: 'Eveniment adăugat',
        description: `Evenimentul "${values.title}" a fost adăugat pe ${format(
          selectedDate,
          'dd MMMM yyyy',
          { locale: ro }
        )} între orele ${values.startTime} - ${values.endTime}.`,
      });
      setIsDialogOpen(false);
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const timeToPosition = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * hourHeight + (m / 60) * hourHeight;
  };

  const getEventsForDay = (day: Date) =>
    events
      .filter((event) => isSameDay(event.date, day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">Calendar</h1>
          <p className="text-muted-foreground">
            Vezi și adaugă evenimente în calendarul tău.
          </p>
        </div>
        <Button onClick={() => handleDayClick(new Date())}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă Eveniment
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
                <TabsTrigger value="month">Lună</TabsTrigger>
                <TabsTrigger value="week">Săptămână</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Perioada precedentă</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Perioada următoare</span>
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
                      {dayEvents.slice(0, 2).map((event, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-md bg-accent p-1 px-1.5 text-xs text-accent-foreground sm:px-2"
                        >
                          <div className="font-semibold">{`${event.startTime}`}</div>
                          <div className="truncate">{event.title}</div>
                        </div>
                      ))}
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
                        {format(day, 'E', { locale: ro })}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground sm:hidden">
                        {format(day, 'EEEEE', { locale: ro })}
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
                <div className="grid grid-cols-7">
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

                      {getEventsForDay(day).map((event, eventIndex) => {
                        const top = timeToPosition(event.startTime);
                        const height =
                          timeToPosition(event.endTime) -
                          timeToPosition(event.startTime);

                        return (
                          <div
                            key={eventIndex}
                            className="absolute z-10 w-full cursor-default overflow-hidden rounded-md border bg-primary/80 p-1 text-xs text-primary-foreground shadow-md backdrop-blur-sm sm:p-2"
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 24)}px`,
                              left: '2px',
                              right: '2px',
                              width: 'calc(100% - 4px)',
                            }}
                          >
                            <p className="truncate font-semibold">{event.title}</p>
                            <p className="truncate">{`${event.startTime} - ${event.endTime}`}</p>
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
            <DialogTitle>Adaugă eveniment nou</DialogTitle>
            <DialogDescription>
              {selectedDate &&
                `Adaugă un eveniment pentru data de ${format(
                  selectedDate,
                  'dd MMMM yyyy',
                  { locale: ro }
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
                        placeholder="Ex: Întâlnire de vânzări"
                        {...field}
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
                      <FormLabel>Ora de început</FormLabel>
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
                      <FormLabel>Ora de sfârșit</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Salvează Eveniment</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
