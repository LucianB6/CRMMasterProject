"use client";

import { Bot, Send, User } from "lucide-react";
import { FormEvent, useRef, useState, useTransition } from "react";

import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet";
import { cn } from "../../lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AiAssistant({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    startTransition(async () => {
      const assistantMessage: Message = {
        role: "assistant",
        content: "Îți pot oferi câteva sugestii dacă îmi dai mai multe detalii."
      };
      setMessages((prev) => [...prev, assistantMessage]);
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">
            AI Sales Assistant
          </SheetTitle>
          <SheetDescription>
            Ask about sales tactics, KPIs, or performance. I'm here to help you
            improve.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="flex flex-col gap-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs rounded-lg p-3 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isPending && (
              <div className="flex items-start justify-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-xs rounded-lg bg-muted p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50 delay-0"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50 delay-150"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50 delay-300"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <form
          ref={formRef}
          onSubmit={handleChatSubmit}
          className="flex items-center gap-2 border-t pt-4"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., How can I improve my close rate?"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
