import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2, Save, FileEdit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useAuth } from '@/context/AuthContext';
import ScoringDialog from './ScoringDialog';

interface GradebookViewProps {
    students: any[];
    grades: any[];
    subject: any;
    onUpdate: () => void;
}

export default function GradebookView({ students, grades, subject, onUpdate }: GradebookViewProps) {
    const { user } = useAuth();
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [newSheetName, setNewSheetName] = useState('');
    const [newSheetMaxScore, setNewSheetMaxScore] = useState('');
    const [useStandardTemplate, setUseStandardTemplate] = useState(false);

    const [editingRef, setEditingRef] = useState<{ student: any, sheetName: string, initialData: any } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter grades for this subject and these students
    const relevantGrades = useMemo(() => {
        return grades.filter(g =>
            g.subjectId === subject._id || g.subjectName === subject.name
        );
    }, [grades, subject]);

    // Extract Unique Sheets (Columns)
    const columns = useMemo(() => {
        const uniqueSheets = new Set<string>();
        relevantGrades.forEach(g => {
            if (g.sheets) {
                g.sheets.forEach((s: any) => uniqueSheets.add(s.name));
            }
        });
        return Array.from(uniqueSheets);
    }, [relevantGrades]);

    // Map Student -> Grade Record
    const studentGradeMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => {
            const grade = relevantGrades.find(g => g.studentId === s._id);
            map[s._id] = grade;
        });
        return map;
    }, [students, relevantGrades]);

    const handleAddSheet = async () => {
        if (!newSheetName) return;
        if (!useStandardTemplate && !newSheetMaxScore) return;

        setIsSubmitting(true);
        try {
            const token = await user?.getIdToken();
            if (!token) return;

            // Call Batch Endpoint
            const res = await fetch(API_ENDPOINTS.GRADES.BATCH_SHEET, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentIds: students.map(s => s._id),
                    subjectId: subject._id,
                    subjectName: subject.name,
                    name: newSheetName,
                    maxScore: useStandardTemplate ? 60 : (Number(newSheetMaxScore) || 10),
                    // Special config flag to tell frontend this is a complex sheet
                    config: useStandardTemplate ? 'TEMPLATE_DIGITAL_MEDIA' : undefined
                })
            });

            if (res.ok) {
                toast.success(`เพิ่มช่องคะแนน "${newSheetName}" ให้กับนักเรียน ${students.length} คนสำเร็จ`);
                onUpdate(); // Refresh Data
                setNewSheetName('');
                setNewSheetMaxScore('');
                setUseStandardTemplate(false);
            } else {
                toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to add sheet");
        } finally {
            setIsSubmitting(false);
            setIsAddSheetOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">สมุดพกคะแนน ({subject.name})</h2>
                    <p className="text-slate-500">จัดการคะแนนของนักเรียนทั้งห้องในรูปแบบตาราง</p>
                </div>
                <Button onClick={() => setIsAddSheetOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มช่องคะแนน
                </Button>
            </div>

            <Card className="rounded-none border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-[50px] text-center border-r border-slate-200 bg-slate-50 sticky left-0 z-20">#</th>
                                    <th className="p-4 w-[250px] border-r border-slate-200 bg-slate-50 sticky left-[50px] z-20 shadow-sm">ชื่อ-นามสกุล</th>
                                    {columns.map(col => (
                                        <th key={col} className="p-4 min-w-[120px] text-center border-r border-slate-100">
                                            {col}
                                        </th>
                                    ))}
                                    <th className="p-4 w-[100px] text-center font-bold text-indigo-700 bg-indigo-50/30">รวม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.map((student, idx) => {
                                    const grade = studentGradeMap[student._id];
                                    return (
                                        <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-center border-r border-slate-200 bg-white sticky left-0 z-10">{idx + 1}</td>
                                            <td className="p-4 font-semibold text-slate-700 border-r border-slate-200 bg-white sticky left-[50px] z-10 shadow-sm">
                                                {student.studentName || student.displayName}
                                                <div className="text-[10px] text-slate-400 font-normal">{student.studentId || '-'}</div>
                                            </td>
                                            {columns.map(col => {
                                                const sheet = grade?.sheets?.find((s: any) => s.name === col);
                                                const score = sheet?.data ? Object.values(sheet.data).reduce((a: number, b: any) => a + (Number(b) || Number(b.score) || 0), 0) : '-';

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
                                                                className={`inline-flex items-center justify-center min-w-[30px] h-[30px] rounded-md ${sheet.config === 'TEMPLATE_DIGITAL_MEDIA' ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200' : 'bg-slate-100 text-slate-700 font-mono font-bold cursor-default'}`}
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

            {/* Add Sheet Dialog */}
            <Dialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มช่องคะแนนใหม่</DialogTitle>
                        <DialogDescription>เพิ่มช่องเก็บคะแนนให้กับนักเรียนทุกคนในห้องนี้</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>ชื่อช่องคะแนน</Label>
                            <Input
                                placeholder="เช่น สอบกลางภาค, เก็บ 1"
                                value={newSheetName}
                                onChange={e => setNewSheetName(e.target.value)}
                            />
                        </div>

                        {/* Template Toggle */}
                        <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
                            <Switch
                                id="template-mode"
                                checked={useStandardTemplate}
                                onCheckedChange={(c: boolean) => {
                                    setUseStandardTemplate(c);
                                    if (c) setNewSheetMaxScore('60');
                                }}
                            />
                            <Label htmlFor="template-mode" className="cursor-pointer">
                                <div>แบบประเมินมาตรฐาน (Digital Media)</div>
                                <div className="text-xs text-slate-500 font-normal">ใช้เกณฑ์ 12 ข้อ (60 คะแนน) ตามตารางประเมิน</div>
                            </Label>
                        </div>

                        {!useStandardTemplate && (
                            <div className="space-y-2">
                                <Label>คะแนนเต็ม</Label>
                                <Input
                                    type="number"
                                    placeholder="10"
                                    value={newSheetMaxScore}
                                    onChange={e => setNewSheetMaxScore(e.target.value)}
                                />
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
                    subject={subject}
                    sheetName={editingRef.sheetName}
                    initialData={editingRef.initialData}
                    onSave={() => {
                        onUpdate();
                        setEditingRef(null);
                    }}
                />
            )}
        </div>
    );
}
