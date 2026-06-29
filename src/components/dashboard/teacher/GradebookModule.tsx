'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusCircle, Save, Trash2, Settings2, ChevronDown, ChevronUp,
    BarChart3, BookOpen, CheckCircle, AlertTriangle, Loader2, X, GripVertical
} from 'lucide-react';

interface GradeColumn {
    id: string;
    title: string;
    maxScore: number;
    weight: number;
}

interface StudentGradeRow {
    studentId: string;
    studentName: string;
    scores: Record<string, number>;
    totalPercentage?: number;
    calculatedGrade?: string;
}

interface GradebookModuleProps {
    students: any[];
    subjects: any[];
}

const GRADE_COLORS: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'B+': 'bg-blue-100 text-blue-700 border-blue-200',
    B: 'bg-blue-50 text-blue-600 border-blue-100',
    'C+': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    C: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    'D+': 'bg-orange-100 text-orange-700 border-orange-200',
    D: 'bg-orange-50 text-orange-600 border-orange-100',
    F: 'bg-red-100 text-red-700 border-red-200',
    '-': 'bg-slate-100 text-slate-400 border-slate-200',
};

function computeGrade(
    scores: Record<string, number>,
    columns: GradeColumn[],
    gradeMapping: Record<string, number>
): { pct: number; grade: string } {
    if (!columns.length) return { pct: 0, grade: '-' };
    const totalWeight = columns.reduce((a, c) => a + (c.weight || 0), 0) || 1;
    let weightedSum = 0;
    columns.forEach(col => {
        const raw = scores[col.id] ?? 0;
        const pct = col.maxScore > 0 ? (raw / col.maxScore) * 100 : 0;
        weightedSum += pct * (col.weight / totalWeight);
    });
    const pct = Math.round(weightedSum * 10) / 10;
    const sorted = Object.entries(gradeMapping).sort((a, b) => b[1] - a[1]);
    const grade = sorted.find(([, min]) => pct >= min)?.[0] ?? 'F';
    return { pct, grade };
}

