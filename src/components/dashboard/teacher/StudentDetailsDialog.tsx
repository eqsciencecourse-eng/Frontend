import { useState, useEffect } from 'react';
// Force Update: 2026-02-01
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CalendarCheck, X, Trash2, Edit2, Save, BarChart3, History, TrendingUp } from 'lucide-react';
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

    // [NEW] History Log State
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
        try {
            const token = await teacher.getIdToken();
            const payload = {
                studentId: student._id || student.id,
                teacherId: teacher._id || teacher.id || teacher.uid,
                subjectId: subject?._id || subject?.id || 'general',
                date: new Date(),
                scores: evalScores
            };

            const res = await fetch(API_ENDPOINTS.EVALUATIONS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('บันทึกผลการประเมินสำเร็จ');
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

                setAttendanceHistory(studentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setAttendanceStats(stats);
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
            let url = API_ENDPOINTS.ATTENDANCE.DELETE(id);

            // If shared, only delete this student from the record
            if (isShared && student && student._id) {
                url += `?studentId=${student._id}`;
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
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-white border-0 shadow-2xl rounded-lg overflow-hidden font-sans sm:max-w-4xl">

                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-white flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <CalendarCheck className="w-6 h-6 text-indigo-600" />
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
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="attendance">การเข้าเรียน (Attendance)</TabsTrigger>
                            <TabsTrigger value="evaluation">ผลการประเมิน (Evaluation)</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance" className="flex-1 overflow-hidden p-6 mt-0 bg-slate-50">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
                            {/* ... Attendance Input ... */}
                            <div className="p-4 border-b bg-white flex items-center gap-4">
                                <input
                                    type="date"
                                    value={newAttendance.date}
                                    onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm h-9"
                                />
                                <select
                                    value={newAttendance.status}
                                    onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm h-9 bg-white"
                                >
                                    <option value="Present">มาเรียน</option>
                                    <option value="Absent">ขาดเรียน</option>
                                    <option value="Late">สาย</option>
                                    <option value="Leave">ลา</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="หมายเหตุ..."
                                    value={newAttendance.remark}
                                    onChange={(e) => setNewAttendance({ ...newAttendance, remark: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm flex-1 h-9"
                                />
                                {editingAttendanceId ? (
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} variant="default" className="h-9">
                                            บันทึกแก้ไข
                                        </Button>
                                        <Button size="sm" onClick={handleCancelEdit} variant="outline" className="h-9">
                                            ยกเลิก
                                        </Button>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} className="h-9 bg-green-600 hover:bg-green-700 text-white">
                                        <Save className="w-4 h-4 mr-2" /> บันทึก
                                    </Button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">วันที่</th>
                                            <th className="px-6 py-3">สถานะ</th>
                                            <th className="px-6 py-3">หมายเหตุ</th>
                                            <th className="px-6 py-3 text-right">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceHistory.length > 0 ? (
                                            attendanceHistory.map((record: any) => (
                                                <tr key={record.id} className="bg-white border-b hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {new Date(record.date).toLocaleDateString('th-TH')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold
                                                            ${record.status === 'Present' || record.status === 'present' ? 'bg-green-100 text-green-800' :
                                                                record.status === 'Absent' || record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                    record.status === 'Leave' || record.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-orange-100 text-orange-800'}`}>
                                                            {record.status === 'Present' || record.status === 'present' ? 'มาเรียน' :
                                                                record.status === 'Absent' || record.status === 'absent' ? 'ขาด' :
                                                                    record.status === 'Leave' || record.status === 'leave' ? 'ลา' : 'สาย'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {record.remark || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        <button onClick={() => handleEditAttendance(record)} className="text-blue-600 hover:text-blue-800">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteAttendance(record.id, record.isShared)} className="text-red-600 hover:text-red-800">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                                    ไม่มีประวัติการเข้าเรียน
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Evaluation Tab */}
                    <TabsContent value="evaluation" className="flex-1 overflow-hidden p-6 mt-0 bg-slate-50">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col pt-6 pb-6 pr-6 pl-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full">
                                {/* Left Side: Input Form */}
                                <div className="space-y-6 overflow-y-auto h-full pr-2">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 sticky top-0 bg-white z-10 py-2">
                                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                                        แบบประเมินทักษะ ({new Date().toLocaleDateString('th-TH')})
                                    </h3>

                                    {[
                                        { key: 'creativity', label: 'ความคิดสร้างสรรค์ (Creativity)' },
                                        { key: 'planning', label: 'วางแผนการทำงาน (Work Planning)' },
                                        { key: 'problemSolving', label: 'การแก้ไขปัญหา (Problem Solving)' },
                                        { key: 'design', label: 'ปรับปรุงการออกแบบ (Design Improvement)' },
                                        { key: 'programming', label: 'ทักษะการเขียนโปรแกรม (Programming Skills)' },
                                        { key: 'focus', label: 'สมาธิในการเรียน (Focus)' }
                                    ].map((skill) => (
                                        <div key={skill.key} className="space-y-2 group">
                                            <div className="flex justify-between">
                                                <label className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{skill.label}</label>
                                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 rounded-md">{evalScores[skill.key as keyof typeof evalScores] || 0}/10</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="1"
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:bg-slate-300 transition-all"
                                                value={evalScores[skill.key as keyof typeof evalScores] || 0}
                                                onChange={(e) => setEvalScores({ ...evalScores, [skill.key]: parseInt(e.target.value) })}
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                                <span>ปรับปรุง (0-3)</span>
                                                <span>พอใช้ (4-6)</span>
                                                <span>ดีมาก (7-10)</span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-4 sticky bottom-0 bg-white pb-2">
                                        <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-base shadow-lg shadow-indigo-100" onClick={handleSaveEvaluation}>
                                            <Save className="w-5 h-5 mr-2" /> บันทึกผลการประเมิน
                                        </Button>
                                    </div>
                                </div>

                                {/* Right Side: History Log (The Fix) */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full">
                                    <div className="p-4 border-b bg-white flex items-center justify-between">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <History className="w-4 h-4 text-slate-400" />
                                            ประวัติการประเมิน
                                        </h4>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{historyLogs.length} รายการ</span>
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
                                                        <div key={index} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">
                                                                        {new Date(log.date || log.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400">ผู้ประเมิน: ครู (ID: ...{log.teacherId?.slice(-4)})</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-lg font-bold ${Number(avg) >= 8 ? 'text-green-600' : Number(avg) >= 5 ? 'text-indigo-600' : 'text-orange-500'}`}>
                                                                        {avg}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400 block">เฉลี่ย</span>
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
                                                                                className={`h-full ${val >= 8 ? 'bg-green-400' : 'bg-indigo-400'}`}
                                                                                style={{ width: `${(val / 10) * 100}%` }}
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
