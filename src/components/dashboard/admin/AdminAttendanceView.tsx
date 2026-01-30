
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Search, FileDown, Calendar, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import AdminAttendanceDetailModal from './AdminAttendanceDetailModal';

import { useAuth } from '@/context/AuthContext';

export default function AdminAttendanceView() {
    const { fetchWithAuth } = useAuth();
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchSubjects();
        fetchAttendance();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate, selectedSubject]);

    const [teachers, setTeachers] = useState<any[]>([]);

    useEffect(() => {
        fetchSubjects();
        fetchTeachers();
        fetchAttendance();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (res.ok) setSubjects(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTeachers = async () => {
        try {
            // Fetch all users and filter for teachers, or use specific endpoint if available
            // Using ALL users list to be safe as teacher ID might belong to a user who is not currently a 'teacher' role (?)
            // But for efficiency let's try to get a list.
            // Since we need to resolve IDs, getting all users is safest for now or we can assume they are in the list.
            const res = await fetchWithAuth(API_ENDPOINTS.USERS.LIST);
            if (res.ok) {
                const data = await res.json();
                // Filter only teachers or store all for lookup
                setTeachers(data);
            }
        } catch (e) {
            console.error('Failed to fetch teachers', e);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            // Build query
            const params = new URLSearchParams();
            if (selectedDate) params.append('date', selectedDate);
            if (selectedSubject && selectedSubject !== 'all') params.append('subjectId', selectedSubject);

            // Use fetchWithAuth for automatic token injection
            const res = await fetchWithAuth(`${API_ENDPOINTS.ATTENDANCE.ALL}?${params.toString()}`);

            if (res.ok) {
                setAttendances(await res.json());
            } else {
                if (res.status === 401) {
                    toast.error('Session expired. Please login again.');
                }
            }
        } catch (error) {
            console.error('Failed to fetch attendance', error);
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    // Filter by search term (Student Name)
    const filteredAttendances = attendances.filter(record => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        // Check subject name or student names inside
        const subjectMatch = record.subjectName?.toLowerCase().includes(lowerTerm);
        const studentMatch = record.students?.some((s: any) =>
            s.firstName?.toLowerCase().includes(lowerTerm) ||
            s.lastName?.toLowerCase().includes(lowerTerm)
        );
        return subjectMatch || studentMatch;
    });

    // Export PDF (Placeholder - simple print for now if no lib)
    const handleExport = () => {
        window.print();
    };

    const getTeacherName = (id: string) => {
        if (!id) return '-';
        if (teachers.length === 0) return id; // Loading or empty

        const teacher = teachers.find(t =>
            t._id === id ||
            t.id === id ||
            t.firebaseUid === id ||
            String(t._id) === String(id)
        );

        return teacher ? (teacher.displayName || teacher.username || teacher.email) : id;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">ระบบเช็คชื่อ</h2>
                    <p className="text-slate-500">ดูรายการเช็คชื่อย้อนหลังและสรุปผล</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2 rounded-none">
                    <FileDown className="h-4 w-4" />
                    ส่งออก PDF
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm rounded-none bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative w-[200px]">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="date"
                                    className="pl-9 rounded-none border-slate-200"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="w-[200px] rounded-none border-slate-200">
                                    <SelectValue placeholder="เลือกวิชา" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="all">ทุกวิชา</SelectItem>
                                    {subjects.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="ค้นหาชื่อนักเรียน หรือ วิชา..."
                                className="pl-9 rounded-none border-slate-200"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>วันที่</TableHead>
                                    <TableHead>วิชา</TableHead>
                                    <TableHead>จำนวนนักเรียน</TableHead>
                                    <TableHead className="text-center">เข้าเรียน</TableHead>
                                    <TableHead className="text-center">มาสาย</TableHead>
                                    <TableHead className="text-center">ลา</TableHead>
                                    <TableHead className="text-center">ขาดเรียน</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAttendances.length > 0 ? filteredAttendances.map(record => {
                                    const total = record.students?.length || 0;
                                    const present = record.students?.filter((s: any) => s.status === 'Present').length;
                                    const late = record.students?.filter((s: any) => s.status === 'Late').length;
                                    const leave = record.students?.filter((s: any) => s.status === 'Leave').length;
                                    const absent = record.students?.filter((s: any) => s.status === 'Absent').length;

                                    return (
                                        <TableRow key={record._id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium text-slate-700">
                                                {format(new Date(record.date), 'd MMM yyyy', { locale: th })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-indigo-700">{record.subjectName}</div>
                                                <div className="text-xs text-slate-500">
                                                    ครูผู้สอน: {getTeacherName(record.teacherId)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="h-4 w-4 text-slate-400" />
                                                    {total} คน
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-green-600 font-bold">{present}</TableCell>
                                            <TableCell className="text-center text-yellow-600 font-bold">{late}</TableCell>
                                            <TableCell className="text-center text-blue-600 font-bold">{leave}</TableCell>
                                            <TableCell className="text-center text-red-600 font-bold">{absent}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-none hover:bg-slate-100"
                                                    onClick={() => {
                                                        setSelectedRecord({
                                                            ...record,
                                                            teacherName: getTeacherName(record.teacherId)
                                                        });
                                                        setIsDetailOpen(true);
                                                    }}
                                                >
                                                    รายละเอียด
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                            ไม่พบข้อมูลการเช็คชื่อ
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AdminAttendanceDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                record={selectedRecord}
            />
        </div>
    );
}
