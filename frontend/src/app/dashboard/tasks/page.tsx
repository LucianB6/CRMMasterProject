'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { useToast } from '../../../hooks/use-toast';
import { apiFetch } from '../../../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { cn } from '../../../lib/utils';

type TaskStatus = 'todo' | 'in-progress' | 'done';

const taskSchema = z.object({
  title: z.string().min(1, 'Titlul este obligatoriu.'),
  goal: z.string().optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
});

type Task = z.infer<typeof taskSchema> & { id: string };

type ApiTask = {
  id: string;
  title: string;
  goal: string | null;
  deadline: string | null;
  status: TaskStatus;
};

const statusConfig: Record<TaskStatus, { title: string }> = {
  todo: { title: 'De făcut' },
  'in-progress': { title: 'În progres' },
  done: { title: 'Finalizat' },
};

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const normalizeTask = useCallback((task: ApiTask): Task => {
    return {
      id: task.id,
      title: task.title,
      goal: task.goal ?? '',
      deadline: task.deadline ? new Date(task.deadline) : undefined,
      status: task.status,
    };
  }, []);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      goal: '',
      deadline: undefined,
      status: 'todo',
    },
  });

  const openDialogForNew = () => {
    setEditingTask(null);
    form.reset({ title: '', goal: '', deadline: undefined, status: 'todo' });
    setIsDialogOpen(true);
  };

  const openDialogForEdit = (task: Task) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      goal: task.goal ?? '',
      deadline: task.deadline,
      status: task.status,
    });
    setIsDialogOpen(true);
  };

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const data = await apiFetch<ApiTask[]>('/tasks/board', { headers });
      setTasks(data.map(normalizeTask));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare necunoscută';
      toast({
        title: 'Nu am putut încărca task-urile',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, normalizeTask, toast]);

  async function onSubmit(values: z.infer<typeof taskSchema>) {
    try {
      const token = getAuthToken();
      const savedTask = normalizeTask(await apiFetch<ApiTask>(
        `/tasks/board${editingTask ? `/${editingTask.id}` : ''}`,
        {
          method: editingTask ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title: values.title,
            goal: values.goal,
            deadline: values.deadline ? format(values.deadline, 'yyyy-MM-dd') : null,
            status: values.status,
          }),
        }
      ));
      setTasks((prev) => {
        const existingIndex = prev.findIndex((task) => task.id === savedTask.id);
        if (existingIndex === -1) {
          return [savedTask, ...prev];
        }
        const next = [...prev];
        next[existingIndex] = savedTask;
        return next;
      });

      toast({
        title: editingTask ? 'Task actualizat!' : 'Task adăugat!',
        description: `Task-ul "${savedTask.title}" a fost ${
          editingTask ? 'modificat' : 'adăugat'
        }.`,
      });

      setIsDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare necunoscută';
      toast({
        title: 'Nu am putut salva task-ul',
        description: message,
        variant: 'destructive',
      });
    }
  }

  const updateTaskStatus = useCallback(
    async (task: Task, nextStatus: TaskStatus, previousTask: Task) => {
      try {
        const token = getAuthToken();
        const savedTask = normalizeTask(await apiFetch<ApiTask>(`/tasks/board/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title: task.title,
            goal: task.goal || null,
            deadline: task.deadline
              ? format(task.deadline, 'yyyy-MM-dd')
              : null,
            status: nextStatus,
          }),
        }));
        setTasks((prev) =>
          prev.map((item) => (item.id === savedTask.id ? savedTask : item))
        );
      } catch (error) {
        setTasks((prev) =>
          prev.map((item) => (item.id === previousTask.id ? previousTask : item))
        );
        const message =
          error instanceof Error ? error.message : 'Eroare necunoscută';
        toast({
          title: 'Nu am putut muta task-ul',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [getAuthToken, normalizeTask, toast]
  );

  const deleteTask = async (taskId: string) => {
    try {
      const token = getAuthToken();
      await apiFetch<unknown>(`/tasks/board/${taskId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({ title: 'Task șters.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare necunoscută';
      toast({
        title: 'Nu am putut șterge task-ul',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const columns: TaskStatus[] = ['todo', 'in-progress', 'done'];

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const handleDragStart = (task: Task, event: React.DragEvent) => {
    setDragTaskId(task.id);
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (
    status: TaskStatus,
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (
    status: TaskStatus,
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    const draggedId =
      dragTaskId || event.dataTransfer.getData('text/plain');
    if (!draggedId) {
      return;
    }
    const task = tasks.find((item) => item.id === draggedId);
    if (!task || task.status === status) {
      handleDragEnd();
      return;
    }

    const previousTask = task;
    const updatedTask = { ...task, status };
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? updatedTask : item))
    );
    handleDragEnd();
    void updateTaskStatus(updatedTask, status, previousTask);
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl">Planificator Task-uri</h1>
          <p className="text-muted-foreground">
            Organizează-ți activitățile zilnice cu acest panou Kanban.
          </p>
        </div>
        <Button onClick={openDialogForNew}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă Task
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 items-start gap-6 md:grid-cols-3">
        {columns.map((status) => (
          <Card
            key={status}
            className="flex h-full flex-col bg-muted/50"
            onDragOver={(event) => handleDragOver(status, event)}
            onDrop={(event) => handleDrop(status, event)}
          >
            <CardHeader>
              <CardTitle>{statusConfig[status].title}</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                'flex flex-col gap-4',
                dragOverStatus === status && 'bg-muted/70'
              )}
            >
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Se încarcă...</p>
              ) : (
                tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={openDialogForEdit}
                      onDelete={deleteTask}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={dragTaskId === task.id}
                    />
                  ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Editează Task' : 'Creează Task Nou'}
            </DialogTitle>
            <DialogDescription>
              Completează detaliile de mai jos pentru task-ul tău.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titlu Task</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Trimite oferta către client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scop (Opțional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrie pe scurt obiectivul acestui task..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termen limită (Opțional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value instanceof Date
                            ? format(field.value, 'yyyy-MM-dd')
                            : field.value || ''
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează un status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {columns.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusConfig[status].title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Salvează Task</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (task: Task, event: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <Card
      className={cn(
        'group bg-card cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-60'
      )}
      draggable
      onDragStart={(event) => onDragStart(task, event)}
      onDragEnd={onDragEnd}
    >
      <CardContent className="relative p-4">
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                Editează
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                Șterge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="pr-6 text-sm font-semibold">{task.title}</p>
        {task.goal && (
          <p className="mt-1 text-xs text-muted-foreground">{task.goal}</p>
        )}
        {task.deadline && (
          <Badge variant="outline" className="mt-2 text-xs">
            <CalendarIcon className="mr-1 h-3 w-3" />
            {format(task.deadline, 'd MMM', { locale: ro })}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
