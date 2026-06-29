'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Target, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useAuth } from '@/context/AuthContext';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const SKILL_LABELS: Record<string, string> = {
    creativity: 'ความคิดสร้างสรรค์',
    planning: 'การวางแผน',
    problemSolving: 'การแก้ไขปัญหา',
    design: 'การออกแบบ',
    programming: 'การเขียนโปรแกรม',
    focus: 'สมาธิ'
};

const skills = ['creativity', 'planning', 'problemSolving', 'design', 'programming', 'focus'];

const THEME_COLORS = [
    { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 1)', point: 'rgba(99, 102, 241, 1)' },
    { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 1)', point: 'rgba(16, 185, 129, 1)' },
    { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 1)', point: 'rgba(245, 158, 11, 1)' },
    { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 1)', point: 'rgba(139, 92, 246, 1)' },
    { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 1)', point: 'rgba(236, 72, 153, 1)' },
];

interface LevelGroup {
    level: string;
    subLevel: string;
    label: string;
    subjectName: string;
    count: number;
    averages: Record<string, number>;
}

export default function StudentEvaluationChart({ studentId }: { studentId?: string }) {
    const { user } = useAuth();
    const [groups, setGroups] = useState<LevelGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const targetId = studentId || user?.uid;

    useEffect(() => {
        if (!targetId) return;
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const token = await user?.getIdToken();
                const [histRes, subjectsRes] = await Promise.all([
                    fetch(API_ENDPOINTS.EVALUATIONS.GET_STUDENT_HISTORY(targetId), {
                        headers: { Authorization: 'Bearer ' + token }
                    }),
                    fetch(API_ENDPOINTS.SUBJECTS.LIST)
                ]);

                const subjectMap: Record<string, string> = {};
                if (subjectsRes.ok) {
                    const subjects = await subjectsRes.json();
                    if (Array.isArray(subjects)) {
                        subjects.forEach((s: any) => {
                            subjectMap[s._id || s.id] = s.name;
                        });
                    }
                }

                if (histRes.ok) {
                    const logs = await histRes.json();
                    if (Array.isArray(logs) && logs.length > 0) {
                        const grouped: Record<string, { logs: any[]; level: string; subLevel: string; subjectId: string }> = {};
                        logs.forEach((log: any) => {
                            const subjectId = log.subjectId || 'unknown';
                            const key = subjectId + '_' + (log.level || 'Basic') + '_' + (log.subLevel || '1');
                            if (!grouped[key]) {
                                grouped[key] = { logs: [], level: log.level || 'Basic', subLevel: log.subLevel || '1', subjectId };
                            }
                            grouped[key].logs.push(log);
                        });
                        const computed: LevelGroup[] = Object.values(grouped).map((g) => {
                            const sum: Record<string, number> = {};
                            skills.forEach((s) => { sum[s] = 0; });
                            g.logs.forEach((log: any) => {
                                if (log.scores) {
                                    skills.forEach((s) => { sum[s] += Number(log.scores[s] || 0); });
                                }
                            });
                            const averages: Record<string, number> = {};
                            skills.forEach((s) => { averages[s] = Math.round((sum[s] / g.logs.length) * 10) / 10; });
                            return {
                                level: g.level,
                                subLevel: g.subLevel,
                                label: g.level + ' ' + g.subLevel,
                                subjectName: subjectMap[g.subjectId] || g.subjectId,
                                count: g.logs.length,
                                averages
                            };
                        });
                        computed.sort((a, b) => {
                            const nameCmp = a.subjectName.localeCompare(b.subjectName);
                            if (nameCmp !== 0) return nameCmp;
                            const levelOrder: Record<string, number> = { Basic: 0, Inter: 1, Advance: 2 };
                            const aOrder = levelOrder[a.level] ?? 99;
                            const bOrder = levelOrder[b.level] ?? 99;
                            if (aOrder !== bOrder) return aOrder - bOrder;
                            return Number(a.subLevel) - Number(b.subLevel);
                        });
                        setGroups(computed);
                        setCurrentIndex(0);
                    } else { setGroups([]); }
                } else { setGroups([]); }
            } catch (err) {
                console.error('Failed to fetch evaluation history', err);
                setError(true);
                setGroups([]);
            } finally { setLoading(false); }
        };
        fetchData();
    }, [targetId, user]);

    const currentGroup = groups[currentIndex] || null;
    const colorIndex = currentIndex % THEME_COLORS.length;
    const theme = THEME_COLORS[colorIndex];
    const chartLabels = skills.map(key => SKILL_LABELS[key] || key);
    const chartValues = currentGroup ? skills.map(key => currentGroup.averages[key] || 0) : [];

    const pct = (v: number) => Math.round((v / 5) * 100);

    const radarData = currentGroup ? {
        labels: chartLabels,
        datasets: [{
            label: 'ระดับทักษะ',
            data: chartValues,
            backgroundColor: theme.bg,
            borderColor: theme.border,
            pointBackgroundColor: theme.point,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: theme.point,
            borderWidth: 2,
        }],
    } : null;

    const radarOptions = {
        scales: {
            r: {
                angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                pointLabels: { font: { size: 12, weight: 600, family: "'Sarabun', sans-serif" }, color: '#64748b' },
                suggestedMin: 0, suggestedMax: 5,
                ticks: { display: false, stepSize: 1 }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)', titleColor: '#1e293b', bodyColor: '#1e293b',
                borderColor: '#e2e8f0', borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.r !== null) {
                            label += pct(context.parsed.r) + '%';
                        }
                        return label;
                    }
                }
            }
        },
        maintainAspectRatio: false
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !currentGroup) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Target className="h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">ยังไม่มีผลการประเมิน</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {groups.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="h-8 w-8 flex items-center justify-center rounded-none border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        {groups.map((g, i) => (
                            <button key={g.label + g.subjectName} onClick={() => setCurrentIndex(i)} className={'h-2 rounded-none transition-all ' + (i === currentIndex ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400')} />
                        ))}
                    </div>
                    <button onClick={() => setCurrentIndex(Math.min(groups.length - 1, currentIndex + 1))} disabled={currentIndex === groups.length - 1} className="h-8 w-8 flex items-center justify-center rounded-none border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 overflow-hidden border-slate-200 shadow-sm relative">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <Target className="h-5 w-5 text-indigo-500" />
                                ระดับ {currentGroup.label}
                            </CardTitle>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1">{currentGroup.count} ครั้ง</span>
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                            <BookOpen className="h-4 w-4" />
                            {currentGroup.subjectName}
                        </p>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="relative h-[400px] w-full flex items-center justify-center">
                            <div className="w-full h-full">{radarData && <Radar data={radarData} options={radarOptions as any} />}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-slate-700">รายละเอียดทักษะ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {skills.map((key, index) => {
                            const val = chartValues[index];
                            const label = chartLabels[index];
                            const percent = pct(val);
                            return (
                                <div key={key}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">{label}</span>
                                        <span className="text-xs font-bold text-slate-400">{percent}%</span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div className={'h-full rounded-full transition-all duration-1000 ease-out ' + (percent >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : percent >= 60 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-orange-400 to-orange-500')} style={{ width: percent + '%' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
