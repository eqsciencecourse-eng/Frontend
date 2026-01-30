'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { SafeResponsiveContainer } from '@/components/SafeResponsiveContainer';

interface GradeData {
    skills?: { [key: string]: number };
}

const SKILL_STRUCTURE = [
    { id: 'knowledge_exercise', label: 'แบบฝึกหัด', fullLabel: '1.1 แบบฝึกหัด (Exercise)' },
    { id: 'skill_creative', label: 'ความคิดสร้างสรรค์', fullLabel: '2.1 ความคิดสร้างสรรค์' },
    { id: 'skill_planning', label: 'วางแผน', fullLabel: '2.2 วางแผนการทำงาน' },
    { id: 'skill_problemSolving', label: 'แก้ปัญหา', fullLabel: '2.3 การแก้ปัญหา' },
    { id: 'skill_design', label: 'ออกแบบ', fullLabel: '2.4 ปรับปรุงการออกแบบ' },
    { id: 'skill_programming', label: 'เขียนโปรแกรม', fullLabel: '2.5 ทักษะการเขียนโปรแกรม' },
    { id: 'skill_presentation', label: 'นำเสนอ', fullLabel: '2.6 นำเสนอผลงาน' },
    { id: 'skill_eq', label: 'อารมณ์/สมาธิ', fullLabel: '2.7 ทักษะทางอารมณ์/สมาธิ' }
];

export function PerformanceChart({ data, fullMark = 60 }: { data?: GradeData, fullMark?: number }) {
    const skills = data?.skills || {};

    const chartData = SKILL_STRUCTURE.map(item => ({
        skill: item.label,
        fullLabel: item.fullLabel,
        value: skills[item.id] || 0,
        fullMark: fullMark
    }));

    // Check if there is any data to display (sum of values > 0)
    const hasData = chartData.some(item => item.value > 0);

    // Dynamic Scaling Logic:
    const maxValue = Math.max(...chartData.map(d => d.value));
    // Dynamic max: if max value > 30, scale to max value, else use 30/60? 
    // Teacher table max is 5 * 12 = 60.
    const dynamicFullMark = Math.max(20, Math.ceil(maxValue / 10) * 10);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg">
                    <p className="font-semibold text-slate-700 text-sm mb-1">{label}</p>
                    <p className="text-orange-600 font-bold text-lg">
                        {payload[0].value} <span className="text-xs font-normal text-slate-400">/ {dynamicFullMark}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[300px] md:h-[400px]">
            {hasData ? (
                <SafeResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, dynamicFullMark]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickCount={5} />
                        <Tooltip content={<CustomTooltip />} />
                        <Radar
                            name="คะแนนสะสม"
                            dataKey="value"
                            stroke="#f97316" // Orange-500
                            strokeWidth={3}
                            fill="#f97316"
                            fillOpacity={0.4}
                        />
                        <Legend />
                    </RadarChart>
                </SafeResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" /></svg>
                    </div>
                    <p>ยังไม่มีข้อมูลคะแนนทักษะ</p>
                </div>
            )}
        </div>
    );
}
