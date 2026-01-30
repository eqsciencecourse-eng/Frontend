'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';
import TeacherSidebar from '@/components/dashboard/teacher/TeacherSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Calendar, Search, CalendarCheck, MoreHorizontal, MessageSquare, Plus, Save, Loader2, Info, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import QRCode from "react-qr-code";

type AttendanceStatus = 'Present' | 'Late' | 'Leave' | 'Absent';

interface AttendanceSlot {
    date: string;
    status: AttendanceStatus;
    remark?: string;
    existingId?: string; // ID of the attendance record if it exists
}

export default function AttendancePage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [selectedSubject, setSelectedSubject] = useState('');

    // Attendance State: Record<studentId, Record<slotIndex, AttendanceSlot>>
    const [gridData, setGridData] = useState<Record<string, Record<number, AttendanceSlot>>>({});
    const [columnDates, setColumnDates] = useState<Record<number, string>>({});

    // QR Code State
    const [qrState, setQrState] = useState<{
        isOpen: boolean;
        token: string;
        url: string;
        slotIdx: number;
        groupKey: string; // To parse time
        expiresAt: number;
    }>({ isOpen: false, token: '', url: '', slotIdx: -1, groupKey: '', expiresAt: 0 });

    const handleGenerateQR = async (slotIdx: number, groupKey: string) => {
        // 1. Ensure Date is set
        let dateToUse = columnDates[slotIdx];
        if (!dateToUse) {
            // Default to today if not set
            const today = new Date().toISOString();
            setColumnDates(prev => ({ ...prev, [slotIdx]: today }));
            dateToUse = today;
        }

        // 2. Extract Time from groupKey (e.g. "เสาร์ 15:30-17:30" or "Monday 10:00")
        // Just take the first time-like string
        const timeMatch = groupKey.match(/(\d{1,2}:\d{2})/);
        const timeToUse = timeMatch ? timeMatch[0] : '00:00';

        const subjectObj = subjects.find(s => s._id === selectedSubject);

        try {
            const token = await user?.getIdToken();
            const res = await fetch(API_ENDPOINTS.ATTENDANCE.GENERATE_QR, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    subjectId: selectedSubject,
                    subjectName: subjectObj?.name || 'Unknown',
                    date: dateToUse, // ISO string
                    time: timeToUse
                })
            });

            if (res.ok) {
                const data = await res.json();
                const url = `${window.location.origin}/attendance/check-in?token=${data.token}`;
                setQrState({
                    isOpen: true,
                    token: data.token,
                    url: url,
                    slotIdx,
                    groupKey,
                    expiresAt: data.expiresAt
                });
            } else {
                toast.error('Failed to generate QR');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error generating QR');
        }
    };

    // Poll for changes when QR is open
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (qrState.isOpen && qrState.token) {
            const poll = async () => {
                // Fetch latest "Check" for this subject/date
                // API_ENDPOINTS.ATTENDANCE.CHECK returns list of students.
                // We need to map them to gridData[studentId][slotIdx]
                const dateVal = columnDates[qrState.slotIdx];
                if (!dateVal) return;

                const token = await user?.getIdToken();
                const res = await fetch(API_ENDPOINTS.ATTENDANCE.CHECK(selectedSubject, dateVal), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.students) {
                        setGridData(prev => {
                            const next = { ...prev };
                            data.students.forEach((s: any) => {
                                const sId = (s.studentId?._id || s.studentId)?.toString();
                                if (!sId) return;

                                if (!next[sId]) next[sId] = {};

                                // Update slot
                                next[sId][qrState.slotIdx] = {
                                    date: dateVal,
                                    status: s.status,
                                    remark: s.comment,
                                    existingId: data._id // The parent doc ID
                                };
                            });
                            return next;
                        });
                    }
                }
            };

            poll(); // Initial
            interval = setInterval(poll, 3000);
        }
        return () => clearInterval(interval);
    }, [qrState.isOpen, qrState.token, qrState.slotIdx, columnDates, selectedSubject, user]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Fetch Students
            let studentData: any[] = [];
            const studentsRes = await fetch(API_ENDPOINTS.USERS.STUDENTS, { headers });
            if (studentsRes.ok) {
                studentData = await studentsRes.json();
                setStudents(studentData);
            }

            // 2. Fetch Subjects
            const subjectsRes = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (subjectsRes.ok) {
                const allSubjects = await subjectsRes.json();

                if (user.role === 'admin') {
                    setSubjects(allSubjects);
                } else {
                    const authorizedIds = user.authorizedSubjects || [];
                    const teachableSubjects = new Set<string>(authorizedIds);

                    studentData.forEach(s => {
                        if (s.assignedTeacherId === (user._id || user.id)) {
                            s.enrolledSubjects?.forEach((sub: string) => teachableSubjects.add(sub));
                        }
                        s.registeredCourses?.forEach((c: any) => {
                            if (c.teacherId === (user._id || user.id)) {
                                teachableSubjects.add(c.subject);
                                const subObj = allSubjects.find((d: any) => d.name === c.subject);
                                if (subObj) teachableSubjects.add(subObj._id);
                            }
                        });
                    });

                    const visibleSubjects = allSubjects.filter((s: any) =>
                        teachableSubjects.has(s._id) || teachableSubjects.has(s.name)
                    );
                    setSubjects(visibleSubjects);
                }
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // Move fetchHistory to component scope so it can be called from handleSubmitAll
    const fetchHistory = async () => {
        if (!selectedSubject || !user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/all?subjectId=${selectedSubject}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const history = await res.json();
                // Process history into gridData
                const newGrid: Record<string, Record<number, AttendanceSlot>> = {};
                const newDates: Record<number, string> = {};

                // Group history by date and student
                // Sort history by date ascending
                const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                sortedHistory.forEach((record: any, dateIdx: number) => {
                    newDates[dateIdx] = record.date;
                    record.students.forEach((s: any) => {
                        // Crucial: Use consistent ID string matching
                        const sId = (s.studentId?._id || s.studentId)?.toString();
                        if (!sId) return;

                        if (!newGrid[sId]) newGrid[sId] = {};
                        newGrid[sId][dateIdx] = {
                            date: record.date,
                            status: s.status,
                            remark: s.remark || s.comment,
                            existingId: record._id
                        };
                    });
                });

                setGridData(newGrid);
                setColumnDates(newDates);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // Fetch historical attendance when subject changes
    useEffect(() => {
        fetchHistory();
    }, [selectedSubject, user]);

    // Filter Logic: Purely by Subject and Teacher
    const filteredStudentsRaw = useMemo(() => {
        return students.filter(student => {
            if (!selectedSubject) return false;
            const subjectObj = subjects.find(s => s._id === selectedSubject);
            const subjectName = subjectObj?.name;
            if (!subjectName) return false;

            const isLegacyEnrolled = student.enrolledSubjects?.includes(subjectName) ||
                student.registeredClasses?.some((c: any) => c.className === subjectName);

            const registeredCourse = student.registeredCourses?.find((c: any) =>
                c.subject === subjectName && (user?.role === 'admin' || c.teacherId === (user?._id || user?.id))
            );

            return isLegacyEnrolled || registeredCourse;
        });
    }, [students, selectedSubject, subjects, user]);

    // Grouping Logic: Group by Day + Time Slot
    const studentsByDayTime: Record<string, any[]> = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredStudentsRaw.forEach(student => {
            const subjectObj = subjects.find(s => s._id === selectedSubject);
            const reg = student.registeredCourses?.find((c: any) =>
                c.subject === subjectObj?.name && c.teacherId === (user?._id || user?.id)
            );

            const day = reg?.day && reg?.day !== '-' ? reg.day : 'Unspecified';
            const time = reg?.time && reg?.time !== '-' ? reg.time : 'Unspecified';

            // Key format: "Day Time" (e.g., "จันทร์ 10:00-12:00")
            const key = day === 'Unspecified' && time === 'Unspecified' ? 'ไม่ระบุวัน-เวลา' : `${day} ${time}`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(student);
        });
        return groups;
    }, [filteredStudentsRaw, selectedSubject, subjects, user]);

    // Day ordering helper
    const getDayPriority = (key: string) => {
        if (key.includes('จันทร์') || key.includes('Mon')) return 1;
        if (key.includes('อังคาร') || key.includes('Tue')) return 2;
        if (key.includes('พุธ') || key.includes('Wed')) return 3;
        if (key.includes('พฤหัส') || key.includes('Thu')) return 4;
        if (key.includes('ศุกร์') || key.includes('Fri')) return 5;
        if (key.includes('เสาร์') || key.includes('Sat')) return 6;
        if (key.includes('อาทิตย์') || key.includes('Sun')) return 7;
        return 99;
    };

    // Grid Management
    const maxChecked = useMemo(() => {
        let max = 0;
        Object.values(gridData).forEach(slots => {
            const count = Object.keys(slots).length;
            if (count > max) max = count;
        });
        // Also check columnDates keys
        const dateMax = Object.keys(columnDates).length;
        return Math.max(max, dateMax);
    }, [gridData, columnDates]);

    const slotCount = useMemo(() => {
        return Math.max(12, Math.ceil((maxChecked + 1) / 12) * 12);
    }, [maxChecked]);

    const handleCellClick = (studentId: string, slotIdx: number, status: AttendanceStatus) => {
        // Quota validation
        const student = students.find(s => s._id === studentId);
        const subjectObj = subjects.find(s => s._id === selectedSubject);
        const reg = student?.registeredCourses?.find((c: any) =>
            c.subject === subjectObj?.name && c.teacherId === (user?._id || user?.id)
        );
        const used = reg?.usedSessions || 0;
        const total = reg?.totalSessions || 0;

        if (total > 0 && used >= total) {
            toast.warning(`โควต้านักเรียนจบคอร์ส ${total} ครั้งเเล้ว`, {
                description: "คุณยังสามารถเช็กชื่อได้ เเต่ระบบจะเเสดงผลเป็นตัวเเดง"
            });
        }

        const defaultDate = new Date().toISOString();
        const effectiveDate = columnDates[slotIdx] || defaultDate;

        // Sync columnDates if empty
        if (!columnDates[slotIdx]) {
            setColumnDates(prev => ({ ...prev, [slotIdx]: defaultDate }));
        }

        setGridData(prev => {
            const studentSlots = { ...(prev[studentId] || {}) };
            const currentSlot = studentSlots[slotIdx] || { date: effectiveDate, status: 'Present' };

            studentSlots[slotIdx] = {
                ...currentSlot,
                status: status,
                date: effectiveDate
            };

            return { ...prev, [studentId]: studentSlots };
        });
    };

    const handleRemarkChange = (studentId: string, slotIdx: number, remark: string) => {
        setGridData(prev => {
            const studentSlots = { ...(prev[studentId] || {}) };
            if (!studentSlots[slotIdx]) return prev;

            studentSlots[slotIdx] = {
                ...studentSlots[slotIdx],
                remark: remark
            };

            return { ...prev, [studentId]: studentSlots };
        });
    };

    const handleDateChange = (slotIdx: number, dateStr: string) => {
        const isoDate = new Date(dateStr).toISOString();
        setColumnDates(prev => ({ ...prev, [slotIdx]: isoDate }));

        // Also update all students for this slot if they have data
        setGridData(prev => {
            const newGrid = { ...prev };
            Object.keys(newGrid).forEach(sId => {
                if (newGrid[sId][slotIdx]) {
                    newGrid[sId][slotIdx] = { ...newGrid[sId][slotIdx], date: isoDate };
                }
            });
            return newGrid;
        });
    };

    const handleSubmitAll = async () => {
        if (!selectedSubject || !user) return;
        setSaving(true);
        try {
            const subjectObj = subjects.find(s => s._id === selectedSubject);
            if (!subjectObj) throw new Error("Subject not found");
            const token = await user.getIdToken();

            // Group by date (Date Only) to prevent overwriting
            const byDate: Record<string, any[]> = {};

            // 1. Initialize byDate with all columns that have a date set
            Object.values(columnDates).forEach(dateStr => {
                const dateKey = dateStr.split('T')[0];
                if (!byDate[dateKey]) byDate[dateKey] = [];
            });

            // 2. Fill byDate with student data
            // 2. Fill byDate with student data
            Object.entries(gridData).forEach(([studentId, slots]) => {
                const student = students.find(s => s._id === studentId);
                // Allow saving even if student not found in local list (Backend will resolve names)

                const fullName = student?.studentName || student?.displayName || 'Unknown';
                const parts = fullName.split(' ');
                const firstName = parts[0];
                const lastName = parts.slice(1).join(' ') || '-';

                Object.entries(slots).forEach(([slotIdx, data]) => {
                    const dateKey = data.date.split('T')[0];
                    if (!byDate[dateKey]) byDate[dateKey] = [];

                    // Prevent duplicate student entries for the same date (e.g. if multiple sessions on same day)
                    const studentExists = byDate[dateKey].some(s => s.studentId === studentId);
                    if (!studentExists) {
                        byDate[dateKey].push({
                            studentId,
                            firstName,
                            lastName,
                            nickname: student?.nickname,
                            status: data.status,
                            comment: data.remark
                        });
                    }
                });
            });

            // 3. Sequential submission to avoid race conditions and overwriting
            // We use a for-of loop to ensure they finish in order
            for (const [date, studentList] of Object.entries(byDate)) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subjectId: selectedSubject,
                        subjectName: subjectObj.name,
                        date: date,
                        students: studentList
                    })
                });
                if (!res.ok) throw new Error(`Failed to save for date ${date}`);
            }

            toast.success('บันทึกข้อมูลการเข้าเรียนทั้งหมดเรียบร้อยแล้ว');

            // Refresh everything to get latest IDs, state, and Quotas
            await Promise.all([
                fetchHistory(),
                fetchData()
            ]);

        } catch (error) {
            console.error('Error saving all:', error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    const handleMainQRClick = () => {
        const today = new Date().toISOString().split('T')[0];
        // 1. Check existing
        let targetSlot = -1;
        Object.entries(columnDates).forEach(([idx, date]) => {
            if (date.startsWith(today)) targetSlot = parseInt(idx);
        });

        // 2. Find new if not found
        if (targetSlot === -1) {
            for (let i = 0; i < slotCount; i++) {
                if (!columnDates[i]) {
                    targetSlot = i;
                    // Set date immediately
                    setColumnDates(prev => ({ ...prev, [i]: new Date().toISOString() }));
                    break;
                }
            }
        }

        if (targetSlot !== -1) {
            handleGenerateQR(targetSlot, "Today's Session");
        } else {
            toast.error("No empty slots available");
        }
    };

    const renderCell = (student: any, slotIdx: number) => {
        const data = gridData[student._id]?.[slotIdx];
        const status = data?.status;
        const remark = data?.remark || '';
        const hasDate = !!columnDates[slotIdx];

        if (!hasDate && !status) {
            return (
                <div className="flex items-center justify-center h-full w-full bg-slate-50/50">
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center gap-1 p-1 h-full w-full">
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={`w-full h-8 text-[10px] font-bold rounded shadow-sm transition-all border-b-2 flex items-center justify-center gap-1
                                ${status === 'Present' ? 'bg-green-500 text-white border-green-700 hover:bg-green-600' :
                                    status === 'Late' ? 'bg-amber-500 text-white border-amber-700 hover:bg-amber-600' :
                                        status === 'Leave' ? 'bg-blue-500 text-white border-blue-700 hover:bg-blue-600' :
                                            status === 'Absent' ? 'bg-red-500 text-white border-red-700 hover:bg-red-600' :
                                                'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {status === 'Present' ? 'มา' :
                                status === 'Late' ? 'สาย' :
                                    status === 'Leave' ? 'ลา' :
                                        status === 'Absent' ? 'ขาด' : 'ระบุ'}
                            {remark && <Info className="h-2.5 w-2.5 opacity-50" />}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4 shadow-2xl border-indigo-100 rounded-none" align="center">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-2">เช็คชื่อนักเรียน</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, slotIdx, 'Present')}>มา (Present)</Button>
                                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, slotIdx, 'Late')}>มาสาย (Late)</Button>
                                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, slotIdx, 'Leave')}>ลา (Leave)</Button>
                                <Button size="sm" className="bg-red-500 hover:bg-red-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, slotIdx, 'Absent')}>ขาด (Absent)</Button>
                            </div>
                            {(status && status !== 'Present') && (
                                <div className="space-y-2 mt-2">
                                    <Label className="text-[10px] font-bold text-slate-400">หมายเหตุ / Remark</Label>
                                    <Input
                                        placeholder="เหตุผลที่มาสาย/ลา/ขาด..."
                                        className="h-8 text-xs rounded-none border-slate-200 focus:ring-indigo-500"
                                        value={remark}
                                        onChange={(e) => handleRemarkChange(student._id, slotIdx, e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans flex text-slate-900 overflow-hidden">
            <TeacherSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                {/* Header Section */}
                <div className="bg-white border-b border-slate-300 px-10 py-6 flex justify-between items-center z-10 shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 bg-slate-900 flex items-center justify-center text-white rounded-none">
                            <CalendarCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">ระบบเช็คชื่อ (Attendance Sheet)</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Digital Paper Sheet Management</p>
                        </div>
                    </div>

                    {selectedSubject && (
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleMainQRClick}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none px-6 h-12 font-bold shadow-none border border-indigo-900 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-wider"
                            >
                                <QrCode className="h-5 w-5" />
                                สร้าง QR Check-in
                            </Button>

                            <Button
                                onClick={async () => {
                                    try {
                                        const token = await user?.getIdToken();
                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/sync-quotas`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            toast.success('Sync Complete', {
                                                description: `อัปเดตสำเร็จ: ${data.updatedCount || 0}, ล้มเหลว/ข้าม: ${data.failCount || 0}`
                                            });
                                            fetchData(); // Refresh UI
                                        } else {
                                            toast.error('Sync Failed');
                                        }
                                    } catch (e) {
                                        toast.error('Error syncing');
                                    }
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-none px-4 h-12 font-bold shadow-none border border-amber-800 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                            >
                                <Loader2 className="h-5 w-5" />
                                Sync Data
                            </Button>

                            <Button
                                onClick={handleSubmitAll}
                                disabled={saving}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-none px-10 h-12 font-bold shadow-none border border-slate-900 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-wider"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                บันทึกข้อมูล (Save)
                            </Button>
                        </div>
                    )}
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-auto p-10 space-y-8 bg-slate-50">
                    {/* Filter Section */}
                    <div className="bg-white p-8 border border-slate-200 shadow-sm max-w-xl">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">เลือกรายวิชา (Select Subject)</label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="h-12 rounded-none bg-white border-slate-300 text-lg font-bold text-slate-900 focus:ring-0">
                                <SelectValue placeholder="ค้นหา/เลือกวิชา (Find Subject)..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-slate-300 shadow-xl p-0">
                                {subjects.map(s => (
                                    <SelectItem key={s._id} value={s._id} className="py-3 font-semibold text-slate-800 hover:bg-slate-100 focus:bg-slate-100 rounded-none cursor-pointer">
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sheet Grid */}
                    {selectedSubject && (
                        <div className="space-y-12 pb-20">
                            {Object.entries(studentsByDayTime)
                                .sort(([keyA], [keyB]) => {
                                    const priA = getDayPriority(keyA);
                                    const priB = getDayPriority(keyB);
                                    if (priA !== priB) return priA - priB;
                                    return keyA.localeCompare(keyB);
                                })
                                .map(([groupKey, groupStudents]) => (
                                    <div key={groupKey} className="bg-white border border-slate-400 shadow-none rounded-none">
                                        {/* Sub-Header (Formal White/Gray) */}
                                        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-b border-slate-300">
                                            <div className="flex items-center gap-4 text-slate-800">
                                                <div className="h-8 w-8 bg-white border border-slate-300 flex items-center justify-center rounded-none shadow-sm">
                                                    <Clock className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <span className="text-lg font-bold tracking-tight uppercase font-mono">{groupKey}</span>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <span className="text-[12px] font-bold text-slate-600 uppercase border border-slate-300 bg-white px-3 py-1 rounded-none">
                                                    {subjects.find(s => s._id === selectedSubject)?.name}
                                                </span>
                                                <span className="bg-slate-800 text-white text-[12px] font-bold px-3 py-1 uppercase tracking-widest rounded-none">
                                                    {groupStudents.length} Students
                                                </span>
                                            </div>
                                        </div>

                                        {/* Grid Container */}
                                        <div className="overflow-x-auto">
                                            <Table className="border-collapse min-w-full">
                                                <TableHeader>
                                                    <TableRow className="bg-white border-b border-slate-300">
                                                        <TableHead className="w-14 text-center font-bold text-slate-900 text-[11px] uppercase border border-slate-300 sticky left-0 bg-slate-50 z-30">#</TableHead>
                                                        <TableHead className="w-64 font-bold text-slate-900 text-[11px] uppercase border border-slate-300 sticky left-14 bg-slate-50 z-30">ชื่อนักเรียน (Full Name)</TableHead>
                                                        <TableHead className="w-24 text-center font-bold text-slate-900 text-[11px] uppercase border border-slate-300 bg-slate-50 px-1">Quota</TableHead>

                                                        {/* Session Columns */}
                                                        {Array.from({ length: slotCount }).map((_, i) => (
                                                            <TableHead key={i} className="w-20 min-w-[80px] text-center border border-slate-300 bg-white p-0 group hover:bg-slate-50 transition-colors">
                                                                <div className="flex flex-col items-center h-full">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase py-1.5 border-b border-slate-300 w-full bg-slate-50"># {i + 1}</div>
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button className="flex-1 w-full py-2 hover:bg-slate-100 transition-colors">
                                                                                {columnDates[i] ? (
                                                                                    <span className="text-[11px] font-bold text-slate-900 font-mono">
                                                                                        {format(new Date(columnDates[i]), 'dd/MM', { locale: th })}
                                                                                    </span>
                                                                                ) : (
                                                                                    <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
                                                                                        <Calendar className="h-3 w-3 text-slate-400" />
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-4 bg-white rounded-none border border-slate-300 shadow-xl">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-[11px] font-bold text-slate-600 uppercase">กำหนดวันที่ (Session {i + 1})</Label>
                                                                                <input
                                                                                    type="date"
                                                                                    className="w-full h-9 border border-slate-300 p-2 text-sm focus:outline-none focus:border-slate-500 rounded-none bg-white font-mono"
                                                                                    value={columnDates[i] ? new Date(columnDates[i]).toISOString().split('T')[0] : ''}
                                                                                    onChange={(e) => handleDateChange(i, e.target.value)}
                                                                                />
                                                                            </div>
                                                                            <Button
                                                                                size="sm"
                                                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-none h-8 text-xs font-bold mt-2"
                                                                                onClick={() => handleGenerateQR(i, groupKey)}
                                                                            >
                                                                                <QrCode className="h-3 w-3 mr-2" /> สร้าง QR Check-in
                                                                            </Button>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupStudents.map((student, index) => {
                                                        const subjectObj = subjects.find(s => s._id === selectedSubject);
                                                        const reg = student.registeredCourses?.find((c: any) =>
                                                            c.subject === subjectObj?.name && (user?.role === 'admin' || c.teacherId === (user?._id || user?.id))
                                                        );
                                                        const used = reg?.usedSessions || 0;
                                                        const total = reg?.totalSessions || 0;
                                                        const isExceeded = total > 0 && used >= total;

                                                        return (
                                                            <TableRow
                                                                key={student._id}
                                                                className={`hover:bg-indigo-50/20 transition-colors border-b border-slate-300 h-11 ${isExceeded ? 'bg-red-50/20' : ''}`}
                                                            >
                                                                <TableCell className="text-center font-bold text-slate-500 text-[11px] border border-slate-300 sticky left-0 bg-white z-20">
                                                                    {index + 1}
                                                                </TableCell>
                                                                <TableCell className="border border-slate-300 sticky left-14 bg-white z-20">
                                                                    <p className="font-bold text-slate-800 text-[12px] truncate w-56 pl-1">
                                                                        {student.studentName || student.displayName}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell className="text-center border border-slate-300 bg-white">
                                                                    <div className={`text-[11px] font-bold font-mono ${isExceeded ? 'text-red-600' : 'text-slate-600'}`}>
                                                                        {used}/{total}
                                                                    </div>
                                                                </TableCell>

                                                                {Array.from({ length: slotCount }).map((_, i) => (
                                                                    <TableCell key={i} className="text-center border border-slate-300 p-0 h-full bg-white relative">
                                                                        {renderCell(student, i)}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {!selectedSubject && (
                        <div className="flex flex-col items-center justify-center h-full border-4 border-dashed border-slate-200 rounded-lg bg-white/50 text-slate-300 py-40">
                            <Search className="h-24 w-24 mb-6 opacity-10" />
                            <p className="text-2xl font-black uppercase tracking-widest opacity-20">กรุณาเลือกวิชาเพื่อดูตารางเช็คชื่อ</p>
                        </div>
                    )}
                </div>
                {/* QR Display Modal */}
                <Dialog open={qrState.isOpen} onOpenChange={(v) => setQrState(prev => ({ ...prev, isOpen: v }))}>
                    <DialogContent className="max-w-md p-8 flex flex-col items-center bg-white rounded-xl">
                        <h3 className="text-xl font-bold mb-2 text-indigo-800">Scan to Check-in</h3>
                        <p className="text-slate-500 text-sm mb-6">Subject: {subjects.find(s => s._id === selectedSubject)?.name}</p>

                        <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-slate-100 flex flex-col items-center mb-4">
                            {qrState.url && <QRCode value={qrState.url} size={200} />}
                        </div>

                        <p className="text-xs text-slate-400">This code expires in 10 minutes.</p>
                        <p className="text-xs text-green-600 font-bold mt-2 animate-pulse">Monitoring check-ins...</p>
                    </DialogContent>
                </Dialog>
            </main >
        </div >
    );
}