export default function GradebookModule({ students, subjects }: GradebookModuleProps) {
    const { user } = useAuth();

    // Subject & class selection
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');

    // Structure (columns + grade mapping)
    const [columns, setColumns] = useState<GradeColumn[]>([]);
    const [gradeMapping, setGradeMapping] = useState<Record<string, number>>({
        A: 80, 'B+': 75, B: 70, 'C+': 65, C: 60, 'D+': 55, D: 50, F: 0,
    });

    // Student rows (pending changes = not yet saved)
    const [rows, setRows] = useState<StudentGradeRow[]>([]);
    const [pendingScores, setPendingScores] = useState<Record<string, Record<string, number>>>({});

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isStructureOpen, setIsStructureOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const timeoutRef = useRef<any>(null);

    // Derive unique classes from students/subjects
    const availableClasses = useMemo(() => {
        if (!selectedSubjectId) return [];
        const subject = subjects.find(s => s._id === selectedSubjectId);
        if (!subject) return [];
        const classSet = new Set<string>();
        students.forEach(stu => {
            const reg = stu.registeredCourses?.find((c: any) => c.subject === subject.name);
            if (reg?.day) classSet.add(`${reg.day} | ${reg.time || 'ไม่ระบุ'}`);
            else if (stu.enrolledSubjects?.includes(subject.name)) classSet.add('ไม่ระบุเวลา');
        });
        return ['all', ...Array.from(classSet)];
    }, [selectedSubjectId, subjects, students]);

    // Students in selected subject + class
    const filteredStudents = useMemo(() => {
        if (!selectedSubjectId) return [];
        const subject = subjects.find(s => s._id === selectedSubjectId);
        if (!subject) return [];
        return students.filter(stu => {
            const reg = stu.registeredCourses?.find((c: any) => c.subject === subject.name);
            if (reg) {
                const slot = `${reg.day} | ${reg.time || 'ไม่ระบุ'}`;
                return selectedClassId === 'all' || slot === selectedClassId;
            }
            return stu.enrolledSubjects?.includes(subject.name);
        });
    }, [selectedSubjectId, selectedClassId, students, subjects]);

    const fetchGradebook = useCallback(async () => {
        if (!user || !selectedSubjectId) return;
        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.GRADES.GRADEBOOK(selectedSubjectId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.structure) {
                    setColumns(data.structure.columns || []);
                    setGradeMapping(data.structure.gradeMapping || gradeMapping);
                }
                // Map DB grades to rows
                const dbGrades: any[] = data.studentGrades || [];
                const newRows = filteredStudents.map(stu => {
                    const dbGrade = dbGrades.find(g => g.studentId === String(stu._id));
                    return {
                        studentId: String(stu._id),
                        studentName: stu.studentName || stu.displayName || 'ไม่ระบุชื่อ',
                        scores: dbGrade?.scores || {},
                        totalPercentage: dbGrade?.totalPercentage,
                        calculatedGrade: dbGrade?.calculatedGrade,
                    };
                });
                setRows(newRows);
                setPendingScores({});
            }
        } catch (e) {
            console.error('fetchGradebook error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedSubjectId, filteredStudents]);

    useEffect(() => { fetchGradebook(); }, [selectedSubjectId, selectedClassId]);

    // Save structure to backend
    const handleSaveStructure = async () => {
        if (!user || !selectedSubjectId) return;
        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            await fetch(API_ENDPOINTS.GRADES.STRUCTURE, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjectId: selectedSubjectId, classId: selectedClassId, columns, gradeMapping }),
            });
            showMessage('success', 'บันทึกโครงสร้างตารางคะแนนเรียบร้อย');
            setIsStructureOpen(false);
            fetchGradebook();
        } catch {
            showMessage('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSaving(false);
        }
    };

    // Bulk save all pending scores
    const handleSaveScores = async () => {
        if (!user || !selectedSubjectId) return;
        const entries = rows.map(row => ({
            studentId: row.studentId,
            scores: { ...row.scores, ...(pendingScores[row.studentId] || {}) },
        }));
        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            await fetch(API_ENDPOINTS.GRADES.BULK_SCORES, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjectId: selectedSubjectId, classId: selectedClassId, entries }),
            });
            showMessage('success', `บันทึกคะแนน ${entries.length} คนเรียบร้อย ✓`);
            setPendingScores({});
            fetchGradebook();
        } catch {
            showMessage('error', 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setSaveMessage({ type, text });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSaveMessage(null), 4000);
    };

    // Handle score input change (updates pending only, real-time preview)
    const handleScoreChange = (studentId: string, colId: string, value: string) => {
        const num = parseFloat(value);
        if (isNaN(num) && value !== '') return;
        const score = isNaN(num) ? 0 : num;
        setPendingScores(prev => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [colId]: score },
        }));
    };

    // Live score for a student+col (pending overrides saved)
    const getLiveScore = (row: StudentGradeRow, colId: string) => {
        return pendingScores[row.studentId]?.[colId] ?? row.scores[colId] ?? '';
    };

    // Live total/grade computation for display
    const getLiveResult = (row: StudentGradeRow) => {
        const merged = { ...row.scores, ...(pendingScores[row.studentId] || {}) };
        return computeGrade(merged, columns, gradeMapping);
    };

    const hasPendingChanges = Object.keys(pendingScores).length > 0;

    // Column management
    const addColumn = () => {
        const newCol: GradeColumn = {
            id: `col_${Date.now()}`,
            title: `หัวข้อ ${columns.length + 1}`,
            maxScore: 100,
            weight: 10,
        };
        setColumns(prev => [...prev, newCol]);
    };

    const removeColumn = (id: string) => setColumns(prev => prev.filter(c => c.id !== id));

    const updateColumn = (id: string, field: keyof GradeColumn, value: any) => {
        setColumns(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const totalWeight = columns.reduce((a, c) => a + (c.weight || 0), 0);

    return (
        <div className="flex flex-col gap-6">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ระบบตารางคะแนน</h2>
                    <p className="text-sm text-slate-500 mt-0.5">กรอกและจัดการคะแนนนักเรียนแบบยืดหยุ่น</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Subject selector */}
                    <select
                        value={selectedSubjectId}
                        onChange={e => { setSelectedSubjectId(e.target.value); setSelectedClassId('all'); }}
                        className="h-10 px-3 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        <option value="">-- เลือกรายวิชา --</option>
                        {subjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>

                    {/* Class/timeslot selector */}
                    {selectedSubjectId && (
                        <select
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                            className="h-10 px-3 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            {availableClasses.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'ทุกกลุ่ม' : c}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {!selectedSubjectId ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <BookOpen className="h-12 w-12 mb-3 opacity-40" />
                    <p className="font-semibold text-lg">เลือกรายวิชาเพื่อเริ่มต้น</p>
                    <p className="text-sm mt-1">เลือกวิชาจาก Dropdown ด้านบนเพื่อดูหรือกรอกคะแนน</p>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="ml-3 text-slate-500 font-medium">กำลังโหลดข้อมูล...</span>
                </div>
            ) : (
                <>
                    {/* Structure Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setIsStructureOpen(v => !v)}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Settings2 className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-slate-800">ตั้งค่าโครงสร้างคะแนน</p>
                                    <p className="text-xs text-slate-400">
                                        {columns.length} หัวข้อ | น้ำหนักรวม {totalWeight}%
                                        {totalWeight !== 100 && <span className="text-orange-500 ml-1">⚠ ควรรวมเป็น 100%</span>}
                                    </p>
                                </div>
                            </div>
                            {isStructureOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>

                        <AnimatePresence>
                            {isStructureOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                                        {columns.map((col, idx) => (
                                            <div key={col.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                                                <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                                                <input
                                                    type="text"
                                                    value={col.title}
                                                    onChange={e => updateColumn(col.id, 'title', e.target.value)}
                                                    placeholder="ชื่อหัวข้อ"
                                                    className="flex-1 h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                                />
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">เต็ม</span>
                                                    <input
                                                        type="number"
                                                        value={col.maxScore}
                                                        onChange={e => updateColumn(col.id, 'maxScore', Number(e.target.value))}
                                                        className="w-16 h-9 px-2 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                                        min={1}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">น้ำหนัก</span>
                                                    <input
                                                        type="number"
                                                        value={col.weight}
                                                        onChange={e => updateColumn(col.id, 'weight', Number(e.target.value))}
                                                        className="w-16 h-9 px-2 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                                        min={0}
                                                    />
                                                    <span className="text-xs text-slate-400">%</span>
                                                </div>
                                                <button onClick={() => removeColumn(col.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={addColumn}
                                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            เพิ่มหัวข้อคะแนน
                                        </button>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleSaveStructure}
                                                disabled={isSaving}
                                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow transition-colors"
                                            >
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                บันทึกโครงสร้าง
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Table action bar */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-500" />
                                <span className="font-semibold text-slate-700">
                                    ตารางคะแนน ({filteredStudents.length} คน)
                                </span>
                                {hasPendingChanges && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                                        มีการเปลี่ยนแปลง
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleSaveScores}
                                disabled={isSaving || !hasPendingChanges}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow transition-all"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                บันทึกคะแนนทั้งหมด
                            </button>
                        </div>

                        {columns.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <Settings2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="font-medium">ยังไม่ได้ตั้งค่าโครงสร้างคะแนน</p>
                                <p className="text-xs mt-1">กด "ตั้งค่าโครงสร้างคะแนน" ด้านบนเพื่อเพิ่มหัวข้อคะแนน</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="sticky left-0 z-10 bg-slate-50 p-4 text-left min-w-[200px] border-r border-slate-100">
                                                ชื่อนักเรียน
                                            </th>
                                            {columns.map(col => (
                                                <th key={col.id} className="p-4 text-center min-w-[100px] border-r border-slate-100">
                                                    <div>{col.title}</div>
                                                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">/{col.maxScore} pt | {col.weight}%</div>
                                                </th>
                                            ))}
                                            <th className="p-4 text-center min-w-[90px] border-r border-slate-100">รวม %</th>
                                            <th className="p-4 text-center min-w-[70px]">เกรด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length + 3} className="py-12 text-center text-slate-400">
                                                    ไม่มีนักเรียนในกลุ่มนี้
                                                </td>
                                            </tr>
                                        )}
                                        {rows.map((row, rIdx) => {
                                            const { pct, grade } = getLiveResult(row);
                                            const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS['-'];
                                            const hasPending = !!pendingScores[row.studentId];
                                            return (
                                                <tr
                                                    key={row.studentId}
                                                    className={`group transition-colors ${hasPending ? 'bg-amber-50/40' : 'hover:bg-indigo-50/30'}`}
                                                >
                                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50/30 p-4 border-r border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                                                                {rIdx + 1}
                                                            </div>
                                                            <span className="font-medium text-slate-800 truncate max-w-[140px]">{row.studentName}</span>
                                                            {hasPending && <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" />}
                                                        </div>
                                                    </td>
                                                    {columns.map(col => (
                                                        <td key={col.id} className="p-2 text-center border-r border-slate-100">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={col.maxScore}
                                                                value={getLiveScore(row, col.id)}
                                                                onChange={e => handleScoreChange(row.studentId, col.id, e.target.value)}
                                                                className="w-full h-9 text-center text-sm font-semibold border border-transparent hover:border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded-lg bg-transparent focus:bg-white transition-all outline-none"
                                                                placeholder="—"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="p-4 text-center border-r border-slate-100">
                                                        <span className={`text-base font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : pct > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                                                            {pct > 0 ? `${pct}%` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold border ${gradeColor}`}>
                                                            {grade}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Stats summary */}
                    {rows.length > 0 && columns.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['A', 'B+/B', 'C+/C', 'F'].map((label, idx) => {
                                const counts = [
                                    rows.filter(r => getLiveResult(r).grade === 'A').length,
                                    rows.filter(r => ['B+', 'B'].includes(getLiveResult(r).grade)).length,
                                    rows.filter(r => ['C+', 'C', 'D+', 'D'].includes(getLiveResult(r).grade)).length,
                                    rows.filter(r => getLiveResult(r).grade === 'F').length,
                                ];
                                const colors = [
                                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                                    'border-blue-200 bg-blue-50 text-blue-700',
                                    'border-yellow-200 bg-yellow-50 text-yellow-700',
                                    'border-red-200 bg-red-50 text-red-700',
                                ];
                                return (
                                    <div key={label} className={`flex items-center justify-between p-4 rounded-xl border ${colors[idx]}`}>
                                        <span className="text-sm font-bold">เกรด {label}</span>
                                        <span className="text-2xl font-extrabold">{counts[idx]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Toast message */}
            <AnimatePresence>
                {saveMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-white font-semibold ${saveMessage.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
                    >
                        {saveMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        {saveMessage.text}
                        <button onClick={() => setSaveMessage(null)} className="ml-1 opacity-60 hover:opacity-100">
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
