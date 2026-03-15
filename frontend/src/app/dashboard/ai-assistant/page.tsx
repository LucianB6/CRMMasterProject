'use client';

import { Bot, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ApiError, apiFetch } from '../../../lib/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const formatAssistantMessage = (value: string) =>
  value
    .replace(/\s+([0-9]+\.)\s+\*\*/g, '\n\n$1 **')
    .replace(/:\s+([0-9]+\.)\s+\*\*/g, ':\n\n$1 **')
    .trim();

const renderMessageContent = (value: string) => {
  const lines = value.split('\n');

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <div key={`${line}-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return <strong key={`${part}-${partIndex}`}>{part.slice(2, -2)}</strong>;
          }

          return <span key={`${part}-${partIndex}`}>{part}</span>;
        })}
      </div>
    );
  }) as ReactNode;
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
            content: formatAssistantMessage(response.answer),
          },
        ]);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.body || error.message || 'An error occurred while sending.';
        setErrorMessage(message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An error occurred while sending.');
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
    <div className="w-full min-w-0 max-w-none space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-800">AI Assistant</h1>
        <p className="mt-1 font-medium text-slate-500">
          Get quick answers and ideas for your workflows.
        </p>
      </header>

      <div className="flex h-[70vh] flex-col">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {!hasMessages && !isSending ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-500">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <Bot className="h-12 w-12 text-[#38bdf8]" />
                </div>
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
                        ? 'bg-[#38bdf8] text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="leading-7">{renderMessageContent(message.content)}</div>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  AI Assistant is typing...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {errorMessage && (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="border-t border-slate-200 bg-white p-4">
            <form className="flex w-full items-center gap-2">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSending}
                autoComplete="off"
                className="border-slate-200 bg-slate-50 focus:border-[#38bdf8] focus:ring-[#38bdf8]/20"
              />
              <Button
                type="button"
                onClick={handleSend}
                size="icon"
                disabled={isSending || !inputValue.trim()}
                className="bg-[#38bdf8] text-white hover:bg-[#0ea5e9]"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
