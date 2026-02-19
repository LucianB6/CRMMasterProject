'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { apiFetch } from './../../../lib/api';

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
    return new Intl.DateTimeFormat('en-US', {
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
        return `${agentEmail} submitted the daily report.`;
      case 'SALE_RECORDED':
        return `${agentEmail} recorded a sale.`;
      case 'REPORT_DUE_30_MIN':
        return `${agentEmail} has a report due soon.`;
      case 'REPORT_NOT_SUBMITTED':
        return `${agentEmail} did not submit the daily report.`;
      case 'USER_LOGIN':
        return `${agentEmail} signed in.`;
      case 'AUTO_SUBMITTED_SUMMARY':
        return `${agentEmail} has an auto-submitted report.`;
      default:
        return 'You received a new notification.';
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const data = await apiFetch<ManagerNotification[]>('/manager/notifications', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setNotifications(data);
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to load notifications.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [getAuthToken, toast]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Notifications</h1>
        <p className="text-muted-foreground">
          See the latest updates from your team.
        </p>
      </header>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {isLoading && (
              <div className="p-4 text-sm text-muted-foreground">
                Loading notifications...
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No new notifications.
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
                        {notification.status === 'READ' ? 'Read' : 'New'}
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
