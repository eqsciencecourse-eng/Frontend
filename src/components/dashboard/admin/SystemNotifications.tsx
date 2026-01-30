'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, UserPlus, Clock } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { toast } from 'sonner';

interface User {
    _id: string;
    displayName: string;
    email: string;
    studentName?: string; // Added studentName
    role: string;
    createdAt: string;
    registeredCourses?: {
        subject: string;
        endDate: string;
        totalSessions?: number;
        usedSessions?: number;
        extensionHistory?: {
            extendedAt: string;
            newEndDate: string;
        }[];
    }[];
}

interface NotificationItem {
    id: string;
    type: 'new_registration' | 'course_expiring' | 'course_expired' | 'course_extended' | 'quota_exhausted';
    message: string;
    note: string;
    date: Date;
    link?: string;
}

export default function SystemNotifications() {
    const { user: currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    useEffect(() => {
        if (filterType === 'all') {
            setFilteredNotifications(notifications);
        } else {
            setFilteredNotifications(notifications.filter(n => n.type === filterType));
        }
    }, [filterType, notifications]);

    const fetchData = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.USERS, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const users: User[] = await res.json();
                generateNotifications(users);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const generateNotifications = (users: User[]) => {
        const notifs: NotificationItem[] = [];
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        users.forEach(u => {
            // 1. New Registration (if within last 30 days)
            const createdAt = new Date(u.createdAt);
            const diffTime = Math.abs(today.getTime() - createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30 && u.role === 'student') {
                const firstCourse = u.registeredCourses?.[0];
                const courseInfo = firstCourse?.subject
                    ? `สมัครวิชา ${firstCourse.subject}${firstCourse.totalSessions ? ` (${firstCourse.totalSessions} คาบ)` : ''}`
                    : 'ยังไม่สมัครวิชา';

                const emailDisplay = u.email && !u.email.startsWith('no-email') ? ` (${u.email})` : '';

                notifs.push({
                    id: `reg-${u._id}`,
                    type: 'new_registration',
                    message: `ผู้ใช้งานใหม่: ${u.studentName || u.displayName || 'ไม่ระบุชื่อ'}${emailDisplay}`,
                    note: `${courseInfo} - เมื่อ ${createdAt.toLocaleDateString('th-TH')}`,
                    date: createdAt
                });
            }

            // 2. Course Expiry
            if (u.registeredCourses) {
                u.registeredCourses.forEach((c, idx) => {
                    if (!c.endDate) return;
                    const endDate = new Date(c.endDate);

                    // Allow some buffer for "Expired recently" (e.g. 7 days ago)
                    const diffTimeExpiry = endDate.getTime() - today.getTime();
                    const diffDaysExpiry = Math.ceil(diffTimeExpiry / (1000 * 60 * 60 * 24));

                    if (diffDaysExpiry < 0 && diffDaysExpiry > -30) {
                        notifs.push({
                            id: `exp-${u._id}-${idx}`,
                            type: 'course_expired',
                            message: `คอร์สหมดอายุ: ${c.subject} (${u.studentName || u.displayName})`,
                            note: `หมดอายุเมื่อ ${endDate.toLocaleDateString('th-TH')}`,
                            date: endDate
                        });
                    } else if (diffDaysExpiry >= 0 && diffDaysExpiry <= 7) {
                        notifs.push({
                            id: `warn-${u._id}-${idx}`,
                            type: 'course_expiring',
                            message: `คอร์สกำลังจะหมดอายุ: ${c.subject} (${u.studentName || u.displayName})`,
                            note: `เหลืออีก ${diffDaysExpiry} วัน (${endDate.toLocaleDateString('th-TH')})`,
                            date: today
                        });
                    }
                    // 3. Course Extension History
                    if (c.extensionHistory) {
                        c.extensionHistory.forEach((ext, extIdx) => {
                            const extendedAt = new Date(ext.extendedAt);
                            // Show if extended within last 30 days
                            const diffTimeExt = Math.abs(today.getTime() - extendedAt.getTime());
                            const diffDaysExt = Math.ceil(diffTimeExt / (1000 * 60 * 60 * 24));

                            if (diffDaysExt <= 30) {
                                notifs.push({
                                    id: `ext-${u._id}-${idx}-${extIdx}`,
                                    type: 'course_extended',
                                    message: `มีการต่ออายุคอร์ส: ${c.subject} (${u.studentName || u.displayName})`,
                                    note: `สิ้นสุดใหม่ ${new Date(ext.newEndDate).toLocaleDateString('th-TH')}`,
                                    date: extendedAt
                                });
                            }
                        });
                    }

                    // 4. Quota Exhaustion
                    if (c.totalSessions !== undefined && c.totalSessions > 0 && (c.usedSessions || 0) >= c.totalSessions) {
                        notifs.push({
                            id: `quota-${u._id}-${idx}`,
                            type: 'quota_exhausted',
                            message: `โควต้าหมด: ${c.subject} (${u.studentName || u.displayName})`,
                            note: `ใช้ไป ${c.usedSessions}/${c.totalSessions} ครั้ง`,
                            date: today
                        });
                    }
                });
            }
        });

        // Sort by date desc
        notifs.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(notifs);
        setFilteredNotifications(notifs);
    };

    const getBadge = (type: string) => {
        switch (type) {
            case 'new_registration':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-none flex items-center gap-1"><UserPlus className="w-3 h-3" /> ผู้ใช้ใหม่</Badge>;
            case 'course_expiring':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-none flex items-center gap-1"><Clock className="w-3 h-3" /> ใกล้หมดอายุ</Badge>;
            case 'course_expired':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-none flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> หมดอายุแล้ว</Badge>;
            case 'course_extended':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-none flex items-center gap-1"><Clock className="w-3 h-3" /> ต่ออายุแล้ว</Badge>;
            case 'quota_exhausted':
                return <Badge variant="outline" className="bg-red-600 text-white border-red-700 rounded-none flex items-center gap-1 shadow-sm"><AlertTriangle className="w-3 h-3" /> โควต้าหมด</Badge>;
            default:
                return <Badge variant="outline">แจ้งเตือน</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border border-slate-200 rounded-none">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
                                <Bell className="h-5 w-5 text-indigo-600" />
                                การแจ้งเตือนระบบ (System Notifications)
                            </CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="text-sm border border-slate-200 rounded-none p-1 focus:outline-none"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="new_registration">ผู้ใช้ใหม่</option>
                                <option value="course_expiring">ใกล้หมดอายุ</option>
                                <option value="course_expired">หมดอายุแล้ว</option>
                                <option value="quota_exhausted">โควต้าหมด</option>
                                <option value="course_extended">ต่ออายุแล้ว</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 w-[150px]">วันที่</th>
                                    <th className="px-6 py-3">ข้อความแจ้งเตือน</th>
                                    <th className="px-6 py-3">หมายเหตุ</th>
                                    <th className="px-6 py-3 w-[150px]">ประเภท</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredNotifications.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            ไม่มีการแจ้งเตือนในขณะนี้
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNotifications.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{item.date.toLocaleDateString('th-TH')}</span>
                                                    <span>{item.date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                {item.message}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {item.note}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getBadge(item.type)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
