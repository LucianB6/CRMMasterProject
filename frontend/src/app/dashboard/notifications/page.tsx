'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './../../../components/ui/card';
import { Avatar, AvatarFallback } from './../../../components/ui/avatar';
import { Separator } from './../../../components/ui/separator';
import { cn } from './../../../lib/utils';
import { useToast } from './../../../hooks/use-toast';

type ManagerNotification = {
  id: string;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  created_at: string;
  scheduled_for: string | null;
  payload: Record<string, unknown>;
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ManagerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081',
    []
  );

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
        return `${agentEmail} are raportul scadent în curând.`;
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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const response = await fetch(`${apiBaseUrl}/manager/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error('Nu am putut încărca notificările.');
        }
        const data = (await response.json()) as ManagerNotification[];
        setNotifications(data);
      } catch (error) {
        toast({
          title: 'Eroare',
          description:
            error instanceof Error
              ? error.message
              : 'Nu am putut încărca notificările.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [apiBaseUrl, getAuthToken, toast]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Notificări</h1>
        <p className="text-muted-foreground">
          Aici vezi cele mai recente actualizări de la echipa ta.
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Se încarcă notificările...
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                Nu există notificări noi.
              </div>
            )}
            {!isLoading &&
              notifications.map((notification, index) => {
                const agentEmail =
                  typeof notification.payload?.agent_email === 'string'
                    ? notification.payload.agent_email
                    : 'Agent';
                const hasPayloadMessage =
                  typeof notification.payload?.message === 'string' &&
                  notification.payload.message.trim().length > 0;
                return (
                  <React.Fragment key={notification.id}>
                    <div
                      className={cn(
                        'flex items-center gap-4 p-4',
                        notification.status !== 'READ' && 'bg-accent/10'
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {agentEmail.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          {!hasPayloadMessage && (
                            <span className="font-semibold">{agentEmail}</span>
                          )}{' '}
                          {resolveMessage(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {notification.status === 'READ' ? 'Citit' : 'Nou'}
                      </span>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </React.Fragment>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
