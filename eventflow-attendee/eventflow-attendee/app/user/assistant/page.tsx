'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import ChatBubble from '@/components/user/ChatBubble';
import PageHeader from '@/components/user/PageHeader';
import { SendIcon } from '@/components/user/icons';
import { askAssistant } from '@/lib/api/endpoints';
import { useAlerts, useZones } from '@/lib/hooks/useAttendeeData';
import { useSelectedEvent } from '@/lib/hooks/useSelectedEvent';
import type { ChatMessage } from '@/lib/types';
import { cn, uid } from '@/lib/utils';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi, I'm your EventFlow concierge. I answer from live crowd levels, alerts and the venue map, so ask me about queues, routes or exits.",
  createdAt: '',
};

const SUGGESTIONS = [
  'Where is the shortest food line?',
  'Nearest quiet restroom',
  'Fastest way out after the show',
  'Any alerts I should know about?',
];

// Chrome/Edge/Safari expose this under a vendor-prefixed name; Firefox has no
// support at all as of this writing. Feature-detect rather than assume.
function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/** Minimal inline mic icon so this doesn't depend on icons.tsx exporting one. */
function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 19v3" strokeLinecap="round" />
      <path d="M8 22h8" strokeLinecap="round" />
    </svg>
  );
}

export default function AssistantPage() {
  const { eventId } = useSelectedEvent();
  const zones = useZones(eventId);
  const alerts = useAlerts(eventId);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  // Carried across turns so the backend keeps one conversation thread per attendee per event.
  const sessionIdRef = useRef<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // A fresh event should start a fresh conversation, not continue another event's thread.
  useEffect(() => {
    sessionIdRef.current = undefined;
    setMessages([WELCOME]);
  }, [eventId]);

  useEffect(() => {
    if (messages.length <= 1 && !pending) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' });
  }, [messages.length, pending]);

  // Set up (and tear down) the recognition instance once on mount.
  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicSupported(false);
      return;
    }
    setMicSupported(true);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggleMic = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || pending) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    setInput('');
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if called while already running (e.g. a fast double-tap) — ignore.
    }
  }, [listening, pending]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || pending || !eventId) return;

      const userMessage: ChatMessage = {
        id: uid(),
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      };
      const history = [...messages, userMessage];

      setMessages(history);
      setInput('');
      setPending(true);

      try {
        // Never throws: falls back to a demo answer grounded in the data below.
        const { message, sessionId } = await askAssistant({
          eventId,
          history,
          zones: zones.data,
          alerts: alerts.data,
          sessionId: sessionIdRef.current,
        });
        if (sessionId) sessionIdRef.current = sessionId;
        setMessages((current) => [...current, message]);
      } finally {
        setPending(false);
      }
    },
    [messages, pending, zones.data, alerts.data, eventId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
    void send(input);
  };

  const canSend = input.trim().length > 0 && !pending;

  return (
    <>
      <PageHeader title="Assistant" subtitle="Answers from live venue data" status={zones.status} />

      <main className="px-4 pb-28 pt-4">
        <ul aria-label="Conversation" aria-live="polite" className="space-y-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {pending && (
            <li className="flex">
              <div role="status" className="rounded-3xl rounded-bl-lg bg-white px-4 py-4 ring-1 ring-slate-200">
                <span className="sr-only">The assistant is typing</span>
                <span aria-hidden="true" className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{ animationDelay: `${dot * 120}ms` }}
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
                    />
                  ))}
                </span>
              </div>
            </li>
          )}
        </ul>

        {messages.length === 1 && (
          <div role="group" aria-label="Suggested questions" className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="min-h-[48px] touch-manipulation rounded-full bg-white px-5 text-left text-sm font-semibold text-blue-700 ring-1 ring-slate-200 transition-colors active:bg-sky-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          In an emergency, call 112 or ask the nearest staff member. The assistant can&apos;t dispatch help.
        </p>

        <div ref={endRef} className="scroll-mb-[calc(var(--nav-h)+6rem)]" />
      </main>

      {/* Composer sits directly above the bottom nav. */}
      <div className="fixed inset-x-0 bottom-[var(--nav-h,4.5rem)] z-30 mx-auto w-full max-w-md px-3 py-2">
        <form onSubmit={handleSubmit} className="w-full py-3 px-5 rounded-full border border-slate-700 bg-slate-900/80 backdrop-blur-md flex items-center gap-2 shadow-2xl">
          <label htmlFor="assistant-input" className="sr-only">
            Ask the assistant
          </label>
          <input
            id="assistant-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={listening ? 'Listening…' : 'Ask about lines, routes or exits...'}
            enterKeyHint="send"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={pending}
              aria-label={listening ? 'Stop voice input' : 'Ask by voice'}
              aria-pressed={listening}
              className={cn(
                'flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full transition-colors',
                listening
                  ? 'animate-pulse bg-rose-600 text-white active:bg-rose-700'
                  : 'bg-slate-800 text-slate-300 hover:text-white',
              )}
            >
              <MicIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              'flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900',
              canSend ? 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed',
            )}
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}