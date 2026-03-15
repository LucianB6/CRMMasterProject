'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Calendar as CalendarIcon,
  MoreHorizontal,
  CheckCircle2,
  CircleDashed,
  Clock3,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

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
  todo: { title: 'To do' },
  'in-progress': { title: 'In progress' },
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to load tasks',
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
        title: editingTask ? 'Task updated!' : 'Task added!',
        description: `Task "${savedTask.title}" was ${
          editingTask ? 'updated' : 'added'
        }.`,
      });

      setIsDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to save task',
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
          error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Unable to move task',
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
      toast({ title: 'Task deleted.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to delete task',
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
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Task Planner</h1>
          <p className="mt-1 font-medium text-slate-500">
            Organizeaza-ti activitatile intr-un board vizual, in acelasi stil cu restul dashboard-ului.
          </p>
        </div>
        <Button
          onClick={openDialogForNew}
          className="bg-[#38bdf8] text-white hover:bg-sky-500"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        {columns.map((status) => (
          <div
            key={status}
            className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/40"
            onDragOver={(event) => handleDragOver(status, event)}
            onDrop={(event) => handleDrop(status, event)}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {statusConfig[status].title}
                </h2>
                <p className="text-sm font-medium text-slate-400">
                  {tasks.filter((task) => task.status === status).length} task-uri
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                {status === 'todo' ? (
                  <CircleDashed className="h-4 w-4" />
                ) : status === 'in-progress' ? (
                  <Clock3 className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>
            </div>
            <div
              className={cn(
                'min-h-[420px] space-y-4 p-5 transition-colors',
                dragOverStatus === status ? 'bg-sky-50/70' : 'bg-slate-50/40'
              )}
            >
              {isLoading ? (
                <p className="text-sm text-slate-500">Se incarca...</p>
              ) : (
                <>
                  {tasks
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
                    ))}
                  {tasks.filter((t) => t.status === status).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-400">
                      Niciun task in aceasta coloana.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="overflow-hidden rounded-[28px] border border-slate-100 bg-white p-0 shadow-2xl shadow-slate-300/30 sm:max-w-[560px]">
          <DialogHeader className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-800">
              {editingTask ? 'Editeaza task-ul' : 'Adauga task nou'}
            </DialogTitle>
            <DialogDescription className="mt-1 font-medium text-slate-500">
              Completeaza detaliile task-ului in acelasi format ca restul dashboard-ului.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6 py-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-800">
                      Titlu task
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Trimite oferta catre client"
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
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-800">
                      Obiectiv
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrie pe scurt scopul task-ului..."
                        className="min-h-[110px] rounded-xl border-slate-200 px-4 py-3"
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
                    <FormLabel className="text-sm font-semibold text-slate-800">
                      Deadline
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12 rounded-xl border-slate-200 px-4"
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
                    <FormLabel className="text-sm font-semibold text-slate-800">
                      Status
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 px-4">
                          <SelectValue placeholder="Selecteaza un status" />
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
                  Salveaza task-ul
                </Button>
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
        'group cursor-grab rounded-[24px] border border-slate-100 bg-white shadow-lg shadow-slate-200/30 transition-all active:cursor-grabbing',
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
                className="h-7 w-7 rounded-full opacity-50 group-hover:bg-slate-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="pr-6 text-sm font-semibold">{task.title}</p>
        {task.goal && (
          <p className="mt-2 text-xs leading-5 text-slate-500">{task.goal}</p>
        )}
        {task.deadline && (
          <Badge variant="outline" className="mt-3 rounded-full border-slate-200 bg-slate-50 text-xs text-slate-600">
            <CalendarIcon className="mr-1 h-3 w-3" />
            {format(task.deadline, 'd MMM', { locale: enUS })}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
