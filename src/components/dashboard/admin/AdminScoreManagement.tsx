'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import {
    Users, BookOpen, ArrowLeft, Search, GraduationCap,
    Mail, ChevronRight, ClipboardList, Award
} from 'lucide-react';
import StudentDetailsDialog from '@/components/dashboard/teacher/StudentDetailsDialog';
import StudentEvaluationWizardDialog from '@/components/dashboard/teacher/StudentEvaluationWizardDialog';

export default function AdminScoreManagement() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const [evalDialog, setEvalDialog] = useState<{
        isOpen: boolean;
        student: any;
        subject: any;
    }>({ isOpen: false, student: null, subject: null });

    const [gradeDialog, setGradeDialog] = useState<{
        isOpen: boolean;
        student: any;
        subject: any;
    }>({ isOpen: false, student: null, subject: null });

    const normalizeId = (id: any) => id ? String(id) : '';

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [usersRes, studentsRes, subjectsRes] = await Promise.all([
                fetch(API_ENDPOINTS.ADMIN.USERS, { headers }),
                fetch(API_ENDPOINTS.USERS.STUDENTS, { headers }),
                fetch(API_ENDPOINTS.SUBJECTS.LIST),
            ]);

            if (usersRes.ok) {
                const users = await usersRes.json();
                if (Array.isArray(users)) {
                    setTeachers(users.filter((u: any) => u.role === 'teacher' && u.isApproved !== false));
                }
            }
            if (studentsRes.ok) {
                const data = await studentsRes.json();
                if (Array.isArray(data)) setAllStudents(data);
            }
            if (subjectsRes.ok) {
                const data = await subjectsRes.json();
                if (Array.isArray(data)) setSubjects(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    const filteredTeachers = useMemo(() => {
        if (!searchQuery.trim()) return teachers;
        const q = searchQuery.toLowerCase();
        return teachers.filter(t =>
            t.displayName?.toLowerCase().includes(q) ||
            t.email?.toLowerCase().includes(q) ||
            t.firstName?.toLowerCase().includes(q) ||
            t.lastName?.toLowerCase().includes(q)
        );
    }, [teachers, searchQuery]);

    const teacherSubjectMap = useMemo(() => {
        const map: Record<string, Set<string>> = {};
        teachers.forEach(t => { map[normalizeId(t._id || t.id)] = new Set<string>(); });

        allStudents.forEach((s: any) => {
            (s.registeredCourses || []).forEach((rc: any) => {
                const tid = normalizeId(rc.teacherId);
                if (tid && map[tid]) map[tid].add(rc.subject);
            });
            const legacyTid = normalizeId(s.assignedTeacherId);
            if (legacyTid && map[legacyTid]) {
                (s.enrolledSubjects || []).forEach((sub: string) => map[legacyTid].add(sub));
            }
        });

        teachers.forEach(t => {
            const tid = normalizeId(t._id || t.id);
            (t.authorizedSubjects || []).forEach((s: string) => {
                const sub = subjects.find((sub: any) => sub._id === s || sub.name === s);
                if (sub) map[tid]?.add(sub.name);
            });
        });

        return map;
    }, [teachers, allStudents, subjects]);

    const getTeacherSubjects = (teacher: any) => {
        const tid = normalizeId(teacher._id || teacher.id);
        const subjectNames = teacherSubjectMap[tid];
        if (!subjectNames) return [];
        return Array.from(subjectNames).map(name => ({
            name,
            subject: subjects.find(s => s.name === name)
        }));
    };

    const getStudentsForSubject = (teacherId: string, subjectName: string) => {
        return allStudents.filter((s: any) => {
            const matchesRegistered = (s.registeredCourses || []).some(
                (rc: any) => normalizeId(rc.teacherId) === teacherId && rc.subject === subjectName
            );
            const matchesLegacy = normalizeId(s.assignedTeacherId) === teacherId && (s.enrolledSubjects || []).includes(subjectName);
            return matchesRegistered || matchesLegacy;
        });
    };

    const getSubjectId = (subjectName: string) => {
        return subjects.find(s => s.name === subjectName)?._id || '';
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    // ==================== VIEW: Student list (with 2 buttons) ====================
    if (selectedTeacher && selectedSubject) {
        const teacherId = normalizeId(selectedTeacher._id || selectedTeacher.id);
        const enrolledStudents = getStudentsForSubject(teacherId, selectedSubject);
        const subjectInfo = subjects.find(s => s.name === selectedSubject);

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}
                        className="rounded-none flex items-center gap-2 text-slate-600 hover:text-indigo-600">
                        <ArrowLeft className="h-4 w-4" /> กลับ
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{selectedSubject}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            ครู {selectedTeacher.displayName} • {enrolledStudents.length} คน
                            {subjectInfo?.code && <> • รหัสวิชา {subjectInfo.code}</>}
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-3 font-bold text-slate-600">#</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-600">ชื่อ-นามสกุล</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-600">ชื่อเล่น</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-600">รหัสนักเรียน</th>
                                    <th className="text-center px-4 py-3 font-bold text-slate-600" colSpan={2}>ระบบจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrolledStudents.map((s: any, idx: number) => (
                                    <tr key={s._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{s.nickname || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-mono">{s.studentId || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="sm" onClick={() => setEvalDialog({
                                                isOpen: true,
                                                student: s,
                                                subject: { _id: getSubjectId(selectedSubject), name: selectedSubject }
                                            })}
                                                className="rounded-none bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5">
                                                <ClipboardList className="h-3.5 w-3.5" /> ประเมิน
                                            </Button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="sm" onClick={() => setGradeDialog({
                                                isOpen: true,
                                                student: s,
                                                subject: { _id: getSubjectId(selectedSubject), name: selectedSubject }
                                            })}
                                                className="rounded-none bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5">
                                                <Award className="h-3.5 w-3.5" /> ออกเกรด
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {enrolledStudents.length === 0 && (
                        <div className="text-center py-16">
                            <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">ไม่มีนักเรียนในวิชานี้</p>
                        </div>
                    )}
                </div>

                {/* Evaluation Dialog - Clone of teacher StudentDetailsDialog */}
                {evalDialog.isOpen && (
                    <StudentDetailsDialog
                        isOpen={evalDialog.isOpen}
                        onClose={() => setEvalDialog({ isOpen: false, student: null, subject: null })}
                        student={evalDialog.student}
                        subject={evalDialog.subject}
                        teacher={user}
                        onUpdate={fetchData}
                    />
                )}

                {/* Grade/Certificate Dialog - Clone of teacher StudentEvaluationWizardDialog */}
                {gradeDialog.isOpen && (
                    <StudentEvaluationWizardDialog
                        isOpen={gradeDialog.isOpen}
                        onClose={() => setGradeDialog({ isOpen: false, student: null, subject: null })}
                        student={gradeDialog.student}
                        subject={gradeDialog.subject}
                        teacher={user}
                        onUpdate={fetchData}
                    />
                )}
            </div>
        );
    }

    // ==================== VIEW: Teacher detail (subjects) ====================
    if (selectedTeacher) {
        const subjectList = getTeacherSubjects(selectedTeacher);

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTeacher(null)}
                        className="rounded-none flex items-center gap-2 text-slate-600 hover:text-indigo-600">
                        <ArrowLeft className="h-4 w-4" /> กลับ
                    </Button>
                    <div className="flex items-center gap-4 flex-1">
                        <div className="h-14 w-14 bg-indigo-600 rounded-none flex items-center justify-center text-white font-bold text-xl">
                            {selectedTeacher.displayName?.charAt(0) || 'T'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{selectedTeacher.displayName}</h2>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {selectedTeacher.email || '-'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {subjectList.length} วิชา</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {subjectList.map((entry) => {
                        const teacherId = normalizeId(selectedTeacher._id || selectedTeacher.id);
                        const studentCount = getStudentsForSubject(teacherId, entry.name).length;

                        return (
                            <Card key={entry.name}
                                className="rounded-none border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                                onClick={() => { setSelectedSubject(entry.name); }}
                            >
                                <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 px-6 rounded-none">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 p-2 rounded-none">
                                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-800">{entry.name}</CardTitle>
                                                {entry.subject?.code && (
                                                    <p className="text-xs text-slate-400 mt-0.5">รหัสวิชา: {entry.subject.code}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-slate-400">{studentCount} คน</span>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}

                    {subjectList.length === 0 && (
                        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-none">
                            <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">ครูคนนี้ยังไม่มีรายวิชาที่ได้รับมอบหมาย</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==================== VIEW: Teacher list (default) ====================
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">จัดการผลคะแนน</h2>
                <p className="text-slate-500 mt-1">
                    เลือกครูเพื่อดูรายวิชาและจัดการคะแนนนักเรียน
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="ค้นหาครู..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-none border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-indigo-600 text-white rounded-none border-none shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm">ครูทั้งหมด</p>
                                <p className="text-3xl font-bold mt-1">{teachers.length}</p>
                            </div>
                            <GraduationCap className="h-10 w-10 text-indigo-300" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white rounded-none border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm">รายวิชาทั้งหมด</p>
                                <p className="text-3xl font-bold text-slate-800 mt-1">{subjects.length}</p>
                            </div>
                            <BookOpen className="h-10 w-10 text-slate-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                {filteredTeachers.map((teacher) => {
                    const tid = normalizeId(teacher._id || teacher.id);
                    const subjectList = getTeacherSubjects(teacher);
                    const totalStudents = allStudents.filter((s: any) => {
                        const matchesRegistered = (s.registeredCourses || []).some((rc: any) => normalizeId(rc.teacherId) === tid);
                        const matchesLegacy = normalizeId(s.assignedTeacherId) === tid;
                        return matchesRegistered || matchesLegacy;
                    }).length;

                    return (
                        <Card key={tid}
                            className="rounded-none border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                            onClick={() => { setSelectedTeacher(teacher); setSelectedSubject(null); }}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-indigo-600 rounded-none flex items-center justify-center text-white font-bold text-lg group-hover:bg-indigo-700 transition-colors">
                                            {teacher.displayName?.charAt(0) || 'T'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">
                                                {teacher.displayName}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {teacher.email || '-'}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {subjectList.length} วิชา</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {totalStudents} คน</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {filteredTeachers.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-none">
                        <GraduationCap className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">
                            {searchQuery ? 'ไม่พบครูที่ค้นหา' : 'ยังไม่มีครูในระบบ'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
