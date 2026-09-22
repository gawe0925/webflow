import { useState } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { PatientTask } from '../types';
import { PaymentRecord } from '../services/patientService';
import { analyzeDispensaryData } from '../services/aiService';

interface Props {
    tasks: PatientTask[];
    paymentRecords: PaymentRecord[];
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export default function AIAssistantModal({ tasks, paymentRecords }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            sender: 'ai',
            text: "Hi! I'm Artie, your dispensary AI assistant.\nAsk me anything about current tasks or pending payments!"
        }
    ]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputPrompt.trim() || loading) return;

        const userQuery = inputPrompt.trim();
        setInputPrompt('');

        setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
        setLoading(true);

        try {
            const responseText = await analyzeDispensaryData(tasks, paymentRecords as any, userQuery);
            setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: '⚠️ Query failed. Please verify your Gemini API Key configuration and try again.'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/[0.03] transition-all">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-zinc-100/80 rounded-xl border border-zinc-200/60 shadow-inner">
                        <img
                            src="https://img.icons8.com/?size=100&id=POBc2SrrhhnF&format=png&color=000000"
                            alt="AI Icon"
                            className="w-5 h-5 object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-xs font-bold tracking-wide text-zinc-800">Dispensary AI Assistant</h1>
                    </div>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
                >
                    {isOpen ? 'Collapse' : 'Ask Artie'}
                </button>
            </div>

            {/* Expanded Chatbot Area */}
            {isOpen && (
                <div className="mt-3 pt-3 border-t border-zinc-200/60 space-y-2.5">
                    {/* Messages Container */}
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.sender === 'ai' && (
                                    <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 mt-0.5 shadow-2xs">
                                        <Bot className="w-3 h-3 text-zinc-600" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed ${msg.sender === 'user'
                                        ? 'bg-zinc-800 text-white rounded-tr-none shadow-sm'
                                        : 'bg-zinc-100/80 border border-zinc-200/60 text-zinc-800 rounded-tl-none font-normal'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                {msg.sender === 'user' && (
                                    <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 mt-0.5">
                                        <User className="w-3 h-3 text-zinc-200" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2 items-center text-zinc-500 text-xs pl-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                                <span>AI is processing your query...</span>
                            </div>
                        )}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
                        <input
                            type="text"
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                            placeholder="Ask Artie"
                            className="flex-1 bg-zinc-50/80 border border-zinc-200/80 rounded-xl px-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputPrompt.trim()}
                            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        >
                            <Send className="w-3 h-3" />
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}