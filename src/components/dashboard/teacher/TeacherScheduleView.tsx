'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, BookOpen, Pencil, Save, X, Users, Search, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config'; // Ensure this is available or use strict path if needed
import * as XLSX from 'xlsx';
import StudentEvaluationSummaryDialog from './StudentEvaluationSummaryDialog';
import StudentEvaluationWizardDialog from './StudentEvaluationWizardDialog';

interface TeacherScheduleViewProps {
    students: any[];
    subjects: any[];
    user: any;
}

import { EDUCATION_LEVELS } from '@/lib/constants';

export default function TeacherScheduleView({ students, subjects, user }: TeacherScheduleViewProps) {
    const [groupedStudents, setGroupedStudents] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('all');

    const [summaryStudent, setSummaryStudent] = useState<any>(null);
    const [summarySubject, setSummarySubject] = useState<any>(null);
    const [evaluationWizardStudent, setEvaluationWizardStudent] = useState<any>(null);
    const [evaluationWizardSubject, setEvaluationWizardSubject] = useState<any>(null);

    useEffect(() => {
        processStudents();
    }, [students, subjects]);

    // Editing State
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [newNickname, setNewNickname] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleStartEdit = (student: any) => {
        setEditingStudent(student);
        setNewNickname(student.nickname || '');
    };

    const handleSaveNickname = async () => {
        if (!editingStudent) return;
        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingStudent._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ nickname: newNickname })
            });

            if (res.ok) {
                toast.success('บันทึกชื่อเล่นสำเร็จ');

                // Update local state directly to reflect change without reload
                setGroupedStudents(prev => prev.map(g => ({
                    ...g,
                    students: g.students.map((s: any) =>
                        s._id === editingStudent._id ? { ...s, nickname: newNickname } : s
                    )
                })));

                setEditingStudent(null);
            } else {
                toast.error('บันทึกไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Update error', error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const processStudents = () => {
        const groups: any[] = [];

        subjects.forEach(subject => {
            const studentsInSub = students.filter(s => {
                // Check if valid student for this user/subject
                // Logic derived from page.tsx passing down `students` which is already filtered for the teacher
                // We just need to check if they are enrolled in THIS subject

                // Legacy
                if (s.assignedTeacherId === (user._id || user.id)) {
                    if (s.enrolledSubjects?.includes(subject.name) || s.enrolledSubjects?.includes(subject._id)) return true;
                }

                // New Registration
                if (s.registeredCourses?.some((c: any) => {
                    const isCourseActive = !c.status || c.status === 'active';
                    return c.subject === subject.name && c.teacherId === (user._id || user.id) && isCourseActive;
                })) return true;

                return false;
            });

            if (studentsInSub.length > 0) {
                groups.push({
                    subject: subject,
                    students: studentsInSub
                });
            }
        });

        setGroupedStudents(groups);
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        groupedStudents.forEach(group => {
            const data = group.students.map((s: any, idx: number) => ({
                'ลำดับ': idx + 1,
                'ชื่อ-นามสกุล': s.studentName || s.displayName,
                'ชื่อเล่น': s.nickname || '-',
                'ระดับชั้น': EDUCATION_LEVELS[s.educationLevel] || s.educationLevel || '-',
                'วิชา': group.subject.name
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            // Safe sheet name (max 31 chars)
            const sheetName = (group.subject.name || 'Sheet').substring(0, 30);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        XLSX.writeFile(wb, `Student_List_${user.displayName || 'Teacher'}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="w-7 h-7 text-indigo-700" />
                        ระบบตรวจสอบผลนักเรียน
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">ตรวจสอบผลการประเมินและจัดการข้อมูลของนักเรียนทั้งหมด</p>
                </div>
            </div>

            <div className="space-y-8">
                {groupedStudents.map((group, idx) => (
                    <Card key={idx} className="rounded-none border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-none text-white">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">{group.subject.name}</h3>
                                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 rounded-none">
                                    {group.students.length} คน
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="border border-slate-300 rounded-none px-4 h-11 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-bold"
                                >
                                    <option value="all">สถานะทั้งหมด</option>
                                    <option value="active">กำลังเรียน</option>
                                    <option value="inactive">พักการเรียน</option>
                                </select>
                                <Button variant="outline" onClick={handleExportExcel} className="rounded-none h-11 px-6 border-slate-300 text-slate-700 font-bold hover:bg-slate-100 hidden sm:flex">
                                    <FileDown className="w-4 h-4 mr-2" />
                                    ส่งออก Excel
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="ค้นหาชื่อ หรือ ID นักเรียน..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 h-11 border border-slate-300 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 w-16 text-center bg-slate-50">ลำดับ</th>
                                            <th className="p-4">ชื่อ-นามสกุล</th>
                                            <th className="p-4">ชื่อเล่น</th>
                                            <th className="p-4">ระดับชั้น</th>
                                            <th className="p-4">สถานะ</th>
                                            <th className="p-4 text-right">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {group.students
                                            .filter((s: any) => {
                                                const matchSearch = (s.studentName || s.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.nickname || '').toLowerCase().includes(searchTerm.toLowerCase());
                                                const matchStatus = statusFilter === 'all' ? true : s.status === statusFilter;
                                                return matchSearch && matchStatus;
                                            })
                                            .map((student: any, sIdx: number) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-center font-mono text-slate-400">{sIdx + 1}</td>
                                                <td className="p-4 font-semibold text-slate-700">{student.studentName || student.displayName}</td>
                                                <td className="p-4 text-slate-600">{student.nickname || '-'}</td>
                                                <td className="p-4 text-slate-500">{EDUCATION_LEVELS[student.educationLevel] || student.educationLevel || '-'}</td>
                                                <td className="p-4 align-middle">
                                                    <span className={`px-3 py-1 rounded-none text-xs font-bold border ${student.status === 'active' || student.status === 'กำลังศึกษา' || !student.status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                                                        {student.status === 'active' ? 'กำลังศึกษา' : (student.status || 'กำลังศึกษา')}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" className="h-9 px-4 rounded-none border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold" onClick={() => handleStartEdit(student)}>จัดการข้อมูล</Button>
                                                        <Button variant="outline" size="sm" className="h-9 px-4 rounded-none border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold" onClick={() => {
                                                            setSummaryStudent(student);
                                                            setSummarySubject(group.subject);
                                                        }}>
                                                            <Award className="w-4 h-4 mr-2" /> ดูผลประเมินนักเรียนรายบุคคล
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {groupedStudents.length === 0 && (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-none">
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลนักเรียน</p>
                    </div>
                )}
            </div>

            <Dialog open={!!editingStudent} onOpenChange={(o) => !o && setEditingStudent(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-none border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-indigo-600" />
                            แก้ไขข้อมูลนักเรียน
                        </DialogTitle>
                        <DialogDescription>
                            แก้ไขชื่อเล่นของ {editingStudent?.studentName || editingStudent?.displayName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nickname" className="text-slate-700 font-semibold">ชื่อเล่น</Label>
                            <Input
                                id="nickname"
                                value={newNickname}
                                onChange={(e) => setNewNickname(e.target.value)}
                                placeholder="ระบุชื่อเล่น..."
                                className="col-span-3 rounded-none border-slate-300 focus:border-indigo-500"
                            />
                            <p className="text-xs text-slate-500">* หากไม่มีให้เว้นว่างไว้ ระบบจะแสดงเป็น -</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingStudent(null)} className="rounded-none border-slate-200">ยกเลิก</Button>
                        <Button onClick={handleSaveNickname} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StudentEvaluationSummaryDialog
                isOpen={!!summaryStudent}
                onClose={() => {
                    setSummaryStudent(null);
                    setSummarySubject(null);
                }}
                student={summaryStudent}
                subject={summarySubject}
                teacher={user}
                onProceedToCertificate={(st, su) => {
                    setEvaluationWizardStudent(st);
                    setEvaluationWizardSubject(su);
                }}
            />

            <StudentEvaluationWizardDialog
                isOpen={!!evaluationWizardStudent}
                onClose={() => {
                    setEvaluationWizardStudent(null);
                    setEvaluationWizardSubject(null);
                }}
                student={evaluationWizardStudent}
                subject={evaluationWizardSubject}
                teacher={user}
            />
        </div >
    );
}
