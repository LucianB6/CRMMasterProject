'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Trash2,
  UserCircle2,
} from 'lucide-react';

import { useToast } from './../../../hooks/use-toast';
import { apiFetch } from './../../../lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './../../../components/ui/alert-dialog';
import { Button } from './../../../components/ui/button';

type ManagerNotification = {
  id: string;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  created_at: string;
  scheduled_for: string | null;
  payload: Record<string, unknown>;
};

const statusLabel: Record<ManagerNotification['status'], string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
  READ: 'Read',
};

const statusClasses: Record<ManagerNotification['status'], string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  SENT: 'border-sky-200 bg-sky-50 text-sky-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  READ: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ManagerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('ro-RO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }, []);

  const resolveMessage = useCallback((notification: ManagerNotification) => {
    const payloadMessage = notification.payload?.message;
    if (typeof payloadMessage === 'string' && payloadMessage.trim().length > 0) {
      return payloadMessage;
    }
    const agentEmail =
      typeof notification.payload?.agent_email === 'string'
        ? notification.payload.agent_email
        : 'Agent';
    switch (notification.type) {
      case 'REPORT_SUBMITTED':
        return `${agentEmail} a trimis raportul zilnic.`;
      case 'SALE_RECORDED':
        return `${agentEmail} a înregistrat o vânzare.`;
      case 'REPORT_DUE_30_MIN':
        return `${agentEmail} are un raport care trebuie trimis în curând.`;
      case 'REPORT_NOT_SUBMITTED':
        return `${agentEmail} nu a trimis raportul zilnic.`;
      case 'USER_LOGIN':
        return `${agentEmail} s-a autentificat.`;
      case 'AUTO_SUBMITTED_SUMMARY':
        return `${agentEmail} are un raport auto-trimis.`;
      default:
        return 'Ai primit o notificare nouă.';
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const data = await apiFetch<ManagerNotification[]>('/manager/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setNotifications(data);
    } catch (error) {
      toast({
        title: 'Nu am putut încărca notificările',
        description:
          error instanceof Error ? error.message : 'Unable to load notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, toast]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        setDeletingNotificationId(notificationId);
        const token = getAuthToken();
        await apiFetch(`/manager/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setNotifications((current) =>
          current.filter((notification) => notification.id !== notificationId)
        );
        toast({
          title: 'Notificare ștearsă',
          description: 'Notificarea a fost eliminată din listă.',
        });
      } catch (error) {
        toast({
          title: 'Nu am putut șterge notificarea',
          description:
            error instanceof Error ? error.message : 'Delete notification failed.',
          variant: 'destructive',
        });
      } finally {
        setDeletingNotificationId(null);
      }
    },
    [getAuthToken, toast]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.status !== 'READ').length,
    [notifications]
  );
  const failedCount = useMemo(
    () => notifications.filter((notification) => notification.status === 'FAILED').length,
    [notifications]
  );
  const scheduledCount = useMemo(
    () => notifications.filter((notification) => notification.status === 'PENDING').length,
    [notifications]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-auto bg-slate-50 p-8">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
            <p className="text-slate-500">
              {notifications.length === 1
                ? '1 notificare afișată'
                : `${notifications.length} notificări afișate`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void loadNotifications()}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Unread"
            value={unreadCount}
            icon={<Bell className="h-5 w-5 text-blue-600" />}
          />
          <SummaryCard
            label="Pending"
            value={scheduledCount}
            icon={<Clock3 className="h-5 w-5 text-amber-600" />}
          />
          <SummaryCard
            label="Failed"
            value={failedCount}
            icon={<CheckCircle2 className="h-5 w-5 text-rose-600" />}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-800">Latest Updates</h3>
            <p className="mt-1 text-sm text-slate-500">
              Vezi activitatea recentă și statusul notificărilor echipei.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="space-y-3 p-6">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="rounded-full bg-blue-50 p-4">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-800">Nu există notificări noi</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Când apar evenimente noi din activitatea echipei, le vei vedea aici.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const agentEmail =
                  typeof notification.payload?.agent_email === 'string'
                    ? notification.payload.agent_email
                    : 'Agent';

                return (
                  <div
                    key={notification.id}
                    className={`flex flex-col gap-4 px-6 py-5 md:flex-row md:items-start md:justify-between ${
                      notification.status !== 'READ' ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-600">
                        <UserCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{agentEmail}</p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusClasses[notification.status]}`}
                          >
                            {statusLabel[notification.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {resolveMessage(notification)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>Created {formatTimestamp(notification.created_at)}</span>
                          {notification.scheduled_for ? (
                            <span>Scheduled {formatTimestamp(notification.scheduled_for)}</span>
                          ) : null}
                          <span>Type {notification.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start md:pl-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingNotificationId === notification.id}
                            className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete notification</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ștergi această notificare?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Notificarea va fi eliminată din listă. Acțiunea nu poate fi anulată.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void deleteNotification(notification.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Șterge notificarea
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
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
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-full bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return <div className="h-28 rounded-xl border border-slate-200 bg-slate-50" />;
}
