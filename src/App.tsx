import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Loader2, Sparkles, GraduationCap, 
  BookOpen, Info, Menu, X, Plus, History, Settings, 
  ChevronRight, LayoutDashboard, MessageSquare, Share2, LogIn, LogOut
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sendMessageStream, Message } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SHARED_APP_URL = "https://ais-pre-fkin2kyfxj3lvy6h6coau5-273202223843.asia-east1.run.app";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "আসসালামু আলাইকুম! আমি তোমার SSC Vocational 2026 গাইড AI। তোমাকে তোমার পরীক্ষার প্রস্তুতিতে সাহায্য করার জন্য আমি এখানে আছি। তুমি কি কোনো নির্দিষ্ট বিষয় নিয়ে জানতে চাও?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth & History Sync
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          fetchHistory();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const history = await res.json();
          if (history.length > 0) {
            setMessages(history);
          }
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };

    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=500,height=600');
    } catch (err) {
      console.error("Failed to get auth URL:", err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMessages([{
      role: 'model',
      text: "আসসালামু আলাইকুম! আমি তোমার SSC Vocational 2026 গাইড AI। তোমাকে তোমার পরীক্ষার প্রস্তুতিতে সাহায্য করার জন্য আমি এখানে আছি। তুমি কি কোনো নির্দিষ্ট বিষয় নিয়ে জানতে চাও?"
    }]);
  };

  const saveMessage = async (role: string, text: string) => {
    if (!user) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, text })
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(SHARED_APP_URL);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    if (user) saveMessage('user', userMessage);

    try {
      let currentResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '', isThinking: true }]);
      
      const stream = sendMessageStream(userMessage, messages);
      
      for await (const chunk of stream) {
        currentResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'model') {
            last.text = currentResponse;
            last.isThinking = false;
          }
          return updated;
        });
      }
      if (user) saveMessage('model', currentResponse);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: "দুঃখিত, কোনো সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করো।" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async () => {
    if (user) {
      await fetch('/api/messages', { method: 'DELETE' });
    }
    setMessages([{
      role: 'model',
      text: "আসসালামু আলাইকুম! আমি তোমার SSC Vocational 2026 গাইড AI। তোমাকে তোমার পরীক্ষার প্রস্তুতিতে সাহায্য করার জন্য আমি এখানে আছি। তুমি কি কোনো নির্দিষ্ট বিষয় নিয়ে জানতে চাও?"
    }]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 z-50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-600">
            <GraduationCap className="w-6 h-6" />
            <span className="tracking-tight">SSC Guide 2026</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <SidebarItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
          <SidebarItem icon={<MessageSquare className="w-4 h-4" />} label="Active Chat" active />
          <SidebarItem icon={<History className="w-4 h-4" />} label="History" />
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Resources</div>
          <SidebarItem icon={<BookOpen className="w-4 h-4" />} label="Syllabus 2026" />
          <SidebarItem icon={<Info className="w-4 h-4" />} label="Exam Guidelines" />
        </nav>

        <div className="p-4 border-t border-zinc-100 space-y-2">
          {user ? (
            <div className="flex items-center gap-3 p-2 bg-zinc-50 rounded-xl border border-zinc-100 mb-2">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-zinc-200" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 transition-all shadow-sm mb-2"
            >
              <LogIn className="w-4 h-4" />
              Login with Google
            </button>
          )}
          <button 
            onClick={handleShare}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-all border border-indigo-100 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Share with Friends
          </button>
          <SidebarItem icon={<Settings className="w-4 h-4" />} label="Settings" />
        </div>
      </aside>

      {/* Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          Link Copied to Clipboard! 🚀
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-zinc-400">
              <span className="text-xs font-medium">Sessions</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-xs font-semibold text-zinc-900">Current Session</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 border border-zinc-200"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "group relative max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl text-sm leading-relaxed transition-all",
                  msg.role === 'user' 
                    ? "bg-zinc-900 text-zinc-100 rounded-tr-none shadow-md" 
                    : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none shadow-sm hover:shadow-md"
                )}>
                  {msg.isThinking ? (
                    <div className="flex items-center gap-3 text-zinc-400 py-1">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></span>
                      </div>
                      <span className="text-xs font-medium italic">Thinking...</span>
                    </div>
                  ) : (
                    <div className="markdown-body prose prose-zinc max-w-none prose-sm">
                      <Markdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.text}
                      </Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white border border-zinc-200 rounded-2xl shadow-lg overflow-hidden focus-within:border-indigo-500 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about SSC Vocational 2026..."
                  className="flex-1 pl-5 pr-14 py-4 bg-transparent outline-none text-sm placeholder:text-zinc-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start overflow-x-auto pb-2 scrollbar-none">
              <SuggestionChip 
                icon={<BookOpen className="w-3.5 h-3.5" />} 
                text="Syllabus 2026" 
                onClick={() => setInput("SSC Vocational 2026 এর সিলেবাস সম্পর্কে বিস্তারিত বলো।")}
              />
              <SuggestionChip 
                icon={<Sparkles className="w-3.5 h-3.5" />} 
                text="Study Routine" 
                onClick={() => setInput("আমাকে পরীক্ষার জন্য একটি প্রফেশনাল পড়ার রুটিন তৈরি করে দাও।")}
              />
              <SuggestionChip 
                icon={<GraduationCap className="w-3.5 h-3.5" />} 
                text="Math Formula" 
                onClick={() => setInput("বৃত্তের ক্ষেত্রফল এবং পরিধির সূত্রগুলো ব্যাখ্যা করো।")}
              />
            </div>
            <p className="text-[10px] text-center text-zinc-400 mt-4 font-medium">
              AI-generated content may be inaccurate. Verify with official Bangladesh Technical Education Board (BTEB) notices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
      active 
        ? "bg-indigo-50 text-indigo-700 shadow-sm" 
        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
    )}>
      {icon}
      {label}
    </button>
  );
}

function SuggestionChip({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-all border border-zinc-200 shadow-sm hover:shadow active:scale-95 shrink-0"
    >
      <span className="text-indigo-500">{icon}</span>
      {text}
    </button>
  );
}
