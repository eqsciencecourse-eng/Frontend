'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Mail, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

interface Report {
    _id: string;
    message: string;
    status: string;
    adminReply?: string;
    repliedAt?: string;
    read?: boolean; // We might need to add this to the backend schema later, for now we'll use local state or assume unread if status is resolved? 
    // Actually, user requirement says "when admin replies, show red badge".
    // We can check if status is 'resolved' and maybe store 'lastReadTime' in local storage to determine 'new' replies?
    // Or simpler: just show all resolved reports with replies.
}

export default function NotificationMailbox() {
    const { user } = useAuth();
    const { notifications } = useRealtime();
    const [reports, setReports] = useState<Report[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchReports = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_URL}/reports/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter for reports that have an admin reply
                const repliedReports = data.filter((r: Report) => r.adminReply);
                setReports(repliedReports);

                // Simple logic for now: count all replied reports as "unread" until opened? 
                // Or better: check against a stored "lastChecked" timestamp.
                const lastChecked = localStorage.getItem('mailboxLastChecked');
                if (lastChecked) {
                    const newReports = repliedReports.filter((r: Report) => new Date(r.repliedAt!).getTime() > new Date(lastChecked).getTime());
                    setUnreadCount(newReports.length);
                } else {
                    setUnreadCount(repliedReports.length);
                }
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [user, notifications]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            // Mark as read (update timestamp)
            localStorage.setItem('mailboxLastChecked', new Date().toISOString());
            setUnreadCount(0);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-full h-10 w-10 border-gray-200">
                    <Mail className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b bg-slate-50">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-500" />
                        Admin Replies
                    </h4>
                </div>
                <ScrollArea className="h-[300px]">
                    {reports.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No messages from admin yet.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {reports.map((report) => (
                                <div key={report._id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="mb-2">
                                        <p className="text-xs text-gray-500 mb-1">You asked:</p>
                                        <p className="text-sm text-gray-700 line-clamp-2 bg-gray-100 p-2 rounded">
                                            {report.message}
                                        </p>
                                    </div>
                                    <div className="pl-2 border-l-2 border-indigo-500">
                                        <p className="text-xs font-semibold text-indigo-600 mb-1">Admin replied:</p>
                                        <p className="text-sm text-gray-900">
                                            {report.adminReply}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2 text-right">
                                            {new Date(report.repliedAt!).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
