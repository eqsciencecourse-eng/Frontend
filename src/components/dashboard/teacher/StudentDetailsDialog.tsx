import { useState, useEffect } from 'react';
// Force Update: 2026-02-01
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CalendarCheck, X, Trash2, Edit2, Save, BarChart3, History, TrendingUp, CheckSquare, Monitor, Video, XSquare, FileSignature, Clock, Award, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
    onUpdate?: () => void;
}

export default function StudentDetailsDialog({ isOpen, onClose, student, subject, teacher, onUpdate }: StudentDetailsDialogProps) {
    // Evaluation State
    const [evalScores, setEvalScores] = useState({
        creativity: 0,
        planning: 0,
        problemSolving: 0,
        design: 0,
        programming: 0,
        focus: 0
    });

    const [evalLevel, setEvalLevel] = useState<string>('Basic');
    const [evalSubLevel, setEvalSubLevel] = useState<string>('1');

    // [NEW] History Log State
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [resavingAll, setResavingAll] = useState(false);

    // [NEW] Evaluation Selected Attendance Date
    const [selectedEvalRecordId, setSelectedEvalRecordId] = useState<string | null>(null);
    const [editingEvalId, setEditingEvalId] = useState<string | null>(null);

    // Attendance State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, leave: 0, absent: 0 });
    const [savingAttendance, setSavingAttendance] = useState(false);
    const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);

    const [newAttendance, setNewAttendance] = useState({
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        classPeriod: '',
        remark: ''
    });

    useEffect(() => {
        if (isOpen && student && subject) {
            fetchAttendance();
            fetchEvaluationHistory(); // [NEW] Fetch history on open
        }
    }, [isOpen, student, subject]);

    // [NEW] Fetch History Function
    const fetchEvaluationHistory = async () => {
        if (!student) return;
        setIsLoadingHistory(true);
        try {
            const token = await teacher.getIdToken();
            const subjectId = subject?._id || subject?.id;
            // Query history for this student (optionally filter by subject if needed)
            const url = subjectId
                ? `${API_ENDPOINTS.EVALUATIONS.GET_STUDENT_HISTORY(student._id || student.id)}?subjectId=${subjectId}`
                : API_ENDPOINTS.EVALUATIONS.GET_STUDENT_HISTORY(student._id || student.id);

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const logs = await res.json();
                setHistoryLogs(logs);
            }
        } catch (error) {
            console.error("Failed to fetch evaluation history", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleSaveEvaluation = async () => {
        if (!student) return;

        const selectedRecord = attendanceHistory.find(r => r.id === selectedEvalRecordId);
        if (!selectedRecord && attendanceHistory.length > 0) {
            toast.error('กรุณาเลือกวันที่เข้าเรียนก่อนประเมิน');
            return;
        }

        try {
            const token = await teacher.getIdToken();
            const payload = {
                studentId: student._id || student.id,
                teacherId: teacher._id || teacher.id || teacher.uid,
                subjectId: subject?._id || subject?.id || 'general',
                date: selectedRecord ? new Date(selectedRecord.date) : new Date(),
                level: evalLevel,
                subLevel: evalSubLevel,
                scores: evalScores
            };

            const url = editingEvalId
                ? API_ENDPOINTS.EVALUATIONS.UPDATE(editingEvalId)
                : API_ENDPOINTS.EVALUATIONS.CREATE;
            const method = editingEvalId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingEvalId ? 'แก้ไขผลการประเมินสำเร็จ' : 'บันทึกผลการประเมินสำเร็จ');
                setEditingEvalId(null);
                fetchEvaluationHistory(); // [NEW] Refresh history immediately
                if (onUpdate) onUpdate();
            } else {
                toast.error('บันทึกไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Save Eval Error', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleEditEvaluationLog = (log: any) => {
        setEvalScores(log.scores);
        setEvalLevel(log.level || 'Basic');
        setEvalSubLevel(log.subLevel || '1');
        setEditingEvalId(log._id || log.id);

        // Try to match the date to select the correct attendance pill
        const logTime = new Date(log.date || log.createdAt).setHours(0, 0, 0, 0);
        const match = attendanceHistory.find(r => new Date(r.date).setHours(0, 0, 0, 0) === logTime);
        if (match) setSelectedEvalRecordId(match.id);
    };

    const handleCancelEditEval = () => {
        setEditingEvalId(null);
        setEvalScores({ creativity: 0, planning: 0, problemSolving: 0, design: 0, programming: 0, focus: 0 });
        setEvalLevel('Basic');
        setEvalSubLevel('1');
    };

    const handleDeleteEvaluationLog = async (id: string) => {
        if (!confirm('ยืนยันการลบผลการประเมินนี้?')) return;
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(API_ENDPOINTS.EVALUATIONS.DELETE(id), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('ลบข้อมูลเรียบร้อย');
                if (editingEvalId === id) handleCancelEditEval();
                fetchEvaluationHistory();
                if (onUpdate) onUpdate();
            } else {
                toast.error('ลบไม่สำเร็จ');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleResaveAllScores = async () => {
        if (historyLogs.length === 0) {
            toast.error('ไม่มีประวัติคะแนนให้บันทึก');
            return;
        }
        setResavingAll(true);
        const token = await teacher.getIdToken();
        let successCount = 0;
        let failCount = 0;

        for (const log of historyLogs) {
            try {
                const payload = {
                    studentId: student._id || student.id,
                    teacherId: teacher._id || teacher.id || teacher.uid,
                    subjectId: subject?._id || subject?.id || 'general',
                    date: log.date,
                    level: log.level,
                    subLevel: log.subLevel,
                    scores: log.scores
                };

                const res = await fetch(API_ENDPOINTS.EVALUATIONS.UPDATE(log._id || log.id), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) successCount++;
                else failCount++;
            } catch (error) {
                failCount++;
            }
        }

        setResavingAll(false);
        if (failCount === 0) {
            toast.success(`บันทึกคะแนนทั้งหมด ${successCount} รายการสำเร็จ`);
        } else {
            toast.warning(`บันทึกสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
        }
        fetchEvaluationHistory();
        if (onUpdate) onUpdate();
    };

    const fetchAttendance = async () => {
        if (!student || !subject) return;
        try {
            // Use safe subject ID check
            const subjectId = subject._id || subject.name || subject;
            const token = await teacher.getIdToken();

            // Fetch History
            const res = await fetch(`${API_ENDPOINTS.ATTENDANCE.ALL}?subjectId=${subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                const studentHistory: any[] = [];
                let stats = { present: 0, late: 0, leave: 0, absent: 0 };

                data.forEach((record: any) => {
                    // Check if this record contains our student
                    const studentRecord = record.students.find((s: any) => {
                        // FIX: Safely extract ID whether it's an object (ObjectId) or string
                        const sId = (s.studentId && typeof s.studentId === 'object' && s.studentId.toString)
                            ? s.studentId.toString()
                            : String(s.studentId);

                        return sId === String(student._id);
                    });

                    if (studentRecord) {
                        studentHistory.push({
                            id: record._id,
                            date: record.date,
                            status: studentRecord.status,
                            classPeriod: studentRecord.classPeriod || '',
                            remark: studentRecord.remark || studentRecord.comment,
                            isShared: record.students.length > 1
                        });

                        const s = studentRecord.status.toLowerCase();
                        if (s === 'present') stats.present++;
                        else if (s === 'late') stats.late++;
                        else if (s === 'leave') stats.leave++;
                        else if (s === 'absent') stats.absent++;
                    }
                });

                const sortedHistory = studentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAttendanceHistory(sortedHistory);
                setAttendanceStats(stats);

                // Set default eval date to latest attendance
                if (sortedHistory.length > 0) {
                    setSelectedEvalRecordId(sortedHistory[0].id);
                } else {
                    setSelectedEvalRecordId(null);
                }
            }
        } catch (error) {
            console.error('Fetch Attendance Error', error);
        }
    };

    const handleSaveAttendance = async () => {
        if (!student || !subject) return;
        setSavingAttendance(true);
        try {
            const token = await teacher.getIdToken();
            const subjectId = subject._id || subject.name || subject;

            const url = editingAttendanceId
                ? API_ENDPOINTS.ATTENDANCE.UPDATE(editingAttendanceId)
                : API_ENDPOINTS.ATTENDANCE.CREATE;

            const method = editingAttendanceId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    subjectId: subjectId,
                    subjectName: subject.name,
                    date: newAttendance.date,
                    students: [{
                        studentId: student._id,
                        firstName: (student.studentName || student.displayName || '').split(' ')[0] || '-',
                        lastName: (student.studentName || student.displayName || '').split(' ').slice(1).join(' ') || '-',
                        status: newAttendance.status,
                        classPeriod: newAttendance.classPeriod,
                        comment: newAttendance.remark
                    }]
                })
            });

            if (res.ok) {
                toast.success(editingAttendanceId ? 'อัปเดตการเข้าเรียนเรียบร้อย' : 'บันทึกการเข้าเรียนเรียบร้อย');
                setNewAttendance({
                    date: new Date().toISOString().split('T')[0],
                    status: 'Present',
                    classPeriod: '',
                    remark: ''
                });
                setEditingAttendanceId(null);
                fetchAttendance();
                if (onUpdate) onUpdate();
            } else {
                toast.error('บันทึกไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Save Attendance Error', error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setSavingAttendance(false);
        }
    };

    const handleDeleteAttendance = async (id: string, isShared: boolean) => {
        if (!confirm('ยืนยันการลบข้อมูลการเข้าเรียนนี้?')) return;
        try {
            const token = await teacher.getIdToken();
            const targetStudentId = student._id || student.id;
            let url = API_ENDPOINTS.ATTENDANCE.DELETE(id);

            if (targetStudentId) {
                url += `?studentId=${targetStudentId}`;
            }

            const res = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('ลบข้อมูลเรียบร้อย');
                fetchAttendance();
                if (onUpdate) onUpdate();
                if (editingAttendanceId === id) handleCancelEdit();
            } else {
                toast.error('ลบไม่สำเร็จ');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleEditAttendance = (record: any) => {
        setNewAttendance({
            date: new Date(record.date).toISOString().split('T')[0],
            status: record.status,
            classPeriod: record.classPeriod || '',
            remark: record.remark || ''
        });
        setEditingAttendanceId(record._id || record.id);
    };

    const handleCancelEdit = () => {
        setNewAttendance({
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            classPeriod: '',
            remark: ''
        });
        setEditingAttendanceId(null);
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 m-0 gap-0 bg-white border-0 shadow-none rounded-none overflow-hidden font-sans">

                {/* Header */}
                <DialogHeader className="px-6 py-5 border-b border-slate-200 bg-white flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-2 border border-indigo-100 rounded-none">
                            <CalendarCheck className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">จัดการข้อมูลนักเรียน</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                นักเรียน: {student.displayName || student.studentName} | วิชา: {subject?.name || '-'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="attendance" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px] rounded-none bg-slate-100 p-1">
                            <TabsTrigger value="attendance" className="rounded-none data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:border-indigo-600 data-[state=active]:border-2 data-[state=active]:shadow-none border-2 border-transparent">การเข้าเรียน (Attendance)</TabsTrigger>
                            <TabsTrigger value="evaluation" className="rounded-none data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:border-indigo-600 data-[state=active]:border-2 data-[state=active]:shadow-none border-2 border-transparent">ผลการประเมิน (Evaluation)</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance" className="flex-1 overflow-hidden p-6 mt-0 bg-slate-50">
                        <div className="bg-white rounded-none shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
                            {/* ... Attendance Input ... */}
                            <div className="p-5 mx-5 mt-5 bg-slate-50 rounded-none border border-slate-200 flex flex-col md:flex-row items-end gap-5 shadow-sm">
                                <div className="flex flex-col gap-2 w-full md:w-[160px] flex-shrink-0 relative group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">วันที่เรียน</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <CalendarCheck className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="date"
                                            value={newAttendance.date}
                                            onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                                            className="border border-slate-300 rounded-none pl-[38px] pr-3 py-2 text-sm w-full outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-slate-700 font-medium h-[44px]"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full md:w-[160px] flex-shrink-0">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">สถานะ</label>
                                    <div className="relative">
                                        <Select
                                            value={newAttendance.status}
                                            onValueChange={(val) => setNewAttendance({ ...newAttendance, status: val })}
                                        >
                                            <SelectTrigger className={`rounded-none h-[44px] font-bold outline-none ring-0 focus:ring-1 focus:ring-offset-0 focus:ring-indigo-500 ${newAttendance.status.toLowerCase() === 'present' ? 'bg-green-50 text-green-700 border-green-300' :
                                                    newAttendance.status.toLowerCase() === 'online' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                        newAttendance.status.toLowerCase() === 'leave_video' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            newAttendance.status.toLowerCase() === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                newAttendance.status.toLowerCase() === 'leave' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                    newAttendance.status.toLowerCase() === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                <SelectValue placeholder="เลือกสถานะ" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none font-sans">
                                                <SelectItem value="Present" className="rounded-none font-bold text-green-700 focus:bg-green-100 focus:text-green-800"><div className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> มาเรียน</div></SelectItem>
                                                <SelectItem value="Online" className="rounded-none font-bold text-teal-700 focus:bg-teal-100 focus:text-teal-800"><div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> เรียนออนไลน์</div></SelectItem>
                                                <SelectItem value="Leave_Video" className="rounded-none font-bold text-purple-700 focus:bg-purple-100 focus:text-purple-800"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> ลา/ส่งวิดีโอ</div></SelectItem>
                                                <SelectItem value="Absent" className="rounded-none font-bold text-red-700 focus:bg-red-100 focus:text-red-800"><div className="flex items-center gap-2"><XSquare className="w-4 h-4" /> ขาดเรียน</div></SelectItem>
                                                <SelectItem value="Leave" className="rounded-none font-bold text-blue-700 focus:bg-blue-100 focus:text-blue-800"><div className="flex items-center gap-2"><FileSignature className="w-4 h-4" /> ลา</div></SelectItem>
                                                <SelectItem value="Late" className="rounded-none font-bold text-amber-700 focus:bg-amber-100 focus:text-amber-800"><div className="flex items-center gap-2"><Clock className="w-4 h-4" /> สาย</div></SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full flex-1 relative group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">หมายเหตุ</label>
                                    <input
                                        type="text"
                                        placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)..."
                                        value={newAttendance.remark}
                                        onChange={(e) => setNewAttendance({ ...newAttendance, remark: e.target.value })}
                                        className="border border-slate-300 rounded-none px-3 py-2 text-sm w-full outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-slate-700 h-[44px]"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 w-full md:w-auto flex-shrink-0 mt-2 md:mt-0">
                                    {editingAttendanceId ? (
                                        <div className="flex gap-4 w-full">
                                            <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} className="h-[44px] px-6 w-full md:w-auto flex-1 bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm font-bold text-sm rounded-none">
                                                <Save className="w-4 h-4 mr-2" /> บันทึกแก้ไข
                                            </Button>
                                            <Button size="sm" onClick={handleCancelEdit} variant="outline" className="h-[44px] px-6 w-full md:w-auto bg-white hover:bg-slate-50 text-slate-600 border-slate-300 font-bold border rounded-none">
                                                ยกเลิก
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} className="h-[44px] px-8 w-full md:w-auto bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm font-bold text-sm transition-all active:scale-[0.98] rounded-none">
                                            <Save className="w-4 h-4 mr-2" /> บันทึกเวลาเรียน
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                            <tr>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">วันที่เรียน</th>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">สถานะ</th>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">หมายเหตุ</th>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 text-right tracking-wider w-[100px]">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceHistory.length > 0 ? (
                                                attendanceHistory.map((record: any) => (
                                                    <tr key={record.id} className="bg-white border-b hover:bg-slate-50 group transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-900">
                                                            {new Date(record.date).toLocaleDateString('th-TH')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold border
                                                            ${(record.status || '').toLowerCase() === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                    (record.status || '').toLowerCase() === 'online' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                                        (record.status || '').toLowerCase() === 'leave_video' || record.status === 'Leave/Video' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                            (record.status || '').toLowerCase() === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                                (record.status || '').toLowerCase() === 'leave' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                    'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                {(record.status || '').toLowerCase() === 'present' ? <><CheckSquare className="w-3.5 h-3.5" /> มาเรียน</> :
                                                                    (record.status || '').toLowerCase() === 'online' ? <><Monitor className="w-3.5 h-3.5" /> เรียนออนไลน์</> :
                                                                        (record.status || '').toLowerCase() === 'leave_video' || record.status === 'Leave/Video' ? <><Video className="w-3.5 h-3.5" /> ลา/ส่งวิดีโอ</> :
                                                                            (record.status || '').toLowerCase() === 'absent' ? <><XSquare className="w-3.5 h-3.5" /> ขาดเรียน</> :
                                                                                (record.status || '').toLowerCase() === 'leave' ? <><FileSignature className="w-3.5 h-3.5" /> ลา</> : <><Clock className="w-3.5 h-3.5" /> สาย</>}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {record.remark || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleEditAttendance(record)}
                                                                    className="flex items-center justify-center w-8 h-8 rounded-none border border-transparent text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all focus:opacity-100"
                                                                    title="แก้ไข"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAttendance(record.id, record.isShared)}
                                                                    className="flex items-center justify-center w-8 h-8 rounded-none border border-transparent text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all focus:opacity-100"
                                                                    title="ลบ"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12">
                                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                                                <CalendarCheck className="w-6 h-6 text-slate-300" />
                                                            </div>
                                                            <p className="text-sm font-medium">ยังไม่มีประวัติการเข้าเรียนในวิชานี้</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Evaluation Tab */}
                    <TabsContent value="evaluation" className="flex-1 overflow-hidden p-6 mt-0 bg-slate-50">
                        <div className="bg-white rounded-none shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col pt-6 pb-6 pr-6 pl-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full">
                                {/* Left Side: Input Form */}
                                <div className="space-y-4 overflow-y-auto h-full pr-3 relative pb-2 pt-1 flex flex-col">
                                    <div className="shrink-0 bg-white z-20 pb-4 border-b border-slate-100 mb-2">
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
                                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                                            เลือกวันที่ประเมิน (อิงจากเวลาเรียน)
                                        </h3>

                                        {attendanceHistory.length === 0 ? (
                                            <div className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-none border border-amber-200 flex items-center gap-3 font-medium">
                                                <History className="w-5 h-5" />
                                                ยังไม่มีประวัติการเข้าเรียน กรุณาเช็คชื่อก่อนครับ
                                            </div>
                                        ) : (
                                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide py-1 px-1">
                                                {attendanceHistory.map(record => {
                                                    const isSelected = selectedEvalRecordId === record.id;
                                                    const s = (record.status || '').toLowerCase();

                                                    const recordDateStr = new Date(record.date).toDateString();
                                                    const hasEvaluation = historyLogs.some(log =>
                                                        new Date(log.date || log.createdAt).toDateString() === recordDateStr
                                                    );

                                                    // Base Unselected colors
                                                    let statusColor = 'bg-slate-100 text-slate-600';
                                                    let statusLabel = 'ไม่ทราบ';
                                                    if (s === 'present') { statusColor = 'bg-emerald-50 text-emerald-600'; statusLabel = 'มาเรียน'; }
                                                    else if (s === 'absent') { statusColor = 'bg-red-50 text-red-600'; statusLabel = 'ขาด'; }
                                                    else if (s === 'leave') { statusColor = 'bg-blue-50 text-blue-600'; statusLabel = 'ลา'; }
                                                    else if (s === 'late') { statusColor = 'bg-amber-50 text-amber-600'; statusLabel = 'สาย'; }

                                                    // Override if selected
                                                    if (isSelected) {
                                                        statusColor = 'bg-white/25 text-white';
                                                    }

                                                    return (
                                                        <button
                                                            key={record.id}
                                                            onClick={() => setSelectedEvalRecordId(record.id)}
                                                            className={`flex flex-col items-center justify-center flex-shrink-0 px-4 py-3 rounded-none border transition-all duration-200 outline-none min-w-[110px] relative
                                                                ${isSelected
                                                                    ? 'bg-indigo-700 border-indigo-700 shadow-md scale-[1.02] text-white'
                                                                    : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-slate-50 opacity-90 text-slate-600'}`
                                                            }
                                                        >
                                                            {!hasEvaluation && (
                                                                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                                                            )}
                                                            <div className={`text-[10px] font-bold px-3 py-1 rounded-none border mb-2 ${statusColor.replace('text-', 'border-').replace('bg-', 'bg-')}`}>
                                                                {statusLabel}
                                                            </div>
                                                            <div className="text-sm font-bold tracking-tight">
                                                                {new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="p-5 rounded-none border border-slate-200 bg-white shadow-sm mb-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-indigo-600" />
                                                    เลือกระดับ (Level)
                                                </h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ระดับหลัก</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['Basic', 'Inter', 'Advance'].map(lvl => (
                                                            <button
                                                                key={lvl}
                                                                onClick={() => { setEvalLevel(lvl); setEvalSubLevel('1'); }}
                                                                className={`h-10 rounded-none text-sm font-bold transition-all border outline-none ${evalLevel === lvl ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-400'}`}
                                                            >
                                                                {lvl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ระดับย่อย</label>
                                                    <div className="flex gap-2">
                                                        {['1', '2', '3', '4', '5'].map(sub => (
                                                            <button
                                                                key={sub}
                                                                onClick={() => setEvalSubLevel(sub)}
                                                                className={`flex-1 h-10 rounded-none text-sm font-bold transition-all border outline-none ${evalSubLevel === sub ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-400'}`}
                                                            >
                                                                {evalLevel} {sub}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {[
                                            { key: 'creativity', label: 'ความคิดสร้างสรรค์ (Creativity)' },
                                            { key: 'planning', label: 'วางแผนการทำงาน (Work Planning)' },
                                            { key: 'problemSolving', label: 'การแก้ไขปัญหา (Problem Solving)' },
                                            { key: 'design', label: 'ปรับปรุงการออกแบบ (Design Improvement)' },
                                            { key: 'programming', label: 'ทักษะการเขียนโปรแกรม (Programming Skills)' },
                                            { key: 'focus', label: 'สมาธิในการเรียน (Focus)' }
                                        ].map((skill) => {
                                            const score = evalScores[skill.key as keyof typeof evalScores] || 0;
                                            // Ensure classes exist fully written for tailwind PurgeCSS
                                            const getStyles = (s: number) => {
                                                if (s <= 2) return { textClass: 'text-rose-500', barBg: 'bg-rose-500', thumbAccent: 'accent-rose-500' };
                                                if (s <= 4) return { textClass: 'text-amber-500', barBg: 'bg-amber-500', thumbAccent: 'accent-amber-500' };
                                                return { textClass: 'text-emerald-500', barBg: 'bg-emerald-500', thumbAccent: 'accent-emerald-500' };
                                            };
                                            const styles = getStyles(score);

                                            return (
                                                <div key={skill.key} className="p-5 rounded-none border border-slate-200 bg-slate-50 shadow-sm">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="text-sm font-bold text-slate-700">{skill.label}</label>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 justify-between w-full">
                                                        {[0, 1, 2, 3, 4, 5].map((val) => (
                                                            <button
                                                                key={val}
                                                                onClick={() => setEvalScores({ ...evalScores, [skill.key]: val })}
                                                                className={`flex-1 h-12 rounded-none text-sm font-bold transition-all border
                                                                ${score === val
                                                                        ? `${styles.barBg} text-white shadow-sm border-transparent z-10`
                                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2.5 uppercase tracking-wide">
                                                        <span className={score <= 2 ? styles.textClass : ''}>ปรับปรุง (0-2)</span>
                                                        <span className={score >= 3 && score <= 4 ? styles.textClass : ''}>พอใช้ (3-4)</span>
                                                        <span className={score === 5 ? styles.textClass : ''}>ดีมาก (5)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="shrink-0 pt-4 pb-0 mt-2 border-t border-slate-100 bg-white">
                                        {editingEvalId && (
                                            <div className="flex justify-between items-center mb-4 px-4 py-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-none font-medium">
                                                <span>กำลังแก้ไขผลการประเมิน</span>
                                                <button onClick={handleCancelEditEval} className="text-indigo-800 hover:text-indigo-900 underline text-xs font-bold">ยกเลิก</button>
                                            </div>
                                        )}
                                        <Button
                                            className="w-full h-12 bg-indigo-700 hover:bg-indigo-800 text-white text-base font-bold rounded-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                            onClick={handleSaveEvaluation}
                                            disabled={attendanceHistory.length === 0}
                                        >
                                            <Save className="w-5 h-5 mr-2" />
                                            {attendanceHistory.length === 0 ? 'รอการเช็คชื่อก่อนประเมิน' : editingEvalId ? 'บันทึกการแก้ไข' : 'บันทึกผลการประเมิน'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Right Side: History Log (The Fix) */}
                                <div className="bg-slate-50 rounded-none border border-slate-200 flex flex-col overflow-hidden h-full">
                                    <div className="p-4 border-b bg-white flex items-center justify-between">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <History className="w-4 h-4 text-slate-400" />
                                            ประวัติการประเมิน
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleResaveAllScores}
                                                disabled={resavingAll || historyLogs.length === 0}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                            >
                                                {resavingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                บันทึกคะแนนอีกครั้ง
                                            </button>
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{historyLogs.length} รายการ</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-0">
                                        {isLoadingHistory ? (
                                            <div className="flex justify-center items-center h-full text-slate-400">Loading...</div>
                                        ) : historyLogs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
                                                <History className="w-8 h-8 opacity-20" />
                                                <p className="text-sm">ยังไม่มีประวัติการประเมิน</p>
                                                <p className="text-xs">คะแนนที่บันทึกจะปรากฏที่นี่ทันที</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-200">
                                                {historyLogs.map((log: any, index: number) => {
                                                    // Calculate total score for quick view
                                                    const total = Object.values(log.scores || {}).reduce((a: any, b: any) => a + b, 0) as number;
                                                    const avg = (total / 6).toFixed(1);

                                                    return (
                                                        <div key={log._id || log.id} className="p-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-none border border-indigo-200">
                                                                            {log.level || 'Basic'} {log.subLevel || '1'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-700">
                                                                        {new Date(log.date || log.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 mt-0.5">ผู้ประเมิน: ครู (ID: ...{log.teacherId?.slice(-4)})</p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => handleEditEvaluationLog(log)} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="แก้ไข">
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteEvaluationLog(log._id || log.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="ลบ">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-right mt-1 flex flex-col items-end">
                                                                        <span className={`text-xl font-black leading-none ${Number(avg) >= 4 ? 'text-emerald-500' : Number(avg) >= 3 ? 'text-indigo-500' : 'text-orange-500'}`}>
                                                                            {avg}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">เฉลี่ย</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Mini Skill Bars */}
                                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                                {Object.entries(log.scores || {}).map(([key, val]: any) => (
                                                                    <div key={key} className="flex flex-col">
                                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                                                            <span className="capitalize truncate w-12">{key.slice(0, 4)}..</span>
                                                                            <span>{val}</span>
                                                                        </div>
                                                                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full ${val >= 4 ? 'bg-green-400' : 'bg-indigo-400'}`}
                                                                                style={{ width: `${(val / 5) * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
