import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

interface BatchAttendanceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    students: any[];
    subject: any;
    timeSlot: string;
    teacherId: string;
    onUpdate: () => void;
}

type AttendanceStatus = 'present' | 'absent' | 'sick' | 'leave';

interface AttendanceState {
    [studentId: string]: {
        status: AttendanceStatus;
        note: string;
    };
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: 'present', label: 'มาเรียน', color: 'text-green-600' },
    { value: 'absent', label: 'ขาด', color: 'text-red-600' },
    { value: 'sick', label: 'ลาป่วย', color: 'text-orange-600' },
    { value: 'leave', label: 'ลากิจ', color: 'text-blue-600' },
];

export default function BatchAttendanceDialog({
    isOpen,
    onClose,
    students,
    subject,
    timeSlot,
    teacherId,
    onUpdate
}: BatchAttendanceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceState>({});
    const [date, setDate] = useState<string>('');

    // Initialize state when open
    useEffect(() => {
        if (isOpen) {
            setDate(new Date().toISOString().split('T')[0]);

            const initial: AttendanceState = {};
            students.forEach(s => {
                initial[s._id] = { status: 'present', note: '' };
            });
            setAttendance(initial);
        }
    }, [isOpen, students]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleNoteChange = (studentId: string, note: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], note }
        }));
    };

    const markAll = (status: AttendanceStatus) => {
        const updated: AttendanceState = {};
        students.forEach(s => {
            updated[s._id] = { status, note: attendance[s._id]?.note || '' };
        });
        setAttendance(updated);
        toast.success(`เลือก "${STATUS_OPTIONS.find(o => o.value === status)?.label}" ทั้งหมดแล้ว`);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const payload = {
                subjectId: subject.name, // Sending Name as Backend uses name matching
                teacherId: teacherId,
                date: new Date(date),
                records: Object.entries(attendance).map(([studentId, data]) => ({
                    studentId,
                    status: data.status,
                    note: data.note
                }))
            };

            const res = await fetch(API_ENDPOINTS.USERS.BATCH_ATTENDANCE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to submit');
            }

            const result = await res.json();

            if (result.errors && result.errors.length > 0) {
                console.error('Partial errors:', result.errors);
                toast.warning(`บันทึกสำเร็จ ${result.updatedCount} คน (มีข้อผิดพลาด ${result.errors.length} คน)`);
            } else {
                toast.success(`เช็คชื่อเรียบร้อย (${result.updatedCount} คน)`);
            }

            onUpdate();
            onClose();

        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const getStats = () => {
        const stats = { present: 0, absent: 0, sick: 0, leave: 0 };
        Object.values(attendance).forEach(v => {
            stats[v.status]++;
        });
        return stats;
    };

    const stats = getStats();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                                เช็คชื่อเข้าเรียน
                            </DialogTitle>
                            <DialogDescription asChild>
                                <div className="mt-1 flex items-center gap-2">
                                    <Badge variant="secondary" className="rounded-none">{subject?.name}</Badge>
                                    <span className="text-slate-400">|</span>
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <Clock className="w-3.5 h-3.5" /> {timeSlot}
                                    </span>
                                </div>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>วันที่:</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-40 h-9 rounded-none bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Quick Stats / Actions */}
                    <div className="flex items-center justify-between mt-4 bg-slate-50 p-3 rounded-none border border-slate-100">
                        <div className="flex gap-4 text-sm">
                            <span className="text-green-600 font-bold">มา: {stats.present}</span>
                            <span className="text-red-600 font-bold">ขาด: {stats.absent}</span>
                            <span className="text-orange-600 font-bold">ลาป่วย: {stats.sick}</span>
                            <span className="text-blue-600 font-bold">ลากิจ: {stats.leave}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => markAll('present')} className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">เลือก "มาเรียน" ทั้งหมด</Button>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="p-4 pl-6 border-b border-slate-100 w-[50px]">#</th>
                                <th className="p-4 border-b border-slate-100 w-[250px]">ชื่อ-นามสกุล</th>
                                <th className="p-4 border-b border-slate-100 text-center">สถานะ</th>
                                <th className="p-4 border-b border-slate-100 w-[200px]">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map((student, index) => {
                                const state = attendance[student._id] || { status: 'present', note: '' };
                                return (
                                    <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 pl-6 text-slate-400 text-sm">{index + 1}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{student.studentName || student.displayName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{student.firstName}</div>
                                        </td>
                                        <td className="p-4 flex justify-center">
                                            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-full shadow-sm">
                                                {STATUS_OPTIONS.map(option => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => handleStatusChange(student._id, option.value)}
                                                        className={`
                                                            px-3 py-1.5 rounded-full text-xs font-bold transition-all
                                                            ${state.status === option.value
                                                                ? `${option.color.replace('text-', 'bg-').replace('600', '100')} ${option.color} ring-1 ring-inset ring-${option.color.split('-')[1]}-200`
                                                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                                                        `}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Input
                                                value={state.note}
                                                onChange={(e) => handleNoteChange(student._id, e.target.value)}
                                                placeholder="ระบุหมายเหตุ (ถ้ามี)"
                                                className="h-8 text-xs rounded-none border-slate-200 focus-visible:ring-0 focus-visible:border-indigo-400"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-none h-10 px-6 border-slate-300">ยกเลิก</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none h-10 px-8 font-bold">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        บันทึกการเช็คชื่อ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
