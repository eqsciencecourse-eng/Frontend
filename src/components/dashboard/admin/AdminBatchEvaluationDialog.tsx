'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import { CheckCircle2, ChevronDown, ChevronRight, Save, User } from 'lucide-react';

const SKILL_LABELS: Record<string, string> = {
    creativity: 'ความคิดสร้างสรรค์',
    planning: 'การวางแผน',
    problemSolving: 'การแก้ปัญหา',
    design: 'การออกแบบ',
    programming: 'การเขียนโปรแกรม',
    focus: 'ความตั้งใจ/สมาธิ',
};

const SKILL_NAMES = ['creativity', 'planning', 'problemSolving', 'design', 'programming', 'focus'];

interface AdminBatchEvaluationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: any;
    subjectId: string;
    subjectName: string;
    students: any[];
    adminUser: any;
    onUpdate?: () => void;
}

export default function AdminBatchEvaluationDialog({
    isOpen, onClose, teacher, subjectId, subjectName, students, adminUser, onUpdate
}: AdminBatchEvaluationDialogProps) {
    const [subjectStatus, setSubjectStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    // Single Evaluation Dialog
    const [evalDialogOpen, setEvalDialogOpen] = useState(false);
    const [evalStudent, setEvalStudent] = useState<any>(null);
    const [evalDate, setEvalDate] = useState<string>('');
    const [evalScores, setEvalScores] = useState<Record<string, number>>({
        creativity: 0, planning: 0, problemSolving: 0, design: 0, programming: 0, focus: 0,
    });
    const [evalSaving, setEvalSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (subjectId) {
                fetchSubjectStatus();
            } else {
                setFetchError('ไม่พบรหัสวิชา (subjectId)');
                setLoading(false);
            }
        } else {
            setSubjectStatus(null);
            setFetchError(null);
        }
    }, [isOpen, subjectId]);

    const fetchSubjectStatus = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const token = await adminUser?.getIdToken();
            if (!token) {
                setFetchError('ไม่ได้รับอนุญาต (token หาย)');
                setLoading(false);
                return;
            }
            const res = await fetch(API_ENDPOINTS.EVALUATIONS.SUBJECT_STATUS(subjectId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSubjectStatus(data);
            } else {
                const errText = await res.text().catch(() => '');
                setFetchError(`API error ${res.status}: ${errText || res.statusText}`);
            }
        } catch (error: any) {
            setFetchError(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'}`);
        } finally {
            setLoading(false);
        }
    };

    const statusMap = useMemo(() => {
        const map = new Map<string, any>();
        subjectStatus?.students?.forEach((st: any) => {
            map.set(st.studentId, st);
        });
        return map;
    }, [subjectStatus]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatBEDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const handleOpenEval = (student: any, date: string) => {
        setEvalStudent(student);
        setEvalDate(date);
        setEvalScores({ creativity: 0, planning: 0, problemSolving: 0, design: 0, programming: 0, focus: 0 });
        setEvalDialogOpen(true);
    };

    const handleSaveEval = async () => {
        if (!evalStudent || !evalDate || !subjectId) return;
        setEvalSaving(true);
        try {
            const token = await adminUser?.getIdToken();
            const res = await fetch(API_ENDPOINTS.EVALUATIONS.CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    studentId: evalStudent._id,
                    teacherId: teacher?._id || teacher?.id || adminUser?._id || adminUser?.id,
                    subjectId,
                    date: evalDate,
                    scores: evalScores,
                }),
            });
            if (res.ok) {
                toast.success('บันทึกคะแนนสำเร็จ');
                setEvalDialogOpen(false);
                fetchSubjectStatus();
                onUpdate?.();
            } else {
                const err = await res.json();
                toast.error(err.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการบันทึกคะแนน');
        } finally {
            setEvalSaving(false);
        }
    };

    const totalEvaluated = subjectStatus?.students?.reduce((sum: number, s: any) => sum + (s.totalEvaluations || 0), 0) || 0;
    const totalSessions = subjectStatus?.students?.reduce((sum: number, s: any) => sum + (s.sessions?.length || 0), 0) || 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="sm:max-w-4xl rounded-none max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">
                            ลงคะแนนพร้อมกัน: {subjectName}
                        </DialogTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span>ครู {teacher?.displayName || '-'}</span>
                            <span>•</span>
                            <span>{students.length} คน</span>
                            <span>•</span>
                            <span className="font-semibold text-indigo-600">ประเมินแล้ว {totalEvaluated}/{totalSessions} ครั้ง</span>
                        </div>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-10 w-10 animate-spin rounded-none border-4 border-indigo-600 border-t-transparent" />
                            <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : fetchError ? (
                        <div className="py-12 text-center">
                            <p className="text-red-600 font-medium mb-2">{fetchError}</p>
                            <Button variant="outline" size="sm" onClick={fetchSubjectStatus} className="rounded-none mt-2">
                                ลองใหม่
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3 py-4">
                            {students.map((student: any) => {
                                const status = statusMap.get(student._id);
                                const sessions = status?.sessions || [];
                                const evaluatedCount = status?.totalEvaluations || 0;
                                const totalCount = sessions.length;
                                const latestScores = status?.latestScores;
                                const isExpanded = expandedStudentId === student._id;

                                return (
                                    <div key={student._id} className="border border-slate-200 bg-white">
                                        <div
                                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50 border-b border-slate-200' : 'hover:bg-slate-50'}`}
                                            onClick={() => setExpandedStudentId(isExpanded ? null : student._id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-slate-100 rounded-none flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                    {(student.firstName || student.displayName || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{student.firstName} {student.lastName}</p>
                                                    <p className="text-xs text-slate-400">{student.nickname || '-'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge className={`rounded-none px-2 py-0.5 text-xs font-bold ${evaluatedCount === 0 ? 'bg-slate-100 text-slate-500' : evaluatedCount >= totalCount ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {evaluatedCount}/{totalCount}
                                                </Badge>
                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-4">
                                                {latestScores && (
                                                    <div className="mb-3 pb-3 border-b border-slate-100">
                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">คะแนนล่าสุด</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {SKILL_NAMES.map(skill => (
                                                                <Badge key={skill} variant="outline" className={`rounded-none text-xs ${getScoreColor(latestScores[skill] || 0)}`}>
                                                                    {SKILL_LABELS[skill]}: {latestScores[skill] || 0}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                    {sessions.length === 0 ? (
                                                        <p className="text-sm text-slate-400 italic col-span-full">ไม่มีประวัติการเข้าเรียน</p>
                                                    ) : sessions.map((session: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className={`relative p-2.5 border text-center transition-all text-xs ${session.hasEvaluation
                                                                ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                                                                : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-sm cursor-pointer'
                                                                }`}
                                                            onClick={() => {
                                                                if (!session.hasEvaluation) handleOpenEval(student, session.date);
                                                            }}
                                                            title={session.hasEvaluation ? 'ประเมินแล้ว' : 'คลิกเพื่อประเมิน'}
                                                        >
                                                            <p className={`text-xs font-bold ${session.hasEvaluation ? 'text-slate-400' : 'text-indigo-700'}`}>
                                                                {formatDate(session.date)}
                                                            </p>
                                                            <p className={`text-[10px] mt-0.5 ${session.hasEvaluation ? 'text-slate-300' : 'text-slate-500'}`}>
                                                                {session.attendanceStatus}
                                                            </p>
                                                            {session.hasEvaluation && (
                                                                <CheckCircle2 className="absolute top-0.5 right-0.5 h-3 w-3 text-green-400" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {students.length === 0 && (
                                <div className="text-center py-12 text-slate-400">ไม่มีนักเรียนในวิชานี้</div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} className="rounded-none">ปิด</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Evaluation Dialog */}
            <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">ประเมินผลคะแนน</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 border border-slate-200">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <p className="font-bold text-slate-800">{evalStudent?.firstName} {evalStudent?.lastName}</p>
                                    <p className="text-xs text-slate-500">วันที่: {evalDate ? formatBEDate(evalDate) : '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-700">คะแนนทักษะ (0-10)</p>
                            {SKILL_NAMES.map(skill => (
                                <div key={skill}>
                                    <Label className="text-sm text-slate-600">{SKILL_LABELS[skill]}</Label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <Input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={evalScores[skill]}
                                            onChange={(e) => setEvalScores(prev => ({ ...prev, [skill]: parseInt(e.target.value) || 0 }))}
                                            className="flex-1 h-2 rounded-none accent-indigo-600"
                                        />
                                        <span className={`w-10 text-center font-bold text-sm px-2 py-1 border ${getScoreColor(evalScores[skill])}`}>
                                            {evalScores[skill]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEvalDialogOpen(false)} className="rounded-none">ยกเลิก</Button>
                        <Button onClick={handleSaveEval} disabled={evalSaving} className="rounded-none bg-indigo-600 hover:bg-indigo-700">
                            {evalSaving ? 'กำลังบันทึก...' : <><Save className="h-4 w-4 mr-1" /> บันทึกคะแนน</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
