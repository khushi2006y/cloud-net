import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  RotateCcw, 
  ArrowUpRight, 
  MapPin, 
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { WeatherEvent, EventCategory, WeatherMood } from '../types/weather';
import { generateAIWeatherResponse, ChatMessage } from '../services/aiWeatherAssistant';

interface WeatherAIChatbotProps {
  events: WeatherEvent[];
  onSelectEvent: (event: WeatherEvent) => void;
  onFilterCategory: (category: EventCategory) => void;
  onFocusCity: (cityName: string) => void;
  onMoodChange?: (mood: WeatherMood) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    sender: 'bot',
    text: `👋 Welcome to CloudNet AI Weather Copilot!\n\nI analyze live synoptic observations, Twitter #IMD feeds, and citizen reports across India.\n\nAsk me about any city, active weather warnings, or safety precautions.`,
    timestamp: 'Just now'
  }
];

const SUGGESTED_QUESTIONS = [
  '🌧️ Rain status in Mumbai?',
  '⚡ Thunderstorms in Chennai?',
  '🌊 Flooding reports in Bengaluru?',
  '🔥 Heatwave alerts in Bikaner?',
  '📊 System accuracy & spam stats?',
  '🚨 Emergency helpline numbers?'
];

// Helper to format text with bold, bullets, and clean line breaks without raw markdown symbols
function FormattedMessage({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) {
    return <div className="text-white text-xs font-medium">{text}</div>;
  }

  // Split lines
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1" />;

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const cleanContent = isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed;

        // Parse **bold** and *italic*
        const parts = cleanContent.split(/(\*\*.*?\*\*|\*.*?\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <em key={pIdx} className="italic text-slate-600">
                {part.slice(1, -1)}
              </em>
            );
          }
          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start space-x-2 pl-1">
              <span className="text-sky-500 font-bold leading-none mt-1">•</span>
              <div className="flex-1">{renderedLine}</div>
            </div>
          );
        }

        return (
          <div key={lIdx} className={trimmed.startsWith('📍') || trimmed.startsWith('📊') || trimmed.startsWith('🚨') ? 'font-semibold text-slate-900 pb-0.5' : ''}>
            {renderedLine}
          </div>
        );
      })}
    </div>
  );
}

export const WeatherAIChatbot: React.FC<WeatherAIChatbotProps> = ({
  events,
  onSelectEvent,
  onFilterCategory,
  onFocusCity,
  onMoodChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Simulate AI thinking and generate contextual response
    setTimeout(() => {
      const botResponse = generateAIWeatherResponse(query, events);
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 500);
  };

  const handleExecuteAction = (action?: ChatMessage['suggestedAction']) => {
    if (!action) return;

    if (action.type === 'focus_city') {
      onFocusCity(action.target);
      const matched = events.find(e => e.city.toLowerCase() === action.target.toLowerCase());
      if (matched && onMoodChange) {
        onMoodChange(matched.category);
      }
    } else if (action.type === 'filter_category') {
      onFilterCategory(action.target as EventCategory);
      if (onMoodChange) {
        onMoodChange(action.target as WeatherMood);
      }
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <>
      {/* Floating Assistant Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-2xl shadow-sky-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/40 group backdrop-blur-md"
        >
          <div className="relative">
            <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sky-900 animate-pulse"></span>
          </div>
          <span>Ask IMD Weather AI</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
            Copilot
          </span>
        </button>
      )}

      {/* Frosted White Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">CloudNet AI Copilot</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Live Meteorological Intelligence Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
                title="Clear Chat History"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] scrollbar-none">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-nowrap font-medium transition-all shadow-xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sky-600/10 rounded-br-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}
                >
                  <FormattedMessage text={msg.text} isUser={msg.sender === 'user'} />

                  {/* Interactive Action Button (if attached) */}
                  {msg.suggestedAction && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleExecuteAction(msg.suggestedAction)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 transition-all cursor-pointer shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{msg.suggestedAction.label}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-400 p-2 text-xs">
                <Bot className="w-4 h-4 text-sky-600 animate-spin" />
                <span className="font-medium animate-pulse">Analyzing meteorological telemetry...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* User Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-100 bg-white/80 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask about rainfall, storms, city weather, safety..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 glass-input px-4 py-2.5 rounded-2xl text-xs font-medium placeholder-slate-400"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
