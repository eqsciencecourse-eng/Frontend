'use client';
// Force Update: 2026-02-01

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Send, Clock, User, Check, CheckCheck, Users, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp, set, off, update } from 'firebase/database';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '@/lib/api-config';

interface Message {
    id: string;
    sender: 'user' | 'admin';
    text: string;
    timestamp: number;
    read: boolean;
    userId: string;
}

interface UserConversation {
    userId: string;
    userName: string;
    messages: Message[];
    lastMessage?: Message;
    unreadCount: number;
}

export default function AdminReports() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<UserConversation[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});

    // Fetch user profiles to map IDs to Names (optional, if we have an endpoint)
    // For now, we'll try to get names from a separate fetch or just use ID if not available
    // But better to fetch all users once.
    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch(API_ENDPOINTS.USERS.LIST, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const users = await res.json();
                    const profileMap: any = {};
                    users.forEach((u: any) => {
                        profileMap[u.uid || u._id] = u; // Adjust based on your User schema
                    });
                    setUserProfiles(profileMap);
                }
            } catch (e) {
                console.error("Failed to fetch profiles", e);
            }
        }
        fetchUsers();
    }, [user]);

    // Listen to all messages
    useEffect(() => {
        const messagesRef = ref(db, 'messages');
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const convs: UserConversation[] = Object.entries(data).map(([userId, msgs]: [string, any]) => {
                    const messageList: Message[] = Object.entries(msgs).map(([mid, m]: [string, any]) => ({
                        id: mid,
                        ...m,
                        userId // Ensure userId is in message
                    })).sort((a, b) => a.timestamp - b.timestamp);

                    const lastMsg = messageList[messageList.length - 1];
                    const unread = messageList.filter(m => m.sender === 'user' && !m.read).length;

                    return {
                        userId,
                        userName: userProfiles[userId]?.name || userProfiles[userId]?.username || userId.substring(0, 6) + '...', // Fallback
                        messages: messageList,
                        lastMessage: lastMsg,
                        unreadCount: unread
                    };
                });

                // Sort conversations by last message timestamp
                setConversations(convs.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)));
            } else {
                setConversations([]);
            }
        });

        return () => off(messagesRef);
    }, [userProfiles]);

    // Mark as read when selecting
    useEffect(() => {
        if (selectedUserId && conversations.length > 0) {
            const conv = conversations.find(c => c.userId === selectedUserId);
            if (conv) {
                conv.messages.forEach(msg => {
                    if (msg.sender === 'user' && !msg.read) {
                        const msgRef = ref(db, `messages/${selectedUserId}/${msg.id}`);
                        update(msgRef, { read: true });
                    }
                });
            }
        }
    }, [selectedUserId, conversations]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedUserId, conversations]);


    const handleSendMessage = async () => {
        if (!replyText.trim() || !selectedUserId) return;

        try {
            const messagesRef = ref(db, `messages/${selectedUserId}`);
            await push(messagesRef, {
                sender: 'admin',
                text: replyText,
                timestamp: serverTimestamp(),
                read: false,
                userId: selectedUserId
            });
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    const filteredConversations = useMemo(() => {
        if (!searchTerm) return conversations;
        const lower = searchTerm.toLowerCase();
        return conversations.filter(c =>
            c.userName.toLowerCase().includes(lower) ||
            c.userId.toLowerCase().includes(lower)
        );
    }, [conversations, searchTerm]);

    const selectedConv = conversations.find(c => c.userId === selectedUserId);

    // Get name from profile map safely
    const getUserName = (uid: string) => {
        return userProfiles[uid]?.name || userProfiles[uid]?.username || 'User';
    }

    const getSelectedUserProfile = () => {
        if (!selectedUserId) return null;
        return userProfiles[selectedUserId];
    };

    const selectedProfile = getSelectedUserProfile();

    return (
        <Card className="h-[800px] flex flex-col dark:bg-slate-800 dark:border-slate-700 overflow-hidden shadow-xl border-0 rounded-none">
            <CardHeader className="py-4 px-6 border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardTitle className="dark:text-white flex items-center gap-2 text-blue-600">
                    <MessageSquare className="h-5 w-5" />
                    ระบบแชทผู้ดูแลระบบ
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
                {/* 1. Conversations Sidebar */}
                <div className="w-1/4 min-w-[250px] border-r dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800/50">
                    <div className="p-3 border-b dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="ค้นหาผู้ใช้..."
                                className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="flex flex-col">
                            {filteredConversations.map(conv => (
                                <button
                                    key={conv.userId}
                                    onClick={() => setSelectedUserId(conv.userId)}
                                    className={cn(
                                        "p-4 text-left transition-all border-b border-slate-50 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3",
                                        selectedUserId === conv.userId ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500" : "border-l-4 border-l-transparent"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 border border-slate-100">
                                        <AvatarFallback className={cn(
                                            "font-medium",
                                            selectedUserId === conv.userId ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {getUserName(conv.userId).substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <p className={cn("font-medium text-sm truncate", selectedUserId === conv.userId ? "text-blue-900" : "text-slate-700")}>
                                                {getUserName(conv.userId)}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="flex h-5 w-5 items-center justify-center rounded-none bg-orange-500 text-[10px] font-bold text-white shadow-sm">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate font-light">
                                            {conv.lastMessage?.sender === 'admin' && <span className="text-blue-500">คุณ: </span>}
                                            {conv.lastMessage?.text || 'ไม่มีข้อความ'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* 2. Chat Area */}
                <div className="flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900 border-r dark:border-slate-700">
                    {selectedUserId ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b dark:border-slate-700 flex items-center gap-3 bg-white dark:bg-slate-800 shadow-sm z-10">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white">
                                        {getUserName(selectedUserId).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">
                                        {getUserName(selectedUserId)}
                                    </h3>
                                    <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                        <span className="w-2 h-2 rounded-none bg-green-500 animate-pulse"></span>
                                        ผู้ใช้ที่ใช้งานอยู่
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-4">
                                    {selectedConv?.messages.map((msg) => {
                                        const isAdmin = msg.sender === 'admin';
                                        return (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex w-full",
                                                    isAdmin ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div className={cn("flex flex-col max-w-[75%]", isAdmin ? "items-end" : "items-start")}>
                                                    <div
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-none text-sm shadow-sm relative leading-relaxed",
                                                            isAdmin
                                                                ? "bg-blue-600 text-white rounded-tr-none"
                                                                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                                        )}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1 px-1">
                                                        <span className="text-[10px] text-slate-400">
                                                            {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : '...'}
                                                        </span>
                                                        {isAdmin && (
                                                            msg.read ? <CheckCheck className="h-3 w-3 text-blue-500" /> : <Check className="h-3 w-3 text-slate-300" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            {/* Message Input */}
                            <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700">
                                <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-none border border-slate-200">
                                    <Input
                                        placeholder="พิมพ์ข้อความตอบกลับ..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!replyText.trim()}
                                        size="icon"
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-none shadow-sm transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-slate-300 p-8 bg-slate-50/50">
                            <div className="bg-white p-6 rounded-none mb-4 shadow-sm">
                                <MessageSquare className="h-12 w-12 text-slate-200" />
                            </div>
                            <p className="text-lg font-medium text-slate-500">เลือกการสนทนา</p>
                            <p className="text-sm">เลือกผู้ใช้จากรายการเพื่อเริ่มการแชท</p>
                        </div>
                    )}
                </div>

                {/* 3. User Profile Panel (Right Side) */}
                {selectedUserId && selectedProfile && (
                    <div className="w-1/4 min-w-[280px] bg-white dark:bg-slate-800 border-l dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="p-6 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center text-center">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-md mb-3">
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold">
                                    {selectedProfile.displayName?.substring(0, 1).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{selectedProfile.displayName}</h3>
                            <p className="text-sm text-slate-500">{selectedProfile.email}</p>
                            <Badge className="mt-2 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200">
                                {selectedProfile.role || 'นักเรียน'}
                            </Badge>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-6">
                                {/* Personal Info */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">ข้อมูลส่วนตัว</h4>
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-none border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="text-xs text-slate-500">ชื่อจริง</span>
                                            </div>
                                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                                                {selectedProfile.studentName || '-'}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-none border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-3.5 w-3.5 text-green-500" />
                                                <span className="text-xs text-slate-500">ชื่อผู้ปกครอง</span>
                                            </div>
                                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                                                {selectedProfile.parentName || '-'}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-none border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-1">
                                                <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
                                                <span className="text-xs text-slate-500">ระดับการศึกษา</span>
                                            </div>
                                            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                                                {selectedProfile.educationLevel || selectedProfile.studentClass || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">ข้อมูลวิชาการ</h4>

                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-none border border-slate-100 dark:border-slate-700">
                                            <span className="text-xs text-slate-500 block mb-2">วิชาที่ลงทะเบียน</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedProfile.registeredClasses && selectedProfile.registeredClasses.length > 0 ? (
                                                    selectedProfile.registeredClasses.map((c: any, i: number) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-600">
                                                            {c.className}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">ไม่มีวิชาที่ลงทะเบียน</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-none border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="h-3.5 w-3.5 text-purple-500" />
                                                <span className="text-xs text-slate-500">วันที่สมัคร</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {selectedProfile.createdAt ? format(new Date(selectedProfile.createdAt), 'dd MMMM yyyy') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
