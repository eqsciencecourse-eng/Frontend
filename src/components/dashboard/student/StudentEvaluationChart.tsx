'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, Zap, Trophy, Target, Star, History as HistoryIcon } from 'lucide-react';
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

// Register ChartJS components
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

const LEVEL_TITLES = [
    { min: 0, title: 'Novice Learner', color: 'text-slate-500', bg: 'bg-slate-100', icon: Star },
    { min: 5, title: 'Apprentice', color: 'text-blue-500', bg: 'bg-blue-100', icon: Zap },
    { min: 10, title: 'Skillful Student', color: 'text-indigo-500', bg: 'bg-indigo-100', icon: Zap },
    { min: 20, title: 'Expert Developer', color: 'text-purple-500', bg: 'bg-purple-100', icon: Trophy },
    { min: 40, title: 'Grandmaster', color: 'text-amber-500', bg: 'bg-amber-100', icon: Crown },
    { min: 60, title: 'Legendary', color: 'text-red-500', bg: 'bg-red-100', icon: Crown }
];

export default function StudentEvaluationChart({ studentId }: { studentId?: string }) {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // If no studentId provided, try to use current user
    const targetId = studentId || user?.uid;

    useEffect(() => {
        if (!targetId) return;

        const fetchData = async () => {
            try {
                const token = await user?.getIdToken();
                const res = await fetch(API_ENDPOINTS.EVALUATIONS.GET_STUDENT_SUMMARY(targetId), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const json = await res.json();
                    setData(json || { totalEvaluations: 0, level: 1, totalXP: 0, averages: {} });
                } else {
                    setData({ totalEvaluations: 0, level: 1, totalXP: 0, averages: {} });
                }
            } catch (err) {
                console.error("Failed to fetch evaluation summary", err);
                setError(true);
                setData({ totalEvaluations: 0, level: 1, totalXP: 0, averages: {} });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [targetId, user]);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!data) return null;

    // Prepare Chart Data for Chart.js
    const skills = ['creativity', 'planning', 'problemSolving', 'design', 'programming', 'focus'];
    const chartLabels = skills.map(key => SKILL_LABELS[key] || key);
    const chartValues = skills.map(key => data.averages?.[key] || 0);

    const radarData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'My Skill Level',
                data: chartValues,
                backgroundColor: 'rgba(99, 102, 241, 0.2)', // Indigo 500 with opacity
                borderColor: 'rgba(99, 102, 241, 1)',      // Indigo 500
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
            },
        ],
    };

    const radarOptions = {
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                pointLabels: {
                    font: {
                        size: 12,
                        weight: 600
                    },
                    color: '#64748b' // Slate 500
                },
                suggestedMin: 0,
                suggestedMax: 10,
                ticks: {
                    display: false, // Hide numeric ticks on axis
                    stepSize: 2
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.r !== null) {
                            // Custom tooltip text instead of raw number
                            const val = context.parsed.r;
                            const rating = val >= 8 ? 'Excellent' : val >= 5 ? 'Good' : 'Improving';
                            label += rating;
                        }
                        return label;
                    }
                }
            }
        },
        maintainAspectRatio: false
    };

    // Calculate Title
    const currentLevel = data.level || 1;
    // Safe lookup for level title
    const levelInfo = [...LEVEL_TITLES].reverse().find(l => currentLevel >= l.min) || LEVEL_TITLES[0];
    const Icon = levelInfo.icon;

    return (
        <div className="space-y-6">
            {/* 1. Level & Stats Header */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="relative overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm transition-all hover:shadow-md md:col-span-2">
                    <div className="absolute right-[-20px] top-[-20px] h-32 w-32 rounded-full bg-indigo-100/50 blur-3xl" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                            Class Rank (ระดับความสามารถ)
                        </CardTitle>
                        <Crown className="h-5 w-5 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="z-10 relative">
                        <div className="flex items-center gap-6">
                            <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md ring-4 ${levelInfo.color.replace('text', 'ring').replace('500', '100')}`}>
                                <span className={`text-4xl font-black ${levelInfo.color}`}>{currentLevel}</span>
                            </div>
                            <div>
                                <h3 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600`}>
                                    {levelInfo.title}
                                </h3>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-white/80 font-normal text-slate-600 border shadow-sm">
                                        <HistoryIcon className="w-3 h-3 mr-1" />
                                        {data.totalEvaluations} คาบเรียน
                                    </Badge>
                                    <Badge variant="secondary" className="bg-white/80 font-normal text-slate-600 border shadow-sm">
                                        <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                                        EXP: {data.totalXP}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-4">
                            <Icon className={`h-12 w-12 ${levelInfo.color} mb-2`} />
                            <span className={`text-lg font-bold ${levelInfo.color}`}>Active Student</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Chart.js Radar Chart (Premium & Stable) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 overflow-hidden border-slate-200 shadow-sm relative">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <Target className="h-5 w-5 text-indigo-500" />
                                Skill Analysis (วิเคราะห์ความสามารถ)
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="relative h-[400px] w-full flex items-center justify-center">
                            <div className="w-full h-full">
                                <Radar data={radarData} options={radarOptions as any} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Skill List (Progress Bars) */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-slate-700">รายละเอียดทักษะ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {skills.map((key, index) => {
                            const val = chartValues[index];
                            const label = chartLabels[index];
                            return (
                                <div key={key}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">{label}</span>
                                        <span className="text-xs font-bold text-slate-400">
                                            {val >= 8 ? 'ยอดเยี่ยม' : val >= 5 ? 'ดี' : 'กำลังพัฒนา'}
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${val >= 8 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                                val >= 5 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                                                    'bg-gradient-to-r from-orange-400 to-orange-500'
                                                }`}
                                            style={{ width: `${(val / 10) * 100}%` }}
                                        />
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
