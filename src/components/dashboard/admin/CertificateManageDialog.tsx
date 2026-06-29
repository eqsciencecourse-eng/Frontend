'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Award, Trash2, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CertificateManageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
}

export default function CertificateManageDialog({ isOpen, onClose, student, subject }: CertificateManageDialogProps) {
    const { user } = useAuth();
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchGrades = async () => {
        if (!user || !student) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.GRADES.STUDENT(student._id || student.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const allGrades = Array.isArray(data) ? data : [data];
                const subjectId = subject?._id || subject?.id;
                const matched = allGrades.filter((g: any) => {
                    const gSubjectId = g.subjectId?._id || g.subjectId?.id || g.subjectId;
                    return (gSubjectId === subjectId || g.subjectName === subject?.name) && g.certificateURL;
                });
                setGrades(matched);
            }
        } catch (error) {
            console.error('Error fetching grades:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchGrades();
    }, [isOpen, user, student, subject]);

    const handleDelete = async (grade: any) => {
        if (!user) return;
        const name = student?.displayName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Unknown';
        const levelLabel = grade.level ? ` (${grade.level} ${grade.subLevel || ''})` : '';
        if (!confirm(`ยืนยันการลบใบประกาศของ "${name}"${levelLabel}?`)) return;

        setDeletingId(grade._id);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_ENDPOINTS.GRADES.BASE}/${grade._id}/certificate`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success(`ลบใบประกาศ${levelLabel}ของ ${name} สำเร็จ`);
                setGrades(prev => prev.filter(g => g._id !== grade._id));
            } else {
                toast.error('ลบไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setDeletingId(null);
        }
    };

    const studentName = student?.displayName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Unknown';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-0 overflow-hidden" hideCloseButton>
                <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-indigo-600" />
                            <DialogTitle className="text-xl font-bold text-slate-800 m-0">จัดการใบประกาศ</DialogTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : grades.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-40" />
                            <p className="text-lg font-bold text-slate-500">ไม่พบข้อมูล</p>
                            <p className="text-sm text-slate-400 mt-1">นักเรียนคนนี้ยังไม่ได้รับใบประกาศในวิชานี้</p>
                        </div>
                    ) : (
                        grades.map((grade, idx) => {
                            const date = grade.certificateIssuedAt
                                ? new Date(grade.certificateIssuedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                : '-';
                            const level = grade.level ? `${grade.level} ${grade.subLevel || ''}` : '-';
                            return (
                                <div key={grade._id || idx} className="bg-slate-50 rounded-none border border-slate-200 p-5 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-bold text-sm">ใบประกาศ #{idx + 1}</span>
                                        </div>
                                        {grade.level && (
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-bold">{level}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <span className="text-slate-500">นักเรียน:</span>
                                        <span className="font-medium text-slate-800">{studentName}</span>
                                        <span className="text-slate-500">วิชา:</span>
                                        <span className="font-medium text-slate-800">{subject?.name || grade.subjectName}</span>
                                        <span className="text-slate-500">เกรด:</span>
                                        <span className="font-medium text-slate-800">{grade.finalGrade || '-'}</span>
                                        <span className="text-slate-500">วันที่ออก:</span>
                                        <span className="font-medium text-slate-800">{date}</span>
                                    </div>
                                    <Button
                                        onClick={() => handleDelete(grade)}
                                        disabled={deletingId === grade._id}
                                        variant="destructive"
                                        className="w-full h-10 gap-2 rounded-none font-bold text-sm mt-2"
                                    >
                                        {deletingId === grade._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        {deletingId === grade._id ? 'กำลังลบ...' : 'ลบใบประกาศ'}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
