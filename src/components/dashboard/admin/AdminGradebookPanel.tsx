'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Plus, Save, Loader2, FileEdit, Award } from 'lucide-react';
import ScoringDialog from '@/components/dashboard/teacher/ScoringDialog';

interface Props {
    selectedTeacher: any;
    selectedSubject: string;
    subjectId: string;
    enrolledStudents: any[];
    grades: any[];
    onRefresh: () => void;
}

export default function AdminGradebookPanel({ selectedTeacher, selectedSubject, subjectId, enrolledStudents, grades, onRefresh }: Props) {
    const { user } = useAuth();

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [newSheetName, setNewSheetName] = useState('');
    const [newSheetMaxScore, setNewSheetMaxScore] = useState('');
    const [useStandardTemplate, setUseStandardTemplate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingRef, setEditingRef] = useState<{ student: any; sheetName: string; initialData: any } | null>(null);

    const relevantGrades = useMemo(() => {
        return grades.filter((g: any) =>
            g.subjectId === subjectId || g.subjectName === selectedSubject
        );
    }, [grades, subjectId, selectedSubject]);

    const columns = useMemo(() => {
        const uniqueSheets = new Set<string>();
        relevantGrades.forEach((g: any) => {
            if (g.sheets) {
                g.sheets.forEach((s: any) => uniqueSheets.add(s.name));
            }
        });
        return Array.from(uniqueSheets);
    }, [relevantGrades]);

    const studentGradeMap = useMemo(() => {
        const map: Record<string, any> = {};
        enrolledStudents.forEach((s: any) => {
            const grade = relevantGrades.find((g: any) => g.studentId === s._id);
            map[s._id] = grade;
        });
        return map;
    }, [enrolledStudents, relevantGrades]);

    const handleAddSheet = async () => {
        if (!newSheetName) { toast.error('กรุณากรอกชื่อช่องคะแนน'); return; }
        if (!useStandardTemplate && !newSheetMaxScore) { toast.error('กรุณากรอกคะแนนเต็ม'); return; }

        setIsSubmitting(true);
        try {
            const token = await user?.getIdToken();
            if (!token) return;

            const res = await fetch(API_ENDPOINTS.GRADES.BATCH_SHEET, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    studentIds: enrolledStudents.map((s: any) => s._id),
                    subjectId,
                    subjectName: selectedSubject,
                    name: newSheetName,
                    maxScore: useStandardTemplate ? 60 : (Number(newSheetMaxScore) || 10),
                    config: useStandardTemplate ? 'TEMPLATE_DIGITAL_MEDIA' : undefined
                })
            });

            if (res.ok) {
                toast.success(`เพิ่มช่องคะแนน "${newSheetName}" สำเร็จ`);
                setNewSheetName('');
                setNewSheetMaxScore('');
                setUseStandardTemplate(false);
                setIsAddSheetOpen(false);
                onRefresh();
            } else {
                toast.error('เกิดข้อผิดพลาดในการบันทึก');
            }
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSheetTotal = (sheet: any) => {
        if (!sheet?.data) return 0;
        return Object.values(sheet.data).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">สมุดพกคะแนน ({selectedSubject})</h3>
                    <p className="text-sm text-slate-500">{enrolledStudents.length} คน | {columns.length} ช่องคะแนน</p>
                </div>
                <Button onClick={() => setIsAddSheetOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มช่องคะแนน
                </Button>
            </div>

            {columns.length > 0 ? (
                <Card className="rounded-none border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-[50px] text-center border-r border-slate-200 bg-slate-50 sticky left-0 z-20">#</th>
                                        <th className="p-4 min-w-[200px] border-r border-slate-200 bg-slate-50 sticky left-[50px] z-20">ชื่อ-นามสกุล</th>
                                        {columns.map(col => (
                                            <th key={col} className="p-4 min-w-[120px] text-center border-r border-slate-100">{col}</th>
                                        ))}
                                        <th className="p-4 w-[100px] text-center font-bold text-indigo-700 bg-indigo-50/30">รวม</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {enrolledStudents.map((student: any, idx: number) => {
                                        const grade = studentGradeMap[student._id];
                                        return (
                                            <tr key={student._id} className="hover:bg-slate-50/50">
                                                <td className="p-4 text-center border-r border-slate-200 bg-white sticky left-0 z-10">{idx + 1}</td>
                                                <td className="p-4 font-semibold text-slate-700 border-r border-slate-200 bg-white sticky left-[50px] z-10">
                                                    {student.firstName} {student.lastName}
                                                    <div className="text-[10px] text-slate-400 font-normal">{student.studentId || '-'}</div>
                                                </td>
                                                {columns.map(col => {
                                                    const sheet = grade?.sheets?.find((s: any) => s.name === col);
                                                    const score = sheet ? getSheetTotal(sheet) : '-';
                                                    return (
                                                        <td key={col} className="p-4 text-center border-r border-slate-100">
                                                            {sheet ? (
                                                                <div
                                                                    onClick={() => {
                                                                        if (sheet.config === 'TEMPLATE_DIGITAL_MEDIA') {
                                                                            setEditingRef({
                                                                                student,
                                                                                sheetName: col,
                                                                                initialData: sheet.data
                                                                            });
                                                                        }
                                                                    }}
                                                                    className={`inline-flex items-center justify-center min-w-[30px] h-[30px] ${sheet.config === 'TEMPLATE_DIGITAL_MEDIA' ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200' : 'bg-slate-100 text-slate-700 font-mono font-bold cursor-default'}`}
                                                                >
                                                                    {score as React.ReactNode}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/10">
                                                    {grade?.totalScore || 0}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-16 bg-white border border-dashed border-slate-300">
                    <Award className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">ยังไม่มีช่องคะแนน</p>
                    <p className="text-xs text-slate-400 mt-1">กด "เพิ่มช่องคะแนน" เพื่อเริ่มต้น</p>
                </div>
            )}

            {/* Add Sheet Dialog */}
            <Dialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มช่องคะแนนใหม่</DialogTitle>
                        <DialogDescription>เพิ่มช่องเก็บคะแนนให้กับนักเรียนทุกคน</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>ชื่อช่องคะแนน</Label>
                            <Input placeholder="เช่น สอบกลางภาค, เก็บคะแนน 1" value={newSheetName} onChange={e => setNewSheetName(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2 border p-3 bg-slate-50">
                            <Switch
                                id="template-mode"
                                checked={useStandardTemplate}
                                onCheckedChange={(c: boolean) => { setUseStandardTemplate(c); if (c) setNewSheetMaxScore('60'); }}
                            />
                            <Label htmlFor="template-mode" className="cursor-pointer">
                                <div>แบบประเมินมาตรฐาน (12 ข้อ 60 คะแนน)</div>
                            </Label>
                        </div>
                        {!useStandardTemplate && (
                            <div className="space-y-2">
                                <Label>คะแนนเต็ม</Label>
                                <Input type="number" placeholder="10" value={newSheetMaxScore} onChange={e => setNewSheetMaxScore(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddSheet} disabled={isSubmitting}>
                            {isSubmitting ? 'กำลังสร้าง...' : 'สร้าง'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Scoring Dialog */}
            {editingRef && (
                <ScoringDialog
                    isOpen={!!editingRef}
                    onClose={() => setEditingRef(null)}
                    student={editingRef.student}
                    subject={{ _id: subjectId, name: selectedSubject }}
                    sheetName={editingRef.sheetName}
                    initialData={editingRef.initialData}
                    onSave={() => { onRefresh(); setEditingRef(null); }}
                />
            )}
        </div>
    );
}
