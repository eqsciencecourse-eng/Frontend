'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Bell, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:30 - 17:30',
    '16:30 - 18:30',
    '17:00 - 19:00',
];

interface ScheduleItem {
    day: string;
    timeSlot: string;
    subject: string;
}

export default function WeeklySchedule({ subjects }: { subjects: any[] }) {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [draggedSubject, setDraggedSubject] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchSchedule();
        }
    }, [user]);

    const fetchSchedule = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules/${user?.uid}`, {
                headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSchedule(data);
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
        }
    };

    const handleDragStart = (e: React.DragEvent, subjectName: string) => {
        if (!isEditing) return;
        setDraggedSubject(subjectName);
        e.dataTransfer.setData('text/plain', subjectName);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isEditing) return;
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, day: string, timeSlot: string) => {
        if (!isEditing) return;
        e.preventDefault();
        const subject = e.dataTransfer.getData('text/plain');

        if (subject) {
            setSchedule(prev => {
                // Remove existing for this slot if any
                const filtered = prev.filter(item => !(item.day === day && item.timeSlot === timeSlot));
                return [...filtered, { day, timeSlot, subject }];
            });
        }
        setDraggedSubject(null);
    };

    const handleRemove = (day: string, timeSlot: string) => {
        if (!isEditing) return;
        setSchedule(prev => prev.filter(item => !(item.day === day && item.timeSlot === timeSlot)));
    };

    const handleSave = async () => {
        try {
            const token = await user?.getIdToken();

            // Prepare payload
            const formattedSchedules = schedule.map(item => ({
                teacherId: user?.uid,
                teacherName: user?.displayName,
                day: item.day,
                timeSlot: item.timeSlot,
                subject: item.subject
            }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    teacherId: user?.uid,
                    schedules: formattedSchedules
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            setIsEditing(false);
            toast.success('Schedule saved successfully');
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('Failed to save schedule');
        }
    };

    const handleNotify = async (day: string) => {
        try {
            const daySchedule = schedule.filter(s => s.day === day);
            if (daySchedule.length === 0) {
                toast.error('No schedule for this day');
                return;
            }

            const token = await user?.getIdToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules/notify/${user?.uid}/${day}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ schedules: daySchedule })
            });
            toast.success(`Notification sent for ${day}`);
        } catch (error) {
            console.error('Error notifying:', error);
            toast.error('Failed to send notification');
        }
    };

    const getSubjectForSlot = (day: string, timeSlot: string) => {
        return schedule.find(s => s.day === day && s.timeSlot === timeSlot);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">Weekly Schedule</h2>
                <div className="flex gap-2">
                    {isEditing ? (
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                            <Edit className="mr-2 h-4 w-4" /> Edit Schedule
                        </Button>
                    )}
                </div>
            </div>

            {isEditing && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2 font-medium">Drag subjects to the schedule:</p>
                        <div className="flex flex-wrap gap-2">
                            {subjects.map(subject => (
                                <div
                                    key={subject._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, subject.name)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-md shadow-sm cursor-move hover:border-indigo-500 transition-colors text-sm"
                                >
                                    {subject.name}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="overflow-x-auto rounded-lg border dark:border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">Time / Day</th>
                            {DAYS.map(day => (
                                <th key={day} className="px-6 py-3 min-w-[150px]">
                                    <div className="flex justify-between items-center">
                                        {day}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleNotify(day)}
                                            title="Notify Students"
                                        >
                                            <Bell className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(timeSlot => (
                            <tr key={timeSlot} className="bg-white border-b dark:bg-slate-900 dark:border-slate-700">
                                <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    {timeSlot}
                                </th>
                                {DAYS.map(day => {
                                    const item = getSubjectForSlot(day, timeSlot);
                                    return (
                                        <td
                                            key={`${day}-${timeSlot}`}
                                            className={`px-4 py-4 border-l dark:border-slate-700 transition-colors ${isEditing ? 'hover:bg-gray-50 dark:hover:bg-slate-800' : ''
                                                } ${draggedSubject && isEditing ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, day, timeSlot)}
                                        >
                                            {item ? (
                                                <div className="relative group">
                                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded text-center font-medium">
                                                        {item.subject}
                                                    </div>
                                                    {isEditing && (
                                                        <button
                                                            onClick={() => handleRemove(day, timeSlot)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-10 border-2 border-dashed border-transparent rounded flex items-center justify-center text-gray-400 text-xs">
                                                    {isEditing ? 'Drop here' : '-'}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
