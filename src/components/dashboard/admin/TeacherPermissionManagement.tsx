import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Shield, Users, Search, Clock, ChevronsUpDown } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeacherPermissionManagementProps {
    users: any[];
    onUpdateUser: () => void;
}

export default function TeacherPermissionManagement({ users, onUpdateUser }: TeacherPermissionManagementProps) {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [viewingSubject, setViewingSubject] = useState<any>(null); // The subject currently being managed

    const teachers = users.filter((u: any) => u.role === 'teacher');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch subjects', error);
        }
    };

    const getEnrolledStudents = (subjectName: string) => {
        // Find students who have this subject in their enrolledSubjects array OR registeredClasses OR registeredCourses
        return users.filter((u: any) =>
            u.role === 'student' && (
                u.enrolledSubjects?.includes(subjectName) ||
                u.registeredClasses?.some((c: any) => c.className === subjectName) ||
                u.registeredCourses?.some((c: any) => c.subject === subjectName)
            )
        );
    };

    const countStudents = (subjectName: string) => getEnrolledStudents(subjectName).length;

    const handleAssignTeacherToStudent = async (studentId: string, teacherId: string) => {
        if (!user) return;

        // [FIX] Find student to update specific course details
        const student = users.find(u => u._id === studentId);
        if (!student) return;

        const payload: any = { assignedTeacherId: teacherId };

        // Check if student has registeredCourses and update the specific subject
        if (student.registeredCourses && Array.isArray(student.registeredCourses) && viewingSubject) {
            const updatedCourses = student.registeredCourses.map((c: any) => {
                if (c.subject === viewingSubject.name) {
                    return {
                        ...c,
                        teacherId: teacherId,
                        teacherName: teachers.find((t: any) => t._id === teacherId)?.displayName || 'Unknown'
                    };
                }
                return c;
            });
            payload.registeredCourses = updatedCourses;
        }

        try {
            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${studentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('บันทึกครูผู้สอนเรียบร้อยแล้ว');
                onUpdateUser(); // Refresh data
            } else {
                toast.error('เกิดข้อผิดพลาดในการบันทึก');
            }
        } catch (error) {
            console.error('Error assigning teacher:', error);
            toast.error('Server error');
        }
    };

    // Sort logic for students
    const getSortedStudents = (subjectName: string) => {
        const students = getEnrolledStudents(subjectName);
        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

        return students.sort((a: any, b: any) => {
            const getTimeInfo = (u: any) => {
                // Try registeredCourses first
                const course = u.registeredCourses?.find((c: any) => c.subject === subjectName);
                let timeStr = '';

                if (course) {
                    timeStr = `${course.day} ${course.time}`;
                } else {
                    // Fallback to legacy registeredClasses
                    const cls = u.registeredClasses?.find((c: any) => c.className === subjectName);
                    timeStr = cls?.classTime || '';
                }

                const dayPart = timeStr.split(' ')[0];
                const timePart = timeStr.split(' ')[1] || '00:00';
                let dayIndex = days.findIndex(d => dayPart.includes(d));
                if (dayIndex === -1) dayIndex = 99;
                return { dayIndex, timePart };
            };

            const tA = getTimeInfo(a);
            const tB = getTimeInfo(b);

            if (tA.dayIndex !== tB.dayIndex) return tA.dayIndex - tB.dayIndex;
            return tA.timePart.localeCompare(tB.timePart);
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'studying':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 rounded-none">กำลังเรียน</Badge>;
            case 'drop':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 rounded-none">ดรอป</Badge>;
            case 'resigned':
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 rounded-none">ลาออก</Badge>;
            case 'finished':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 rounded-none">จบหลักสูตร</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-500 rounded-none">{status || 'ไม่ระบุ'}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-indigo-600" />
                    จัดการสิทธิ์และผู้รับผิดชอบ
                </h2>
                <p className="text-sm text-slate-500 mt-1">กำหนดครูประจำวิชาและผู้รับผิดชอบนักเรียนรายวิชา</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {subjects.map((subject) => {
                    const studentCount = countStudents(subject.name);
                    return (
                        <Card key={subject._id} className="rounded-none border hover:shadow-md transition-all duration-200 group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors"></div>
                            <CardContent className="p-5 pl-7">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-10 w-10 bg-indigo-50 flex items-center justify-center rounded-none text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <Badge variant="secondary" className="rounded-none bg-slate-100 text-slate-600 font-mono text-xs">
                                        ID: {subject._id.slice(-4)}
                                    </Badge>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1 truncate" title={subject.name}>
                                    {subject.name}
                                </h3>

                                <div className="flex items-end gap-2 mb-6">
                                    <span className="text-3xl font-bold text-indigo-600 font-mono tracking-tight">{studentCount}</span>
                                    <span className="text-sm text-slate-500 mb-1">นักเรียน</span>
                                </div>

                                <Button
                                    className="w-full rounded-none bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    onClick={() => setViewingSubject(subject)}
                                >
                                    กำหนดสิทธิ์ครู
                                    <ChevronsUpDown className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Management Dialog */}
            <Dialog open={!!viewingSubject} onOpenChange={(o) => !o && setViewingSubject(null)}>
                <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 rounded-none overflow-hidden sm:max-w-screen-xl">
                    <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-100 rounded-none flex items-center justify-center text-indigo-600">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-800">
                                        จัดการสิทธิ์: {viewingSubject?.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 mt-1 flex items-center gap-2">
                                        <Users className="w-3 h-3" />
                                        <span>จำนวนนักเรียนทั้งหมด {viewingSubject ? countStudents(viewingSubject.name) : 0} คน</span>
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => setViewingSubject(null)} className="rounded-none hover:bg-red-50 hover:text-red-500">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[30%] py-4 pl-6 font-bold text-slate-700">ชื่อนักเรียน</TableHead>
                                        <TableHead className="w-[15%] py-4 font-bold text-slate-700">สถานะ</TableHead>
                                        <TableHead className="w-[20%] py-4 font-bold text-slate-700 center">เวลาเรียน</TableHead>
                                        <TableHead className="w-[35%] py-4 font-bold text-slate-700">ครูผู้รับผิดชอบ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewingSubject && getSortedStudents(viewingSubject.name).map((student: any) => {
                                        // Try to get course from registeredCourses first
                                        const course = student.registeredCourses?.find((c: any) => c.subject === viewingSubject.name);
                                        let classTime = '-';

                                        if (course) {
                                            classTime = `${course.day} ${course.time}`;
                                        } else {
                                            // Fallback to legacy
                                            const registeredClass = student.registeredClasses?.find((c: any) => c.className === viewingSubject.name);
                                            classTime = registeredClass?.classTime || '-';
                                        }

                                        // Fallback logic for display name
                                        const displayName = student.studentName || student.displayName || '-';

                                        return (
                                            <TableRow key={student._id} className="hover:bg-slate-50/80 transition-colors">
                                                <TableCell className="py-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                                            {displayName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{displayName}</p>
                                                            <p className="text-xs text-slate-500">{student.nickname || '-'} {student.studentClass ? `(${student.studentClass})` : ''}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(student.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2 py-1 rounded-none border border-slate-100 w-fit">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="font-mono text-sm">{classTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={student.assignedTeacherId || "unassigned"}
                                                            onValueChange={(value) => {
                                                                if (value && value !== "unassigned") {
                                                                    handleAssignTeacherToStudent(student._id, value);
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="w-full rounded-none border-slate-200 h-9 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm">
                                                                <SelectValue placeholder="เลือกครูผู้สอน..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[200px] rounded-none">
                                                                <SelectItem value="unassigned" className="text-slate-400">เลือกครูผู้สอน...</SelectItem>
                                                                {teachers.map((t: any) => (
                                                                    <SelectItem key={t._id} value={t._id}>
                                                                        {t.displayName}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {viewingSubject && countStudents(viewingSubject.name) === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <Users className="w-12 h-12 mb-3 opacity-20" />
                                                    <p className="text-lg font-medium">ไม่มีนักเรียนลงทะเบียนในวิชานี้</p>
                                                    <p className="text-sm">เพิ่มนักเรียนในเมนู "สร้างผู้ใช้งานใหม่" หรือ "ลงทะเบียนเรียน"</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
