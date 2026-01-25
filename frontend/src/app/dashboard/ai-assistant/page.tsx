'use client';

import { Bot } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">AI Assistant</h1>
        <p className="text-muted-foreground">
          Această secțiune este în lucru și va fi disponibilă în curând.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>În lucru</CardTitle>
            <CardDescription>
              Lucrăm la experiența AI Assistant. Revino în curând.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Dacă ai idei sau cerințe pentru această pagină, spune-ne și le
          includem în următoarea iterație.
        </CardContent>
      </Card>
    </div>
  );
}
