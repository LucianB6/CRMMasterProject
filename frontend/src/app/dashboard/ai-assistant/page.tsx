'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Folder,
  FolderPlus,
  Loader2,
  MessageSquarePlus,
  Send,
  User,
} from 'lucide-react';
import { askAssistant } from '../../../ai/flows/assistant-flow';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { cn } from '../../../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  folderId: string;
};

type Folder = {
  id: string;
  name: string;
};

export default function AiAssistantPage() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'Strategii de vânzări' },
    { id: '2', name: 'Idei de produse' },
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'c1',
      folderId: '1',
      title: 'Cold-emailing eficient',
      messages: [
        {
          role: 'assistant',
          content: 'Desigur, iată o strategie pentru cold-emailing...',
        },
      ],
    },
    {
      id: 'c2',
      folderId: '2',
      title: 'Funcționalități noi CRM',
      messages: [
        {
          role: 'assistant',
          content: 'Putem adăuga un modul de gamification.',
        },
      ],
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isLoading]);

  const handleNewChat = () => {
    if (folders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Creează un folder întâi',
        description:
          'Trebuie să ai cel puțin un folder pentru a crea o conversație nouă.',
      });
      return;
    }
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'Discuție nouă',
      messages: [],
      folderId: folders[0].id,
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Numele folderului nu poate fi gol.',
      });
      return;
    }
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
    };
    setFolders((prev) => [newFolder, ...prev]);
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    toast({ title: `Folderul "${newFolder.name}" a fost creat.` });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    const userMessage: Message = { role: 'user', content: input };

    const oldConversations = conversations;
    let newTitle = activeConversation?.title || 'Discuție nouă';
    if (activeConversation?.messages.length === 0) {
      newTitle = input.length > 50 ? `${input.substring(0, 47)}...` : input;
    }

    const updatedConversations = conversations.map((c) =>
      c.id === activeConversationId
        ? {
            ...c,
            title: newTitle,
            messages: [...c.messages, userMessage],
          }
        : c
    );
    setConversations(updatedConversations);

    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await askAssistant(input);
      const assistantMessage: Message = { role: 'assistant', content: aiResponse };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );
    } catch (error) {
      console.error('AI Assistant Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content:
          'Scuze, a apărut o eroare. Te rog încearcă din nou. Asigură-te că ai configurat cheia API pentru Gemini în fișierul .env (GEMINI_API_KEY).',
      };
      setConversations(oldConversations);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, userMessage, errorMessage] }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid h-full max-h-[calc(100vh-8rem)] grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-headline text-lg">Discuții</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsNewFolderDialogOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
                <span className="sr-only">Folder Nou</span>
              </Button>
              <Button variant="outline" size="icon" onClick={handleNewChat}>
                <MessageSquarePlus className="h-4 w-4" />
                <span className="sr-only">Discuție Nouă</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 overflow-y-auto p-2">
          <Accordion
            type="multiple"
            defaultValue={folders.map((f) => f.id)}
            className="w-full"
          >
            {folders.map((folder) => (
              <AccordionItem value={folder.id} key={folder.id}>
                <AccordionTrigger className="px-2 py-2 text-sm hover:no-underline [&[data-state=open]>svg]:text-accent">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0 pl-4">
                  <div className="flex flex-col items-start gap-1">
                    {conversations
                      .filter((c) => c.folderId === folder.id)
                      .map((conv) => (
                        <Button
                          key={conv.id}
                          variant="ghost"
                          className={cn(
                            'h-auto w-full justify-start px-2 py-1.5 text-left',
                            activeConversationId === conv.id &&
                              'bg-muted font-semibold'
                          )}
                          onClick={() => setActiveConversationId(conv.id)}
                        >
                          {conv.title}
                        </Button>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex h-full flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardContent className="flex-1 space-y-6 overflow-y-auto p-6">
            {!activeConversation && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                <Bot className="h-16 w-16" />
                <p className="max-w-md">
                  Sunt asistentul tău AI pentru vânzări, SalesWay AI.
                  Selectează o discuție sau creează una nouă pentru a începe.
                </p>
              </div>
            )}
            {activeConversation?.messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-4',
                  message.role === 'user' ? 'justify-end' : ''
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-background">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-2xl rounded-lg p-3 px-4',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <ReactMarkdown
                    className="prose prose-sm max-w-none dark:prose-invert"
                    remarkPlugins={[remarkGfm]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-background">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-background">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg bg-muted p-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter className="border-t p-4">
            <form
              onSubmit={handleSendMessage}
              className="flex w-full items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeConversationId
                    ? 'Scrie mesajul tău...'
                    : 'Selectează sau creează o discuție...'
                }
                disabled={isLoading || !activeConversationId}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim() || !activeConversationId}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Trimite</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Creează un folder nou</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Numele folderului..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewFolderDialogOpen(false)}
            >
              Anulează
            </Button>
            <Button onClick={handleCreateFolder}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
