'use client';

import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

type TaskStatus = 'todo' | 'in-progress' | 'done';

const taskSchema = z.object({
  title: z.string().min(1, 'Titlul este obligatoriu.'),
  goal: z.string().optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
});

type Task = z.infer<typeof taskSchema> & { id: string };

const statusConfig: Record<TaskStatus, { title: string }> = {
  todo: { title: 'De făcut' },
  'in-progress': { title: 'În progres' },
  done: { title: 'Finalizat' },
};

const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Pregătește prezentarea de vânzări Q3',
    goal: 'Finalizează slide-urile și research-ul concurenței.',
    deadline: new Date(new Date().setDate(new Date().getDate() + 3)),
    status: 'in-progress',
  },
  {
    id: 'task-2',
    title: 'Follow-up cu lead-urile din conferință',
    goal: 'Trimite emailuri personalizate către cele 15 contacte noi.',
    status: 'todo',
  },
  {
    id: 'task-3',
    title: 'Actualizează profilul CRM',
    goal: 'Adaugă noile interacțiuni și note pentru clienții cheie.',
    deadline: new Date(),
    status: 'todo',
  },
  {
    id: 'task-4',
    title: 'Finalizează raportul lunar',
    goal: 'Compilează datele de performanță și trimite managerului.',
    deadline: new Date(new Date().setDate(new Date().getDate() - 1)),
    status: 'done',
  },
];

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    form.reset(task);
    setIsDialogOpen(true);
  };

  function onSubmit(values: z.infer<typeof taskSchema>) {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...values } : t))
      );
      toast({
        title: 'Task actualizat!',
        description: `Task-ul "${values.title}" a fost modificat.`,
      });
    } else {
      const newTask: Task = { ...values, id: `task_${Date.now()}` };
      setTasks((prev) => [...prev, newTask]);
      toast({
        title: 'Task adăugat!',
        description: `Task-ul "${values.title}" a fost adăugat.`,
      });
    }

    setIsDialogOpen(false);
    setEditingTask(null);
  }

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast({ title: 'Task șters.', variant: 'destructive' });
  };

  const columns: TaskStatus[] = ['todo', 'in-progress', 'done'];

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
          <Card key={status} className="flex h-full flex-col bg-muted/50">
            <CardHeader>
              <CardTitle>{statusConfig[status].title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={openDialogForEdit}
                    onDelete={deleteTask}
                  />
                ))}
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
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group bg-card">
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
