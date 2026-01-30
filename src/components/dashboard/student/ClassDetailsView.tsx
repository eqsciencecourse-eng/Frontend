import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Clock, Edit2, Save, BookOpen, Plus, Search, ChevronLeft, Check, CheckCircle2, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ClassDetailsViewProps {
    user: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const API_ENDPOINTS = {
    CLASSES: {
        LIST: `${API_URL}/api/classes`,
        REQUESTS: `${API_URL}/api/classes/requests`
    },
    USERS: {
        UPDATE_PROFILE: `${API_URL}/api/users/update-profile`
    }
};

// Start from 10:00 to 20:00 with 30-minute intervals
const START_TIMES = (() => {
    const times = [];
    for (let h = 10; h <= 21; h++) {
        const hour = h.toString().padStart(2, '0');
        times.push(`${hour}:00`);
        if (h !== 21) {
            times.push(`${hour}:30`);
        }
    }
    return times;
})();

// Updated to use Thai values directly as requested
const DAYS = [
    { value: 'วันจันทร์', label: 'วันจันทร์ (Monday)' },
    { value: 'วันอังคาร', label: 'วันอังคาร (Tuesday)' },
    { value: 'วันพุธ', label: 'วันพุธ (Wednesday)' },
    { value: 'วันพฤหัสบดี', label: 'วันพฤหัสบดี (Thursday)' },
    { value: 'วันศุกร์', label: 'วันศุกร์ (Friday)' },
    { value: 'วันเสาร์', label: 'วันเสาร์ (Saturday)' },
    { value: 'วันอาทิตย์', label: 'วันอาทิตย์ (Sunday)' },
];

export default function ClassDetailsView({ user }: ClassDetailsViewProps) {
    const { t } = useLanguage();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<any>(null);

    // Edit Time State
    const [selectedDay, setSelectedDay] = useState('วันเสาร์');
    const [selectedStart, setSelectedStart] = useState('10:00');
    // Removed isManual state

    // Add Class State
    const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [searchClass, setSearchClass] = useState('');
    const [addingClass, setAddingClass] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedTimeForAdd, setSelectedTimeForAdd] = useState<string>('');

    // New State for Structured Form
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [parentPhone, setParentPhone] = useState('');

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await fetch(`${API_URL}/api/subjects`);
                if (res.ok) {
                    setSubjects(await res.json());
                }
            } catch (error) {
                console.error('Error fetching subjects:', error);
            }
        };
        fetchSubjects();
    }, []);

    const toggleSubject = (name: string) => {
        setSelectedSubjects(prev =>
            prev.includes(name)
                ? prev.filter(s => s !== name)
                : [...prev, name]
        );
    };

    useEffect(() => {
        if (user) {
            fetchClasses();
        }
    }, [user]);

    const fetchClasses = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.registeredClasses && data.registeredClasses.length > 0) {
                    setClasses(data.registeredClasses);
                } else if (data.enrolledSubjects && data.enrolledSubjects.length > 0) {
                    const initialClasses = data.enrolledSubjects.map((subject: string, index: number) => ({
                        className: subject,
                        classTime: data.studyTimes?.[index] || ''
                    }));
                    setClasses(initialClasses);
                } else {
                    setClasses([]);
                }
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableClasses = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.CLASSES.LIST, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setAvailableClasses(await res.json());
            }
        } catch (error) {
            console.error('Error fetching available classes:', error);
        }
    };

    useEffect(() => {
        if (isAddClassModalOpen) {
            setStep(1);
            setSelectedSubjects([]);
            setSelectedTimeForAdd('');
            setParentPhone('');
            setSearchClass('');
        }
    }, [isAddClassModalOpen]);

    const handleEditClick = (cls: any, index: number) => {
        setEditingClass({ ...cls, index });

        // Attempt to parse existing time
        const existingTime = cls.classTime || '';
        const parts = existingTime.split(' ');

        // Check if first part is a known Day (Thai or English fallback or legacy)
        // We now prioritize Thai. 
        // Example format: "วันจันทร์ 10:00 - 12:00"

        if (parts.length >= 2) {
            const dayPart = parts[0];
            // Try to match exact value first
            if (DAYS.some(d => d.value === dayPart)) {
                setSelectedDay(dayPart);
            } else {
                // Fallback or mapping from legacy English keys if necessary
                // Mappings:
                const map: any = {
                    'Monday': 'วันจันทร์', 'Tuesday': 'วันอังคาร', 'Wednesday': 'วันพุธ',
                    'Thursday': 'วันพฤหัสบดี', 'Friday': 'วันศุกร์', 'Saturday': 'วันเสาร์', 'Sunday': 'วันอาทิตย์'
                };
                if (map[dayPart]) setSelectedDay(map[dayPart]);
                else setSelectedDay('วันเสาร์'); // Default
            }

            // Time part
            const timeRange = parts[1] || ''; // "10:00-12:00"
            const start = timeRange.split('-')[0]; // "10:00"

            const normalizedStart = start.includes(':') ? (start.length === 4 ? `0${start}` : start) : '';
            if (START_TIMES.includes(normalizedStart)) {
                setSelectedStart(normalizedStart);
            } else {
                setSelectedStart('10:00');
            }
        } else {
            // Default for new or malformed
            setSelectedDay('วันเสาร์');
            setSelectedStart('10:00');
        }

        setIsEditModalOpen(true);
    };

    const calculateEndTime = (start: string) => {
        const [hourStr, minStr] = start.split(':');
        const hour = parseInt(hourStr);
        const endHour = hour + 2;
        return `${endHour.toString().padStart(2, '0')}:${minStr}`;
    };

    const handleSaveTime = async () => {
        if (!editingClass) return;

        // No Manual option anymore. Always constructed from selections.
        const finalTime = `${selectedDay} ${selectedStart} - ${calculateEndTime(selectedStart)}`;

        try {
            const token = await user.getIdToken();

            // Send Request instead of Direct Update
            const res = await fetch(API_ENDPOINTS.CLASSES.REQUESTS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    subjectName: editingClass.className,
                    studyTime: finalTime,
                    studentName: user.displayName || user.studentName,
                    parentPhone: user.parentPhone || user.phone || '-'
                })
            });

            if (res.ok) {
                toast.success('ส่งคำขอแก้ไขเวลาเรียบร้อยแล้ว (รอการยืนยันจาก Admin)');
                setIsEditModalOpen(false);
            } else {
                console.error('Request failed');
                toast.error(t('common.error'));
            }
        } catch (error) {
            console.error('Error saving time:', error);
            toast.error(t('common.error'));
        }
    };

    const handleConfirmAddClass = async () => {
        if (!user || selectedSubjects.length === 0 || !selectedTimeForAdd || !parentPhone) {
            if (!parentPhone) toast.error('กรุณากรอกเบอร์โทรผู้ปกครอง');
            return;
        }
        setAddingClass(true);

        try {
            const token = await user.getIdToken();
            let successCount = 0;
            let errors = 0;

            for (const subjectName of selectedSubjects) {
                const res = await fetch(API_ENDPOINTS.CLASSES.REQUESTS, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subjectName: subjectName,
                        studyTime: selectedTimeForAdd, // Note: This might need Thai day prepended if user selects it in Add Class too? 
                        // The Add Class Modal below uses START_TIMES but doesn't seem to have Day selection? 
                        // Wait, previous code only had TIME_SLOTS (string ranges) or START_TIMES (times).
                        // Looking at the AddModal below (lines ~518), it uses START_TIMES select.
                        // It does NOT have a Day selection in the Add Modal currently shown in previous file content...
                        // Re-checking lines 513-533 in previous file... It says "Select value={selectedTimeForAdd}... from START_TIMES".
                        // BUT, does it include Day? The previous `TIME_SLOTS` example had full ranges.
                        // If `selectedTimeForAdd` is just "10:00", then the request will just look like "10:00".
                        // The user request is about "Edit" flow mostly. But "Add" flow might need fixing too if it lacks Day.
                        // I will assume for now "Edit" is priority, but I should probably add Day to Add Modal or assume "Sat" for now?
                        // Actually, let's keep Add Modal simple or check if I missed Day selection there.
                        // Previous file content lines 513-533 only has ONE Select for Time.
                        // Let's stick to fixing Edit flow first as requested.
                        studentName: user.displayName,
                        parentPhone: parentPhone
                    })
                });

                if (res.ok) {
                    successCount++;
                } else {
                    errors++;
                }
            }

            if (successCount > 0) {
                toast.success(`ส่งคำขอสำเร็จ ${successCount} รายวิชา`);
                if (errors > 0) {
                    toast.warning(`มีข้อผิดพลาด ${errors} รายวิชา (อาจซ้ำกับที่มีอยู่)`);
                }
                setIsAddClassModalOpen(false);
                setSelectedSubjects([]);
                setSelectedTimeForAdd('');
            } else {
                toast.error('เกิดข้อผิดพลาดในการส่งคำขอ');
            }

        } catch (error) {
            console.error('Error requesting class:', error);
            toast.error(t('common.error'));
        } finally {
            setAddingClass(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="card-panel border-none shadow-xl rounded-2xl overflow-hidden relative bg-white">

                <CardHeader className="flex flex-row items-center justify-between relative z-10 border-b border-slate-100 pb-6">
                    <div>
                        <CardTitle className="text-2xl text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-primary to-orange-400 rounded-lg shadow-md shadow-orange-200">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            {t('class.title')}
                        </CardTitle>

                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <AnimatePresence>
                        {classes.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {classes.map((cls, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        key={index}
                                        className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                    <BookOpen className="h-6 w-6 text-secondary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors">{cls.className}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        <span>{cls.classTime || t('class.time_placeholder')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditClick(cls, index)}
                                                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-lg">{t('class.no_classes')}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card >

            {/* Edit Time Modal */}
            < Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} >
                <DialogContent className="sm:max-w-[500px] bg-white text-slate-900 border-slate-200">
                    <DialogHeader>
                        <DialogTitle>{t('class.edit_time')}</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {editingClass?.className}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                            {/* Day Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">วันเรียน (Day)</label>
                                <Select value={selectedDay} onValueChange={setSelectedDay}>
                                    <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map(day => (
                                            <SelectItem key={day.value} value={day.value}>
                                                {day.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Start Time Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">เวลาเริ่มเรียน (Start Time)</label>
                                <div className="flex gap-3 items-center">
                                    <Select value={selectedStart} onValueChange={setSelectedStart}>
                                        <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {START_TIMES.map(time => (
                                                <SelectItem key={time} value={time}>
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-slate-400">ถึง</span>
                                    <div className="px-4 py-2 bg-slate-100 rounded-md text-slate-600 font-medium min-w-[80px] text-center">
                                        {calculateEndTime(selectedStart)}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">ระบบจะบวกเวลาเพิ่ม 2 ชั่วโมงอัตโนมัติ</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-slate-900">{t('common.cancel')}</Button>
                        <Button onClick={handleSaveTime} className="bg-primary hover:bg-orange-600 text-white font-bold">
                            <Save className="mr-2 h-4 w-4" />
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Add Class Request Modal */}
            < Dialog open={isAddClassModalOpen} onOpenChange={setIsAddClassModalOpen} >
                <DialogContent className="sm:max-w-[600px] bg-white text-slate-900 border-slate-200 rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold font-itim text-primary">
                            <Plus className="w-6 h-6" />
                            {t('class.request_title')}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            เลือกวิชาและเวลาที่ต้องการเรียน
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6 custom-scrollbar">
                        {/* Subjects Grid */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                วิชาที่ต้องการเรียน (เลือกได้มากกว่า 1)
                            </label>
                            {subjects.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {subjects.map((subject) => (
                                        <div
                                            key={subject._id}
                                            onClick={() => toggleSubject(subject.name)}
                                            className={`
                                                relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center h-28
                                                ${selectedSubjects.includes(subject.name)
                                                    ? 'bg-indigo-50 border-indigo-500 shadow-md transform scale-[1.02]'
                                                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            {selectedSubjects.includes(subject.name) && (
                                                <div className="absolute top-2 right-2 text-indigo-500">
                                                    <CheckCircle2 className="w-5 h-5 fill-indigo-100" />
                                                </div>
                                            )}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedSubjects.includes(subject.name) ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <span className={`text-sm font-medium leading-tight ${selectedSubjects.includes(subject.name) ? 'text-indigo-900' : 'text-slate-600'
                                                }`}>
                                                {subject.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed text-slate-400">
                                    กำลังโหลดรายวิชา...
                                </div>
                            )}
                        </div>

                        {/* Time Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                เวลาเรียนที่สะดวก
                            </label>
                            <Select
                                value={selectedTimeForAdd}
                                onValueChange={setSelectedTimeForAdd}
                            >
                                <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20">
                                    <SelectValue placeholder="เลือกวันและเวลาเรียน" />
                                </SelectTrigger>
                                <SelectContent>
                                    {START_TIMES.map((time) => (
                                        <SelectItem key={time} value={time} className="cursor-pointer py-3">
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Parent Phone Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                เบอร์โทรผู้ปกครอง (Parent Phone) - <span className="text-red-500">บังคับ (Required)</span>
                            </label>
                            <Input
                                placeholder="0xx-xxx-xxxx"
                                value={parentPhone}
                                onChange={(e) => setParentPhone(e.target.value)}
                                className="w-full h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setIsAddClassModalOpen(false)} className="text-slate-500 hover:text-slate-900 mr-auto h-11 rounded-xl">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg h-11 rounded-xl px-8"
                            disabled={selectedSubjects.length === 0 || !selectedTimeForAdd || !parentPhone || addingClass}
                            onClick={handleConfirmAddClass}
                        >
                            {addingClass ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></div>
                                    กำลังดำเนินการ...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {t('class.send_request')} ({selectedSubjects.length})
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    );
}
