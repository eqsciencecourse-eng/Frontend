'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CalendarCheck, Save, Loader2, Calendar, Info, Search } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

type AttendanceStatus = 'Present' | 'Late' | 'Leave' | 'Absent';

interface AttendanceSlot {
    date: string;
    status: AttendanceStatus;
    remark?: string;
    existingId?: string;
}

interface Props {
    selectedTeacher: any;
    selectedSubject: string;
    subjectId: string;
    enrolledStudents: any[];
    allStudents: any[];
}

export default function AdminAttendanceSheet({ selectedTeacher, selectedSubject, subjectId, enrolledStudents, allStudents }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [students, setStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [gridData, setGridData] = useState<Record<string, Record<number, AttendanceSlot>>>({});
    const [columnDates, setColumnDates] = useState<Record<number, string>>({});

    useEffect(() => {
        if (!user || !selectedSubject) return;
        setStudents(enrolledStudents);
        fetchHistory();
    }, [user, selectedSubject, selectedTeacher]);

    const fetchHistory = async () => {
        if (!user || !subjectId) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/all?subjectId=${subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const history = await res.json();
                const newGrid: Record<string, Record<number, AttendanceSlot>> = {};
                const newDates: Record<number, string> = {};

                const sortedHistory = [...history].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                sortedHistory.forEach((record: any, dateIdx: number) => {
                    newDates[dateIdx] = record.date;
                    record.students.forEach((s: any) => {
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
            console.error('Error fetching attendance history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase();
        return students.filter((s: any) =>
            (s.firstName || '').toLowerCase().includes(q) ||
            (s.lastName || '').toLowerCase().includes(q) ||
            (s.nickname || '').toLowerCase().includes(q) ||
            (s.studentId || '').toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    const slotCount = useMemo(() => {
        let max = 0;
        Object.values(gridData).forEach(slots => {
            const count = Object.keys(slots).length;
            if (count > max) max = count;
        });
        const dateMax = Object.keys(columnDates).length;
        return Math.max(4, Math.max(max, dateMax));
    }, [gridData, columnDates]);

    const handleCellClick = (studentId: string, slotIdx: number, status: AttendanceStatus) => {
        const defaultDate = new Date().toISOString();
        const effectiveDate = columnDates[slotIdx] || defaultDate;

        if (!columnDates[slotIdx]) {
            setColumnDates(prev => ({ ...prev, [slotIdx]: defaultDate }));
        }

        setGridData(prev => {
            const studentSlots = { ...(prev[studentId] || {}) };
            const currentSlot = studentSlots[slotIdx] || { date: effectiveDate, status: 'Present' };
            studentSlots[slotIdx] = { ...currentSlot, status, date: effectiveDate };
            return { ...prev, [studentId]: studentSlots };
        });
    };

    const handleRemarkChange = (studentId: string, slotIdx: number, remark: string) => {
        setGridData(prev => {
            const studentSlots = { ...(prev[studentId] || {}) };
            if (!studentSlots[slotIdx]) return prev;
            studentSlots[slotIdx] = { ...studentSlots[slotIdx], remark };
            return { ...prev, [studentId]: studentSlots };
        });
    };

    const handleDateChange = (slotIdx: number, dateStr: string) => {
        const isoDate = new Date(dateStr).toISOString();
        setColumnDates(prev => ({ ...prev, [slotIdx]: isoDate }));
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

    const handleSave = async () => {
        if (!user || !subjectId) return;
        setSaving(true);
        try {
            const token = await user.getIdToken();

            const byDate: Record<string, any[]> = {};
            Object.values(columnDates).forEach(dateStr => {
                const dateKey = dateStr.split('T')[0];
                if (!byDate[dateKey]) byDate[dateKey] = [];
            });

            Object.entries(gridData).forEach(([studentId, slots]) => {
                const s = allStudents.find((a: any) => a._id === studentId);
                Object.entries(slots).forEach(([slotIdx, data]) => {
                    const dateKey = data.date.split('T')[0];
                    if (!byDate[dateKey]) byDate[dateKey] = [];
                    const exists = byDate[dateKey].some((x: any) => x.studentId === studentId);
                    if (!exists) {
                        byDate[dateKey].push({
                            studentId,
                            firstName: s?.firstName || '',
                            lastName: s?.lastName || '-',
                            nickname: s?.nickname,
                            status: data.status,
                            comment: data.remark
                        });
                    }
                });
            });

            for (const [date, studentList] of Object.entries(byDate)) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subjectId,
                        subjectName: selectedSubject,
                        date,
                        students: studentList
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || `Failed for date ${date}`);
                }
            }

            toast.success('บันทึกข้อมูลการเข้าเรียนเรียบร้อย');
            await fetchHistory();
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหานักเรียน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-none border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-none px-6 h-10 font-bold flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        บันทึก
                    </Button>
                </div>
            </div>

            {/* Attendance Sheet */}
            {filteredStudents.length > 0 ? (
                <div className="bg-white border border-slate-300 overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="text-left px-4 py-3 font-bold text-slate-700 border-r border-slate-300 sticky left-0 bg-slate-100 z-10 min-w-[180px]">ชื่อนักเรียน</th>
                                <th className="text-center px-3 py-3 font-bold text-slate-700 border-r border-slate-300 bg-slate-100 w-20">Quota</th>
                                {Array.from({ length: slotCount }).map((_, i) => (
                                    <th key={i} className="text-center border-r border-slate-300 bg-white min-w-[110px] p-0">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase py-1.5 border-b border-slate-300 bg-slate-50">ครั้งที่ {i + 1}</div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="w-full py-2 hover:bg-slate-50">
                                                    {columnDates[i] ? (
                                                        <span className="text-[11px] font-bold text-slate-800 font-mono">
                                                            {format(new Date(columnDates[i]), 'dd/MM', { locale: th })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">เลือกวันที่</span>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-3 bg-white rounded-none border border-slate-300 shadow-lg">
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold text-slate-600 uppercase">วันที่</Label>
                                                    <input
                                                        type="date"
                                                        className="w-full h-9 border border-slate-300 p-2 text-sm focus:outline-none focus:border-indigo-500 rounded-none bg-white font-mono"
                                                        value={columnDates[i] ? new Date(columnDates[i]).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleDateChange(i, e.target.value)}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredStudents.map((student: any) => (
                                <tr key={student._id} className="hover:bg-indigo-50/20">
                                    <td className="px-4 py-2.5 border-r border-slate-200 sticky left-0 bg-white z-10">
                                        <p className="font-medium text-slate-800 text-sm">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        <p className="text-[10px] text-slate-400">{student.nickname} | {student.studentId}</p>
                                    </td>
                                    <td className="text-center border-r border-slate-200 bg-white">
                                        <span className="text-[11px] font-mono font-bold text-slate-500">
                                            {student.registeredCourses?.find((rc: any) => rc.subject === selectedSubject)?.usedSessions || 0}/
                                            {student.registeredCourses?.find((rc: any) => rc.subject === selectedSubject)?.totalSessions || '-'}
                                        </span>
                                    </td>
                                    {Array.from({ length: slotCount }).map((_, i) => {
                                        const data = gridData[student._id]?.[i];
                                        const status = data?.status;
                                        const remark = data?.remark || '';
                                        const hasDate = !!columnDates[i];

                                        return (
                                            <td key={i} className={`text-center border-r border-slate-100 p-1 ${!hasDate && !status ? 'bg-slate-50/50' : ''}`}>
                                                {hasDate || status ? (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button
                                                                className={`w-full h-8 text-[10px] font-bold rounded-none flex items-center justify-center gap-1 border-b-2 transition-all
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
                                                        <PopoverContent className="w-64 p-4 bg-white rounded-none border border-slate-300 shadow-xl" align="center">
                                                            <div className="space-y-4">
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-2">เช็คชื่อ</h4>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, i, 'Present')}>มา</Button>
                                                                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, i, 'Late')}>สาย</Button>
                                                                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, i, 'Leave')}>ลา</Button>
                                                                    <Button size="sm" className="bg-red-500 hover:bg-red-600 rounded-none h-9 text-xs" onClick={() => handleCellClick(student._id, i, 'Absent')}>ขาด</Button>
                                                                </div>
                                                                {status && status !== 'Present' && (
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-bold text-slate-400">หมายเหตุ</Label>
                                                                        <Input
                                                                            placeholder="เหตุผล..."
                                                                            className="h-8 text-xs rounded-none border-slate-200"
                                                                            value={remark}
                                                                            onChange={(e) => handleRemarkChange(student._id, i, e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                ) : (
                                                    <div className="flex items-center justify-center h-8">
                                                        <div className="h-2 w-2 rounded-full bg-slate-200" />
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
            ) : (
                <div className="text-center py-16 bg-white border border-dashed border-slate-300">
                    <CalendarCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">ไม่มีนักเรียนในวิชานี้</p>
                </div>
            )}
        </div>
    );
}
