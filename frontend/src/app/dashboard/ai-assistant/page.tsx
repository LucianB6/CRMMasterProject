'use client';

import { Bot, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ApiError, apiFetch } from '../../../lib/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const buildId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  const placeholder = useMemo(
    () =>
      hasMessages
        ? 'Write your message...'
        : 'Select or create a conversation...',
    [hasMessages]
  );

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) {
      return;
    }
    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: buildId(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('salesway_token')
          : null;
      const payload = {
        message: trimmed,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      };
      const response = await apiFetch<{
        answer: string;
        conversation_id?: string;
      }>('/chatbot/chat', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (response?.conversation_id) {
        setConversationId(response.conversation_id);
      }
      if (response?.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: buildId(),
            role: 'assistant',
            content: response.answer,
          },
        ]);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.body || error.message || 'A apărut o eroare la trimitere.';
        setErrorMessage(message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('A apărut o eroare la trimitere.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">AI Assistant</h1>
        <p className="text-muted-foreground">
          Îți oferă răspunsuri rapide și idei pentru fluxurile tale de lucru.
        </p>
      </header>

      <div className="flex h-[70vh] flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardContent className="flex-1 space-y-6 overflow-y-auto p-6">
            {!hasMessages && !isSending ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                <Bot className="h-16 w-16" />
                <p className="max-w-md">
                  I am your AI sales assistant, SalesWay AI. Select or create a
                  conversation to get started.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-card px-4 py-2 text-sm text-muted-foreground">
                  AI Assistant scrie...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </CardContent>

          {errorMessage && (
            <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="border-t p-4">
            <form className="flex w-full items-center gap-2">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSending}
                autoComplete="off"
              />
              <Button
                type="button"
                onClick={handleSend}
                size="icon"
                disabled={isSending || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Trimite</span>
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
