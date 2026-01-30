import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, ChevronRight, Clock, Check, X, Clock8 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Student {
    _id: string;
    studentName?: string;
    displayName?: string;
    studentClass?: string;
    email?: string;
    photoURL?: string;
    studyTime?: string;
    currentLevel?: string; // Prop from Grade
}

interface StudentRatingCardProps {
    student: Student;
    subject?: any; // To access subject.levels
    isSelected: boolean;
    attendanceStatus?: string;
    onSelect: () => void;
    onClick: () => void;
    onLevelChange?: (level: string) => void;
    onAttendanceChange?: (status: string) => void;
}

export default function StudentRatingCard({
    student,
    subject,
    isSelected,
    attendanceStatus,
    onSelect,
    onClick,
    onLevelChange,
    onAttendanceChange
}: StudentRatingCardProps) {



    return (
        <div
            className={`
                group relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer space-y-3
                ${isSelected
                    ? 'bg-indigo-50 border-indigo-200'
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                }
            `}
            onClick={(e) => {
                // Prevent creating loops if clicking controls
                if ((e.target as any).closest('.no-click-propagate')) return;
                onClick();
            }}
        >
            {/* Selection Indicator */}
            <div
                className={`
                    absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors
                    ${isSelected ? 'bg-indigo-600' : 'bg-transparent group-hover:bg-indigo-600/20'}
                `}
            />

            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                    {student.photoURL ? (
                        <img src={student.photoURL} alt={student.displayName || 'Student'} className="h-full w-full object-cover" />
                    ) : (
                        <User className="h-6 w-6 text-slate-400" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                            {student.studentName || student.displayName}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        {student.studentClass && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600 font-normal border border-slate-200">
                                {student.studentClass}
                            </Badge>
                        )}
                        {student.studyTime && (
                            <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md border border-orange-100">
                                <Clock className="w-3 h-3" />
                                <span>{student.studyTime}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expand Icon */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Controls Row (Level & Attendance) */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 no-click-propagate">
                {/* Level Display (Read-Only) */}
                <div className="flex-1 max-w-[140px]">
                    {student.currentLevel && student.currentLevel !== 'Unrated' && (
                        <div className="h-8 w-fit px-3 rounded-md border border-indigo-100 bg-indigo-50/50 flex items-center text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                            {student.currentLevel}
                        </div>
                    )}
                </div>

                {/* Attendance Buttons (Compact) */}

            </div>
        </div>
    );
}
