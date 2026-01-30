import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CalendarCheck, X, Trash2, Edit2, Save } from 'lucide-react';

interface StudentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
    onUpdate?: () => void;
}

export default function StudentDetailsDialog({ isOpen, onClose, student, subject, teacher, onUpdate }: StudentDetailsDialogProps) {
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
        }
    }, [isOpen, student, subject]);

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
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-white border-0 shadow-2xl rounded-lg overflow-hidden font-sans">

                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-white flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <CalendarCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">จัดการการเข้าเรียน</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                นักเรียน: {student.displayName || student.studentName} | วิชา: {subject?.name || '-'}
                            </DialogDescription>
                        </div>
                    </div>

                </DialogHeader>

                {/* Body - Clean Attendance Only */}
                <div className="flex-1 overflow-hidden bg-slate-50 p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden">
                        <div className="h-full flex flex-col">
                            {/* Add New / Edit Section */}
                            <div className="p-4 border-b bg-white flex items-center gap-4">
                                <input
                                    type="date"
                                    value={newAttendance.date}
                                    onChange={(e) => setNewAttendance({ ...newAttendance, date: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm"
                                />
                                <select
                                    value={newAttendance.status}
                                    onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm"
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
                                    className="border rounded px-2 py-1 text-sm flex-1"
                                />
                                {editingAttendanceId ? (
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} variant="default" className="h-8">
                                            บันทึกแก้ไข
                                        </Button>
                                        <Button size="sm" onClick={handleCancelEdit} variant="outline" className="h-8">
                                            ยกเลิก
                                        </Button>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                                        <Save className="w-4 h-4 mr-2" /> บันทึก
                                    </Button>
                                )}
                            </div>

                            {/* Table */}
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
