'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquarePlus, Send, UserCog, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, push, onValue, serverTimestamp, off, set } from 'firebase/database';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
    id: string;
    sender: 'user' | 'admin';
    text: string;
    timestamp: number;
    read: boolean;
}

export default function ContactAdmin() {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user || !open) return;

        const messagesRef = ref(db, `messages/${user.uid}`);

        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedMessages: Message[] = Object.entries(data).map(([key, value]: [string, any]) => ({
                    id: key,
                    ...value,
                }));
                // Sort by timestamp
                loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(loadedMessages);
            } else {
                setMessages([]);
            }
            setLoading(false);
        });

        return () => {
            off(messagesRef); // Clean up listener
        };
    }, [user, open]);

    // Separate listener for unread count (always active)
    useEffect(() => {
        if (!user) return;
        const messagesRef = ref(db, `messages/${user.uid}`);

        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                let count = 0;
                Object.values(data).forEach((msg: any) => {
                    if (msg.sender === 'admin' && !msg.read) {
                        count++;
                    }
                });
                setUnreadCount(count);
            } else {
                setUnreadCount(0);
            }
        });

        return () => off(messagesRef);
    }, [user]);

    // Mark messages as read when opening dialog
    useEffect(() => {
        if (open && user && messages.length > 0) {
            messages.forEach(msg => {
                if (msg.sender === 'admin' && !msg.read) {
                    const msgRef = ref(db, `messages/${user.uid}/${msg.id}/read`);
                    set(msgRef, true);
                }
            });
        }
    }, [open, user, messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);


    const handleSendMessage = async () => {
        if (!message.trim() || !user) return;

        try {
            const messagesRef = ref(db, `messages/${user.uid}`);
            await push(messagesRef, {
                sender: 'user',
                text: message,
                timestamp: serverTimestamp(),
                read: false,
                userId: user.uid
            });
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="relative inline-block">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-10 w-10 border-green-100 hover:bg-green-50 hover:text-green-600 transition-colors shadow-sm"
                    >
                        <UserCog className="h-5 w-5 text-green-600" />
                    </Button>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white border-none shadow-2xl rounded-[16px]">
                <DialogHeader className="p-4 bg-gradient-to-r from-green-500 to-blue-500 text-white">
                    <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                        <MessageSquarePlus className="h-5 w-5 text-white/90" />
                        ติดต่อผู้ดูแลระบบ (Contact Admin)
                    </DialogTitle>
                    <p className="text-xs text-indigo-100 mt-1 font-light">
                        สอบถามปัญหา หรือแจ้งข้อมูลเพิ่มเติมได้ที่นี่
                    </p>
                </DialogHeader>

                <div className="h-[400px] flex flex-col bg-slate-50">
                    <ScrollArea className="flex-1 p-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 mt-10">
                                <div className="bg-white p-4 rounded-full shadow-sm">
                                    <MessageSquarePlus className="h-8 w-8 text-green-200" />
                                </div>
                                <p className="text-sm font-light">ยังไม่มีข้อความ เริ่มต้นสนทนาได้เลย</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {messages.map((msg) => {
                                    const isAdmin = msg.sender === 'admin';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-full",
                                                isAdmin ? "justify-start" : "justify-end"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm relative group mb-1",
                                                    isAdmin
                                                        ? "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                        : "bg-blue-500 text-white rounded-tr-none"
                                                )}
                                            >
                                                <p className="leading-relaxed">{msg.text}</p>
                                                <p className={cn(
                                                    "text-[10px] mt-1 opacity-70 flex items-center gap-1",
                                                    isAdmin ? "text-slate-400" : "text-blue-100"
                                                )}>
                                                    {msg.timestamp ? format(new Date(msg.timestamp), 'dd/MM/yy HH:mm') : 'Sending...'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
                        <Input
                            placeholder="พิมพ์ข้อความของคุณ..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 text-slate-700 rounded-xl"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!message.trim()}
                            size="icon"
                            className="h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
