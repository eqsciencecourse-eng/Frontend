import { useState, useEffect } from 'react';
// Force Update: 2026-02-01
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CalendarCheck, X, Trash2, Edit2, Save, BarChart3, History, TrendingUp, CheckSquare, Monitor, Video, XSquare, FileSignature, Clock, Award, Loader2, Square, PenTool, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());

    // [NEW] Batch Score Entry State
    const [showBatchEntry, setShowBatchEntry] = useState(false);
    const [batchDateIds, setBatchDateIds] = useState<Set<string>>(new Set());
    const [batchLevel, setBatchLevel] = useState('Basic');
    const [batchSubLevel, setBatchSubLevel] = useState('1');
    const [batchScoresMap, setBatchScoresMap] = useState<Record<string, Record<string, number>>>({});
    const [currentScoreDateIndex, setCurrentScoreDateIndex] = useState(0);
    const [savingBatch, setSavingBatch] = useState(false);
    const [showBatchScoreDialog, setShowBatchScoreDialog] = useState(false);

    // Batch Check-In (multiple dates at once)
    const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
    const [batchDates, setBatchDates] = useState<{ id: string; date: string; status: string; remark: string }[]>([]);
    const [savingBatchCheckIn, setSavingBatchCheckIn] = useState(false);

    // Batch Delete Attendance
    const [batchDeleteAttendanceMode, setBatchDeleteAttendanceMode] = useState(false);
    const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(new Set());

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

    // Helper: แปลง YYYY-MM-DD เป็น วัน/เดือน/ปี พ.ศ.
    const toBuddhistDate = (dateStr: string) => {
        if (!dateStr) return { day: '', month: '', yearBE: '' };
        const d = new Date(dateStr + 'T00:00:00');
        return {
            day: d.getDate().toString(),
            month: (d.getMonth() + 1).toString(),
            yearBE: (d.getFullYear() + 543).toString()
        };
    };

    // Helper: แปลง วัน/เดือน/ปี พ.ศ. กลับเป็น YYYY-MM-DD
    const fromBuddhistDate = (day: string, month: string, yearBE: string) => {
        if (!day || !month || !yearBE) return '';
        const y = parseInt(yearBE) - 543;
        const m = parseInt(month).toString().padStart(2, '0');
        const d = parseInt(day).toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const thaiMonths = [
        { value: '1', label: 'ม.ค.' },
        { value: '2', label: 'ก.พ.' },
        { value: '3', label: 'มี.ค.' },
        { value: '4', label: 'เม.ย.' },
        { value: '5', label: 'พ.ค.' },
        { value: '6', label: 'มิ.ย.' },
        { value: '7', label: 'ก.ค.' },
        { value: '8', label: 'ส.ค.' },
        { value: '9', label: 'ก.ย.' },
        { value: '10', label: 'ต.ค.' },
        { value: '11', label: 'พ.ย.' },
        { value: '12', label: 'ธ.ค.' },
    ];

    const addBatchDate = () => {
        if (batchDates.length >= 12) {
            toast.error('เลือกวันที่ได้สูงสุด 12 วัน');
            return;
        }
        setBatchDates(prev => [...prev, {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            remark: ''
        }]);
    };

    const removeBatchDate = (id: string) => {
        setBatchDates(prev => prev.filter(d => d.id !== id));
    };

    const updateBatchDate = (id: string, field: string, value: string) => {
        setBatchDates(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleSaveBatchCheckIn = async () => {
        if (batchDates.length === 0) {
            toast.error('กรุณาเลือกวันที่อย่างน้อย 1 วัน');
            return;
        }
        setSavingBatchCheckIn(true);
        try {
            const token = await teacher.getIdToken();
            const subjectId = subject._id || subject.name || subject;
            let successCount = 0;
            let failCount = 0;

            for (const entry of batchDates) {
                const res = await fetch(API_ENDPOINTS.ATTENDANCE.CREATE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subjectId: subjectId,
                        subjectName: subject.name,
                        date: entry.date,
                        students: [{
                            studentId: student._id,
                            firstName: (student.studentName || student.displayName || '').split(' ')[0] || '-',
                            lastName: (student.studentName || student.displayName || '').split(' ').slice(1).join(' ') || '-',
                            status: entry.status,
                            comment: entry.remark || 'เช็กชื่อพร้อมกัน'
                        }]
                    })
                });

                if (res.ok) successCount++;
                else failCount++;
            }

            if (failCount === 0) {
                toast.success(`บันทึกการเช็กชื่อ ${successCount} วันเรียบร้อย`);
            } else {
                toast.warning(`บันทึกสำเร็จ ${successCount} วัน, ล้มเหลว ${failCount} วัน`);
            }

            setShowBatchCheckIn(false);
            setBatchDates([]);
            fetchAttendance();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error saving batch check-in:', error);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSavingBatchCheckIn(false);
        }
    };

    const toggleBatchDeleteAttendance = () => {
        if (batchDeleteAttendanceMode) {
            setBatchDeleteAttendanceMode(false);
            setSelectedAttendanceIds(new Set());
        } else {
            setBatchDeleteAttendanceMode(true);
        }
    };

    const toggleSelectAttendance = (id: string) => {
        setSelectedAttendanceIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBatchDeleteAttendance = async () => {
        if (selectedAttendanceIds.size === 0) return;
        if (!confirm(`ยืนยันการลบข้อมูลการเข้าเรียน ${selectedAttendanceIds.size} รายการ?`)) return;
        const token = await teacher.getIdToken();
        let successCount = 0;
        let failCount = 0;
        for (const id of selectedAttendanceIds) {
            try {
                const targetStudentId = student._id || student.id;
                let url = API_ENDPOINTS.ATTENDANCE.DELETE(id);
                if (targetStudentId) {
                    url += `?studentId=${targetStudentId}`;
                }
                const res = await fetch(url, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch {
                failCount++;
            }
        }
        if (failCount === 0) {
            toast.success(`ลบ ${successCount} รายการสำเร็จ`);
        } else {
            toast.warning(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
        }
        setBatchDeleteAttendanceMode(false);
        setSelectedAttendanceIds(new Set());
        fetchAttendance();
        if (onUpdate) onUpdate();
    };

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

    const toggleSelectMode = () => {
        if (isSelectMode) {
            setIsSelectMode(false);
            setSelectedDeleteIds(new Set());
        } else {
            setIsSelectMode(true);
        }
    };

    const toggleSelectId = (id: string) => {
        setSelectedDeleteIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBatchDelete = async () => {
        if (selectedDeleteIds.size === 0) return;
        if (!confirm(`ยืนยันการลบผลการประเมิน ${selectedDeleteIds.size} รายการ?`)) return;
        const token = await teacher.getIdToken();
        let successCount = 0;
        let failCount = 0;
        for (const id of selectedDeleteIds) {
            try {
                const res = await fetch(API_ENDPOINTS.EVALUATIONS.DELETE(id), {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch {
                failCount++;
            }
        }
        if (failCount === 0) {
            toast.success(`ลบ ${successCount} รายการสำเร็จ`);
        } else {
            toast.warning(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
        }
        setIsSelectMode(false);
        setSelectedDeleteIds(new Set());
        fetchEvaluationHistory();
        if (onUpdate) onUpdate();
    };

    const getDefaultScores = () => ({ creativity: 0, planning: 0, problemSolving: 0, design: 0, programming: 0, focus: 0 });

    const openBatchEntry = () => {
        setShowBatchEntry(true);
        setBatchDateIds(new Set());
        setBatchLevel('Basic');
        setBatchSubLevel('1');
        setBatchScoresMap({});
        setCurrentScoreDateIndex(0);
    };

    const toggleBatchDate = (id: string) => {
        setBatchDateIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openBatchScoreDialog = () => {
        if (batchDateIds.size === 0) {
            toast.error('กรุณาเลือกวันที่ต้องการลงคะแนน');
            return;
        }
        // Init scores for each selected date
        const map: Record<string, Record<string, number>> = {};
        for (const id of batchDateIds) {
            map[id] = getDefaultScores();
        }
        setBatchScoresMap(map);
        setCurrentScoreDateIndex(0);
        setShowBatchScoreDialog(true);
    };

    const updateBatchScore = (dateId: string, key: string, val: number) => {
        setBatchScoresMap(prev => ({
            ...prev,
            [dateId]: { ...prev[dateId], [key]: val }
        }));
    };

    const handleSaveBatchScores = async () => {
        setSavingBatch(true);
        const token = await teacher.getIdToken();
        const dateIds = Array.from(batchDateIds);
        let successCount = 0;
        let failCount = 0;

        for (const dateId of dateIds) {
            const record = attendanceHistory.find(r => r.id === dateId);
            if (!record) { failCount++; continue; }
            const scores = batchScoresMap[dateId];
            if (!scores) { failCount++; continue; }

            try {
                const payload = {
                    studentId: student._id || student.id,
                    teacherId: teacher._id || teacher.id || teacher.uid,
                    subjectId: subject?._id || subject?.id || 'general',
                    date: new Date(record.date),
                    level: batchLevel,
                    subLevel: batchSubLevel,
                    scores
                };

                const res = await fetch(API_ENDPOINTS.EVALUATIONS.CREATE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) successCount++;
                else failCount++;
            } catch {
                failCount++;
            }
        }

        setSavingBatch(false);
        if (failCount === 0) {
            toast.success(`บันทึกคะแนน ${successCount} รายการสำเร็จ`);
        } else {
            toast.warning(`บันทึกสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
        }
        setShowBatchEntry(false);
        setShowBatchScoreDialog(false);
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
                                <div className="flex flex-col gap-2 w-full md:w-[280px] flex-shrink-0 relative group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">วันที่เรียน (วัน/เดือน/ปี พ.ศ.)</label>
                                    <div className="flex gap-1.5">
                                        <select
                                            value={toBuddhistDate(newAttendance.date).day}
                                            onChange={(e) => {
                                                const bd = toBuddhistDate(newAttendance.date);
                                                const newDate = fromBuddhistDate(e.target.value, bd.month, bd.yearBE);
                                                setNewAttendance({ ...newAttendance, date: newDate });
                                            }}
                                            className="flex-1 border border-slate-300 rounded-none px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700 font-medium h-[44px]"
                                        >
                                            <option value="">วัน</option>
                                            {Array.from({ length: 31 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={toBuddhistDate(newAttendance.date).month}
                                            onChange={(e) => {
                                                const bd = toBuddhistDate(newAttendance.date);
                                                const newDate = fromBuddhistDate(bd.day, e.target.value, bd.yearBE);
                                                setNewAttendance({ ...newAttendance, date: newDate });
                                            }}
                                            className="flex-1 border border-slate-300 rounded-none px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700 font-medium h-[44px]"
                                        >
                                            <option value="">เดือน</option>
                                            {thaiMonths.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={toBuddhistDate(newAttendance.date).yearBE}
                                            onChange={(e) => {
                                                const bd = toBuddhistDate(newAttendance.date);
                                                const newDate = fromBuddhistDate(bd.day, bd.month, e.target.value);
                                                setNewAttendance({ ...newAttendance, date: newDate });
                                            }}
                                            className="flex-1 border border-slate-300 rounded-none px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700 font-medium h-[44px]"
                                        >
                                            <option value="">พ.ศ.</option>
                                            {Array.from({ length: 7 }, (_, i) => {
                                                const year = new Date().getFullYear() + 543 + i - 3;
                                                return <option key={year} value={year}>{year}</option>;
                                            })}
                                        </select>
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
                                <div className="flex flex-col gap-2 w-full md:w-auto flex-shrink-0 mt-2 md:mt-0">
                                    <Button size="sm" onClick={() => { setShowBatchCheckIn(true); setBatchDates([]); }} className="h-[44px] px-4 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold text-sm transition-all active:scale-[0.98] rounded-none gap-1.5">
                                        <CalendarCheck className="w-4 h-4" /> เช็กชื่อพร้อมกัน
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-sm">
                                    {/* Toolbar */}
                                    {attendanceHistory.length > 0 && (
                                        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {attendanceHistory.length} รายการ
                                                {batchDeleteAttendanceMode && <span className="ml-2 text-rose-500">(เลือก {selectedAttendanceIds.size} รายการ)</span>}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {batchDeleteAttendanceMode ? (
                                                    <>
                                                        <button
                                                            onClick={handleBatchDeleteAttendance}
                                                            disabled={selectedAttendanceIds.size === 0}
                                                            className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-none transition-colors flex items-center gap-1"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            ลบที่เลือก ({selectedAttendanceIds.size})
                                                        </button>
                                                        <button
                                                            onClick={toggleBatchDeleteAttendance}
                                                            className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-none transition-colors"
                                                        >
                                                            ยกเลิก
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={toggleBatchDeleteAttendance}
                                                        className="text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-none transition-colors flex items-center gap-1"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> ลบวันที่พร้อมกัน
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                            <tr>
                                                {batchDeleteAttendanceMode && (
                                                    <th className="px-4 py-4 font-bold border-b border-slate-200 tracking-wider w-12">
                                                        <button
                                                            onClick={() => {
                                                                if (selectedAttendanceIds.size === attendanceHistory.length) {
                                                                    setSelectedAttendanceIds(new Set());
                                                                } else {
                                                                    setSelectedAttendanceIds(new Set(attendanceHistory.map(r => r.id)));
                                                                }
                                                            }}
                                                            className="flex items-center justify-center w-6 h-6"
                                                        >
                                                            {selectedAttendanceIds.size === attendanceHistory.length
                                                                ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                                : <Square className="w-4 h-4 text-slate-300" />}
                                                        </button>
                                                    </th>
                                                )}
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">วันที่เรียน</th>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">สถานะ</th>
                                                <th className="px-6 py-4 font-bold border-b border-slate-200 tracking-wider">หมายเหตุ</th>
                                                {!batchDeleteAttendanceMode && (
                                                    <th className="px-6 py-4 font-bold border-b border-slate-200 text-right tracking-wider w-[100px]">จัดการ</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceHistory.length > 0 ? (
                                                attendanceHistory.map((record: any) => (
                                                    <tr key={record.id} className={`bg-white border-b hover:bg-slate-50 group transition-colors ${batchDeleteAttendanceMode ? 'cursor-pointer' : ''} ${selectedAttendanceIds.has(record.id) ? 'bg-rose-50/40' : ''}`}
                                                        onClick={() => { if (batchDeleteAttendanceMode) toggleSelectAttendance(record.id); }}
                                                    >
                                                        {batchDeleteAttendanceMode && (
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex items-center justify-center">
                                                                    {selectedAttendanceIds.has(record.id)
                                                                        ? <CheckSquare className="w-4 h-4 text-rose-600" />
                                                                        : <Square className="w-4 h-4 text-slate-300" />}
                                                                </div>
                                                            </td>
                                                        )}
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
                                                        {!batchDeleteAttendanceMode && (
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
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(record.id, record.isShared); }}
                                                                        className="flex items-center justify-center w-8 h-8 rounded-none border border-transparent text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all focus:opacity-100"
                                                                        title="ลบ"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={batchDeleteAttendanceMode ? 5 : 4} className="px-6 py-12">
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

                                {/* Right Side: History Log / Batch Entry */}
                                <div className="bg-slate-50 rounded-none border border-slate-200 flex flex-col overflow-hidden h-full">
                                    {showBatchEntry ? (
                                        <>
                                            <div className="p-4 border-b bg-white flex items-center justify-between">
                                                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                    <PenTool className="w-4 h-4 text-emerald-500" />
                                                    เลือกลงคะแนนพร้อมกัน
                                                </h4>
                                                <button onClick={() => setShowBatchEntry(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1" title="ปิด">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                                {attendanceHistory.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
                                                        <CalendarCheck className="w-8 h-8 opacity-20" />
                                                        <p className="text-sm">ไม่มีประวัติการเช็คชื่อ</p>
                                                    </div>
                                                ) : (
                                                    attendanceHistory.map((record: any) => {
                                                        const rid = record.id;
                                                        const isChecked = batchDateIds.has(rid);
                                                        return (
                                                            <div
                                                                key={rid}
                                                                className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${isChecked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                                                onClick={() => toggleBatchDate(rid)}
                                                            >
                                                                <div onClick={(e) => { e.stopPropagation(); toggleBatchDate(rid); }}>
                                                                    {isChecked
                                                                        ? <CheckSquare className="w-5 h-5 text-emerald-600" />
                                                                        : <Square className="w-5 h-5 text-slate-300" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-700">
                                                                        {new Date(record.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'long', day: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                                        <span className={`inline-block w-2 h-2 rounded-full ${record.status === 'Present' ? 'bg-green-400' : record.status === 'Late' ? 'bg-yellow-400' : record.status === 'Leave' ? 'bg-blue-400' : 'bg-red-400'}`} />
                                                                        {record.status === 'Present' ? 'มาเรียน' : record.status === 'Late' ? 'สาย' : record.status === 'Leave' ? 'ลา' : 'ขาด'}
                                                                        {record.classPeriod ? ` • ${record.classPeriod}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <div className="p-4 border-t bg-white space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">ระดับ</label>
                                                        <select
                                                            value={batchLevel}
                                                            onChange={(e) => setBatchLevel(e.target.value)}
                                                            className="w-full text-sm border border-slate-200 bg-white px-2 py-1.5 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                        >
                                                            <option value="Basic">Basic</option>
                                                            <option value="Inter">Inter</option>
                                                            <option value="Advance">Advance</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-20">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">ระดับย่อย</label>
                                                        <select
                                                            value={batchSubLevel}
                                                            onChange={(e) => setBatchSubLevel(e.target.value)}
                                                            className="w-full text-sm border border-slate-200 bg-white px-2 py-1.5 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                        >
                                                            {[1, 2, 3, 4, 5].map(n => (
                                                                <option key={n} value={String(n)}>{n}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={openBatchScoreDialog}
                                                    disabled={batchDateIds.size === 0}
                                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-base font-bold rounded-none transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <PenTool className="w-4 h-4" />
                                                    ยืนยัน ({batchDateIds.size} รายการ)
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                        <div className="p-4 border-b bg-white flex items-center justify-between">
                                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <History className="w-4 h-4 text-slate-400" />
                                            ประวัติการประเมิน
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            {isSelectMode ? (
                                                <>
                                                    <button
                                                        onClick={handleBatchDelete}
                                                        disabled={selectedDeleteIds.size === 0}
                                                        className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        ลบที่เลือก ({selectedDeleteIds.size})
                                                    </button>
                                                    <button
                                                        onClick={toggleSelectMode}
                                                        className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-none transition-colors flex items-center gap-1"
                                                    >
                                                        <X className="h-3 w-3" />
                                                        ยกเลิก
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={openBatchEntry}
                                                        disabled={attendanceHistory.length === 0}
                                                        className="relative text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400 px-2.5 py-1 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                                    >
                                                        <span className="relative z-10 flex items-center gap-1">
                                                            <PenTool className="h-3 w-3" />
                                                            ลงคะแนนพร้อมกัน
                                                        </span>
                                                        <span className="absolute inset-0 overflow-hidden pointer-events-none">
                                                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent animate-shimmer" />
                                                        </span>
                                                        <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 shadow-sm leading-none z-20">
                                                            NEW!
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={toggleSelectMode}
                                                        disabled={historyLogs.length === 0}
                                                        className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                    >
                                                        <CheckSquare className="h-3 w-3" />
                                                        เลือก
                                                    </button>
                                                    <button
                                                        onClick={handleResaveAllScores}
                                                        disabled={resavingAll || historyLogs.length === 0}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                    >
                                                        {resavingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                        บันทึกคะแนนอีกครั้ง
                                                    </button>
                                                </>
                                            )}
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

                                                    const logId = log._id || log.id;
                                                    return (
                                                        <div key={logId} className={`p-4 border-b border-slate-100 transition-colors group ${isSelectMode ? 'cursor-pointer hover:bg-indigo-50/30' : 'hover:bg-slate-50 bg-white'} ${selectedDeleteIds.has(logId) ? 'bg-indigo-50/50 ring-1 ring-indigo-200' : 'bg-white'}`}
                                                            onClick={() => { if (isSelectMode) toggleSelectId(logId); }}
                                                        >
                                                            <div className="flex justify-between items-start mb-3">
                                                                {isSelectMode && (
                                                                    <div className="flex items-center mr-3 mt-0.5" onClick={(e) => { e.stopPropagation(); toggleSelectId(logId); }}>
                                                                        {selectedDeleteIds.has(logId)
                                                                            ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                                            : <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />}
                                                                    </div>
                                                                )}
                                                                <div className={isSelectMode ? 'flex-1' : ''}>
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
                                </>
                            )}
                                </div>
                            </div>

                        </div>
                    </TabsContent>
                </Tabs>

                {/* Scores Batch Entry Dialog */}
                {showBatchScoreDialog && (
                    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => {}}>
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
                                <div className="flex items-center gap-1.5">
                                    <PenTool className="w-3.5 h-3.5 text-emerald-500" />
                                    <h3 className="text-xs font-bold text-slate-800">ลงคะแนนพร้อมกัน</h3>
                                </div>
                                <button onClick={() => setShowBatchScoreDialog(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Body */}
                            {(() => {
                                const dateIds = Array.from(batchDateIds);
                                const currentId = dateIds[currentScoreDateIndex];
                                const currentRecord = attendanceHistory.find(r => r.id === currentId);
                                const currentScores = currentId ? batchScoresMap[currentId] : null;

                                if (!currentRecord || !currentScores) {
                                    return <div className="p-8 text-center text-slate-400">ไม่พบข้อมูลวันที่</div>;
                                }

                                const skillConfig = [
                                    { key: 'creativity', label: 'ความคิดสร้างสรรค์ (Creativity)' },
                                    { key: 'planning', label: 'การวางแผน (Planning)' },
                                    { key: 'problemSolving', label: 'การแก้ปัญหา (Problem Solving)' },
                                    { key: 'design', label: 'การออกแบบ (Design)' },
                                    { key: 'programming', label: 'การเขียนโปรแกรม (Programming)' },
                                    { key: 'focus', label: 'ความตั้งใจ (Focus)' },
                                ];

                                const dateStr = new Date(currentRecord.date).toLocaleDateString('th-TH', { year: '2-digit', month: 'long', day: 'numeric', weekday: 'short' });

                                return (
                                    <div className="flex-1 overflow-y-auto p-2">
                                        {/* Date indicator */}
                                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-700">{dateStr}</span>
                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 border border-emerald-200">
                                                    {batchLevel} {batchSubLevel}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {currentScoreDateIndex + 1} / {dateIds.length}
                                            </span>
                                        </div>

                                        {/* Score entry for each criterion */}
                                        <div className="space-y-1.5">
                                            {skillConfig.map(({ key, label }) => {
                                                const score = currentScores[key] || 0;
                                                const styles = score >= 5 ? { barBg: 'bg-emerald-500', textClass: 'text-emerald-600' } :
                                                    score >= 4 ? { barBg: 'bg-green-500', textClass: 'text-green-600' } :
                                                    score >= 3 ? { barBg: 'bg-indigo-500', textClass: 'text-indigo-600' } :
                                                    score >= 2 ? { barBg: 'bg-yellow-500', textClass: 'text-yellow-600' } :
                                                    { barBg: 'bg-red-500', textClass: 'text-red-600' };

                                                return (
                                                    <div key={key} className="p-2 border border-slate-200 bg-slate-50">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label className="text-[11px] font-bold text-slate-700">{label}</label>
                                                        </div>
                                                        <div className="flex items-center gap-1 justify-between w-full">
                                                            {[0, 1, 2, 3, 4, 5].map((val) => (
                                                                <button
                                                                    key={val}
                                                                    onClick={() => updateBatchScore(currentId, key, val)}
                                                                    className={`flex-1 h-7 text-xs font-bold transition-all border
                                                                        ${score === val
                                                                            ? `${styles.barBg} text-white shadow-sm border-transparent z-10`
                                                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                                                                >
                                                                    {val}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                                                            <span className={score <= 2 ? styles.textClass : ''}>ปรับปรุง (0-2)</span>
                                                            <span className={score >= 3 && score <= 4 ? styles.textClass : ''}>พอใช้ (3-4)</span>
                                                            <span className={score === 5 ? styles.textClass : ''}>ดีมาก (5)</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Footer */}
                            <div className="px-3 py-2 border-t bg-white flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentScoreDateIndex(i => Math.max(0, i - 1))}
                                        disabled={currentScoreDateIndex === 0}
                                        className="p-1 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from(batchDateIds).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentScoreDateIndex(i)}
                                                className={`w-2 h-2 rounded-full transition-all ${i === currentScoreDateIndex ? 'bg-emerald-500 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentScoreDateIndex(i => Math.min(batchDateIds.size - 1, i + 1))}
                                        disabled={currentScoreDateIndex === batchDateIds.size - 1}
                                        className="p-1 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveBatchScores}
                                    disabled={savingBatch}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-none transition-colors flex items-center gap-1.5"
                                >
                                    {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {savingBatch ? 'กำลังบันทึก...' : `บันทึก (${batchDateIds.size} รายการ)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch Check-In Dialog (เช็กชื่อพร้อมกัน หลายวัน) */}
                {showBatchCheckIn && (
                    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => {}}>
                        <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                                <div className="flex items-center gap-3">
                                    <CalendarCheck className="w-5 h-5 text-emerald-600" />
                                    <h3 className="text-base font-bold text-slate-800">เช็กชื่อพร้อมกัน ({batchDates.length}/12)</h3>
                                </div>
                                <button onClick={() => { setShowBatchCheckIn(false); setBatchDates([]); }} className="text-slate-400 hover:text-slate-600 p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">นักเรียน: {student.displayName || student.studentName}</p>
                                    <button
                                        onClick={addBatchDate}
                                        disabled={batchDates.length >= 12}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-none flex items-center gap-1.5 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> เพิ่มวันที่
                                    </button>
                                </div>

                                {batchDates.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed border-slate-200">
                                        <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="font-medium">คลิก "เพิ่มวันที่" เพื่อเพิ่มวันเช็กชื่อ (สูงสุด 12 วัน)</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {batchDates.map((entry, idx) => {
                                            const bd = toBuddhistDate(entry.date);
                                            const isPresent = entry.status.toLowerCase() === 'present';
                                            const isOnline = entry.status.toLowerCase() === 'online';
                                            const isLeaveVideo = entry.status.toLowerCase() === 'leave_video';
                                            const isAbsent = entry.status.toLowerCase() === 'absent';
                                            const isLeave = entry.status.toLowerCase() === 'leave';
                                            const isLate = entry.status.toLowerCase() === 'late';
                                            const statusColor = isPresent ? 'text-green-700 border-green-300 bg-green-50' :
                                                isOnline ? 'text-teal-700 border-teal-200 bg-teal-50' :
                                                isLeaveVideo ? 'text-purple-700 border-purple-200 bg-purple-50' :
                                                isAbsent ? 'text-red-700 border-red-200 bg-red-50' :
                                                isLeave ? 'text-blue-700 border-blue-200 bg-blue-50' :
                                                isLate ? 'text-amber-700 border-amber-200 bg-amber-50' :
                                                'text-slate-700 border-slate-200 bg-slate-50';

                                            return (
                                                <div key={entry.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 bg-slate-50 border border-slate-200">
                                                    <div className="flex items-center gap-1 w-full md:w-auto">
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 mr-1">#{idx + 1}</span>
                                                        <select
                                                            value={bd.day}
                                                            onChange={(e) => {
                                                                const newDate = fromBuddhistDate(e.target.value, bd.month, bd.yearBE);
                                                                updateBatchDate(entry.id, 'date', newDate);
                                                            }}
                                                            className="w-14 border border-slate-300 rounded-none px-1 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
                                                        >
                                                            <option value="">วัน</option>
                                                            {Array.from({ length: 31 }, (_, i) => (
                                                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={bd.month}
                                                            onChange={(e) => {
                                                                const newDate = fromBuddhistDate(bd.day, e.target.value, bd.yearBE);
                                                                updateBatchDate(entry.id, 'date', newDate);
                                                            }}
                                                            className="w-16 border border-slate-300 rounded-none px-1 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
                                                        >
                                                            <option value="">เดือน</option>
                                                            {thaiMonths.map(m => (
                                                                <option key={m.value} value={m.value}>{m.label}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={bd.yearBE}
                                                            onChange={(e) => {
                                                                const newDate = fromBuddhistDate(bd.day, bd.month, e.target.value);
                                                                updateBatchDate(entry.id, 'date', newDate);
                                                            }}
                                                            className="w-20 border border-slate-300 rounded-none px-1 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
                                                        >
                                                            <option value="">พ.ศ.</option>
                                                            {Array.from({ length: 7 }, (_, i) => {
                                                                const year = new Date().getFullYear() + 543 + i - 3;
                                                                return <option key={year} value={year}>{year}</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div className="flex-1 w-full md:w-auto">
                                                        <Select
                                                            value={entry.status}
                                                            onValueChange={(val) => updateBatchDate(entry.id, 'status', val)}
                                                        >
                                                            <SelectTrigger className={`rounded-none h-[34px] text-xs font-bold outline-none ring-0 focus:ring-1 focus:ring-offset-0 focus:ring-indigo-500 ${statusColor}`}>
                                                                <SelectValue placeholder="เลือกสถานะ" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-none font-sans">
                                                                <SelectItem value="Present" className="rounded-none font-bold text-green-700 focus:bg-green-100 focus:text-green-800"><div className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> มาเรียน</div></SelectItem>
                                                                <SelectItem value="Online" className="rounded-none font-bold text-teal-700 focus:bg-teal-100 focus:text-teal-800"><div className="flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> เรียนออนไลน์</div></SelectItem>
                                                                <SelectItem value="Leave_Video" className="rounded-none font-bold text-purple-700 focus:bg-purple-100 focus:text-purple-800"><div className="flex items-center gap-2"><Video className="w-3.5 h-3.5" /> ลา/ส่งวิดีโอ</div></SelectItem>
                                                                <SelectItem value="Absent" className="rounded-none font-bold text-red-700 focus:bg-red-100 focus:text-red-800"><div className="flex items-center gap-2"><XSquare className="w-3.5 h-3.5" /> ขาดเรียน</div></SelectItem>
                                                                <SelectItem value="Leave" className="rounded-none font-bold text-blue-700 focus:bg-blue-100 focus:text-blue-800"><div className="flex items-center gap-2"><FileSignature className="w-3.5 h-3.5" /> ลา</div></SelectItem>
                                                                <SelectItem value="Late" className="rounded-none font-bold text-amber-700 focus:bg-amber-100 focus:text-amber-800"><div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> สาย</div></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex-1 w-full md:w-auto">
                                                        <input
                                                            type="text"
                                                            placeholder="หมายเหตุ (ไม่บังคับ)"
                                                            value={entry.remark}
                                                            onChange={(e) => updateBatchDate(entry.id, 'remark', e.target.value)}
                                                            className="w-full border border-slate-300 rounded-none px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700 h-[34px]"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeBatchDate(entry.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all shrink-0"
                                                        title="ลบวันที่"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 border-t bg-white flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    {batchDates.length > 0 ? `ทั้งหมด ${batchDates.length} วัน` : ''}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setShowBatchCheckIn(false); setBatchDates([]); }}
                                        className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-bold rounded-none transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSaveBatchCheckIn}
                                        disabled={savingBatchCheckIn || batchDates.length === 0}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-none flex items-center gap-2 transition-colors"
                                    >
                                        {savingBatchCheckIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {savingBatchCheckIn ? 'กำลังบันทึก...' : `ยืนยัน (${batchDates.length} วัน)`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
