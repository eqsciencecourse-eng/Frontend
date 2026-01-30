import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen } from 'lucide-react';

interface ScheduleViewProps {
    user: any;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = [
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:30 - 17:30',
    '16:30 - 18:30',
    '17:00 - 19:00',
];

// Color mapping for subjects (mock)
const SUBJECT_COLORS: Record<string, string> = {
    'Scratch': 'bg-orange-100 text-orange-700 border-orange-200',
    'Python': 'bg-blue-100 text-blue-700 border-blue-200',
    'Web Design': 'bg-purple-100 text-purple-700 border-purple-200',
    'Robotics': 'bg-red-100 text-red-700 border-red-200',
    'default': 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function ScheduleView({ user }: ScheduleViewProps) {
    const studyTimes = user.studyTimes || [];
    const subjects = user.enrolledSubjects || [];

    const getSubjectColor = (subject: string) => {
        return SUBJECT_COLORS[subject] || SUBJECT_COLORS['default'];
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="md:col-span-3 border-none shadow-md bg-white dark:bg-slate-800 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 dark:text-white">
                            <Calendar className="h-5 w-5 text-orange-500" />
                            ตารางเรียน (Class Schedule)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px]">
                                {/* Header Days */}
                                <div className="grid grid-cols-8 gap-2 mb-4">
                                    <div className="text-center font-medium text-gray-400 text-sm py-2">Time</div>
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Time Slots */}
                                {TIME_SLOTS.map((slot) => {
                                    const isSelected = studyTimes.includes(slot);
                                    return (
                                        <div key={slot} className="grid grid-cols-8 gap-2 mb-2">
                                            <div className="flex items-center justify-center text-xs text-gray-500 font-medium">
                                                {slot}
                                            </div>
                                            {DAYS.map(day => (
                                                <div
                                                    key={`${day}-${slot}`}
                                                    className={`
                                                        h-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all
                                                        ${isSelected
                                                            ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 shadow-sm'
                                                            : 'bg-white border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 opacity-50'
                                                        }
                                                    `}
                                                >
                                                    {isSelected && (
                                                        <>
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 mb-1" />
                                                            <span className="text-[10px] text-orange-700 dark:text-orange-300 font-medium text-center leading-tight">
                                                                Class
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white dark:bg-slate-800 rounded-2xl h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 dark:text-white">
                            <BookOpen className="h-5 w-5 text-blue-500" />
                            วิชาที่ลงทะเบียน
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {subjects.length > 0 ? (
                            subjects.map((subject: string, index: number) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-xl border ${getSubjectColor(subject)} flex items-center justify-between`}
                                >
                                    <span className="font-medium text-sm">{subject}</span>
                                    <Badge variant="secondary" className="bg-white/50 text-xs">
                                        Enrolled
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p>ยังไม่ได้ลงทะเบียนวิชา</p>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                เวลาเรียน
                            </h4>
                            {studyTimes.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {studyTimes.map((time: string, i: number) => (
                                        <Badge key={i} variant="outline" className="bg-slate-50 dark:bg-slate-900">
                                            {time}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">ยังไม่ได้เลือกเวลาเรียน</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
