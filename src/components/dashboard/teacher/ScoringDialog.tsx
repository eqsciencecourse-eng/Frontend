import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useAuth } from '@/context/AuthContext';

interface ScoringDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    sheetName: string;
    initialData: any;
    onSave: () => void;
}

const CRITERIA = [
    { id: '1.1', label: '1.1 ด้านองค์ความรู้ (Knowledge)', max: 5 },
    { id: '2.1', label: '2.1 ความคิดสร้างสรรค์ (Creative)', max: 5 },
    { id: '2.2', label: '2.2 การวางแผน (Planning & Time)', max: 5 },
    { id: '2.3', label: '2.3 การแก้ปัญหา (Solving)', max: 5 },
    { id: '2.4', label: '2.4 ปรับปรุงการออกแบบ (Design)', max: 5 },
    { id: '2.5', label: '2.5 ทักษะการเขียนโปรแกรม (Code)', max: 5 },
    { id: '2.6', label: '2.6 การนำเสนอ (Presentation)', max: 5 },
    { id: '2.7', label: '2.7 ทักษะทางอารมณ์ (EQ)', max: 5 },
    { id: '3', label: '3. ความรับผิดชอบ (Responsibility)', max: 5 },
    { id: '4', label: '4. การทำงานร่วมกัน (Teamwork)', max: 5 },
    { id: '5', label: '5. การมีส่วนร่วม (Participation)', max: 5 },
    { id: '6', label: '6. การตรงต่อเวลา (Punctuality)', max: 5 },
];

export default function ScoringDialog({ isOpen, onClose, student, subject, sheetName, initialData, onSave }: ScoringDialogProps) {
    const { user } = useAuth();
    const [scores, setScores] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            // Load existing scores
            setScores(initialData);
        } else if (isOpen) {
            // Reset if no data
            setScores({});
        }
    }, [isOpen, initialData]);

    const handleScoreChange = (id: string, value: string) => {
        const val = parseInt(value);
        if (isNaN(val)) return;
        setScores(prev => ({
            ...prev,
            [id]: Math.min(Math.max(0, val), 5) // Clamp 0-5
        }));
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + (b || 0), 0);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const token = await user?.getIdToken();
            if (!token) return;

            // Save individual keys
            // But we need to save the WHOLE object to 'data'.
            // Current 'saveScore' saves one key-value pair to 'data'.
            // If we loop, it's inefficient.
            // Better to update Backend to accept Object?
            // OR simple workaround: Save "score" as total, and "details" as the object?
            // The GradebookView reads "score" to display.

            // Let's check `GradebookView` reading logic:
            // const score = sheet?.data ? Object.values(sheet.data).reduce(...) : '-';
            // It sums EVERYTHING in `data`.
            // So if `data` is { "1.1": 5, "2.1": 5 }, sum is 10. Correct.
            // So we can save keys individually or bulk.

            // IF backend `saveScore` endpoint is efficient?
            // "saveScore" -> `grade.sheets[i].data[key] = value`.
            // We have 12 keys. 12 calls is too many.

            // I will Assume I can send ONE call to update "data" entirely.
            // But I don't have that endpoint yet.
            // Wait, `grades/score` endpoint:
            // body: { key, value }.

            // I should modify Backend to allow `value` to be an OBJECT and Merge it?
            // Or add `update-sheet-data` endpoint.

            // For now, I will create `update-sheet-data` in Backend?
            // Or use loop (12 calls). 12 calls is OK for low traffic but bad practice.
            // User wants "Best Practice".

            // I will ADD `update-sheet-data` to Backend first?
            // OR I just use a loop for now to be fast. 
            // Actually, I can use `batch-sheet`? No.

            // Let's implement `update-sheet-data` in Backend quickly.
            // But let's build Frontend first assuming I'll fix backend.

            // I'll call a hypothetical `API_ENDPOINTS.GRADES.UPDATE_SHEET_DATA`
            // And then implement it.

            const url = `${API_ENDPOINTS.GRADES.BASE}/sheet-data`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student._id,
                    subjectId: subject._id,
                    sheetName: sheetName,
                    data: scores
                })
            });

            if (res.ok) {
                toast.success('บันทึกคะแนนเรียบร้อย');
                onSave();
                onClose();
            } else {
                toast.error('บันทึกไม่สำเร็จ');
            }

        } catch (error) {
            console.error(error);
            toast.error('Error saving');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>ประเมินผล: {sheetName}</DialogTitle>
                    <DialogDescription>
                        นักเรียน: {student.studentName || student.displayName} | คะแนนรวม: {totalScore} / 60
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {CRITERIA.map(c => (
                        <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-xl bg-slate-50 shadow-sm border-slate-200">
                            <Label className="flex-1 text-sm text-slate-700 font-medium">{c.label}</Label>
                            <div className="flex flex-wrap items-center gap-1 justify-start sm:justify-end">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => handleScoreChange(c.id, val.toString())}
                                        className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-sm font-bold transition-all shadow-sm
                                        ${scores[c.id] === val 
                                            ? 'bg-indigo-600 text-white shadow-indigo-200 scale-110 z-10' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 border'}`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <div className="flex w-full justify-between items-center">
                        <span className="text-xl font-bold text-indigo-600">Total: {totalScore}</span>
                        <Button onClick={handleSave} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Save className="w-4 h-4 mr-2" /> บันทึกผลการประเมิน
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
