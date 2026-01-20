'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { managerNotifications } from '@/lib/mock-data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function NotificationsPage() {
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
            {managerNotifications.map((notification, index) => {
              const agentAvatar = PlaceHolderImages.find(
                (img) => img.id === notification.agentAvatarId
              );
              return (
                <React.Fragment key={notification.id}>
                  <div
                    className={cn(
                      'flex items-center gap-4 p-4',
                      !notification.read && 'bg-accent/10'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      {agentAvatar && (
                        <AvatarImage
                          src={agentAvatar.imageUrl}
                          alt={agentAvatar.description}
                        />
                      )}
                      <AvatarFallback>
                        {notification.agent.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {notification.agent}
                        </span>{' '}
                        {notification.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.time}
                      </p>
                    </div>
                    {notification.read ? (
                      <span className="text-xs text-muted-foreground">
                        Citit
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" className="shrink-0">
                        <Check className="mr-2 h-4 w-4" /> Marchează citit
                      </Button>
                    )}
                  </div>
                  {index < managerNotifications.length - 1 && <Separator />}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
