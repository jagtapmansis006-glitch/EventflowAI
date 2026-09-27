import React, { useState, useEffect, useRef } from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Send, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  CheckCircle2, 
  CornerDownLeft,
  Radio
} from 'lucide-react';

export const VoiceAssistantModal: React.FC = () => {
  const { voiceOpen, setVoiceOpen, voiceLogs, executeVoice } = useEventAdmin();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
        setIsListening(false);
      };

      recognizer.onerror = () => {
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  useEffect(() => {
    if (voiceOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [voiceLogs, voiceOpen]);

  if (!voiceOpen) return null;

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      } else {
        // Fallback simulation of voice prompt if browser doesn't permit mic
        setIsListening(true);
        setTimeout(() => {
          setIsListening(false);
          setInputText("Hey, open Gate 3");
        }, 1500);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isProcessing) return;

    setInputText('');
    setIsProcessing(true);

    const res = await executeVoice(query);
    if (res.requiresConfirmation) {
      setPendingConfirmation(query);
    } else {
      setPendingConfirmation(null);
    }

    setIsProcessing(false);
  };

  const confirmAction = async (confirmed: boolean) => {
    if (!pendingConfirmation) return;
    setIsProcessing(true);
    if (confirmed) {
      await executeVoice(pendingConfirmation, true);
    } else {
      await executeVoice("Cancel action");
    }
    setPendingConfirmation(null);
    setIsProcessing(false);
  };

  // Quick Action Voice Prompts for Rush-Hour One-Tap Testing
  const quickPrompts = [
    "Hey, open Gate 3",
    "What is the current crowd?",
    "Is Gate 2 congested?",
    "Show me Zone B",
    "Simulate opening Gate 3",
    "What is the queue wait time at East Concourse?",
    "Dispatch security to Zone A",
    "Lock down Gate 1",
  ];

  return (
    <div 
      id="voice-assistant-backdrop"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div 
        id="voice-assistant-card"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full h-[620px] flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                Action-Based Command Controller
              </div>
              <h3 className="text-base font-extrabold text-white">
                EventFlow Voice Assistant
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white"
              title={soundEnabled ? 'Speech Output Active' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setVoiceOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation Logs View */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {voiceLogs.map(log => {
            const isUser = log.role === 'user';
            return (
              <div
                key={log.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                  }`}
                >
                  <p className="font-medium">{log.text}</p>
                  {log.actionExecuted && (
                    <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Action verified & executed</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">
                  {log.time}
                </span>
              </div>
            );
          })}

          {/* Pending Safety Confirmation Dialogue */}
          {pendingConfirmation && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>SAFETY CONFIRMATION REQUIRED</span>
              </div>
              <p className="text-xs text-slate-700">
                Are you sure you want to execute: <strong>"{pendingConfirmation}"</strong>? This may restrict egress channels.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => confirmAction(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                >
                  Yes, Confirm Lockdown
                </button>
                <button
                  onClick={() => confirmAction(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Voice Command Chips */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
            Tap to test voice command:
          </div>
          <div className="flex items-center gap-1.5 pb-1">
            {quickPrompts.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(cmd)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors border border-slate-200/60"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar with Mic Trigger */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Mic Toggle Button */}
            <button
              type="button"
              id="btn-voice-mic-trigger"
              onClick={toggleMic}
              className={`p-3 rounded-2xl transition-all flex items-center justify-center ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title={isListening ? 'Listening...' : 'Click to Speak'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              id="voice-command-input"
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={isListening ? "Listening... speak now..." : "Speak or type voice command..."}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 border border-transparent focus:border-blue-500 focus:bg-white text-xs text-slate-900 font-medium focus:outline-hidden transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
