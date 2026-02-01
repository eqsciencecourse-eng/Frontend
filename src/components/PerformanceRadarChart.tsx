'use client';

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';
// SafeResponsiveContainer removed

interface PerformanceRadarChartProps {
    data: any;
}

const SKILL_LABELS: Record<string, string> = {
    'knowledge_exercise': 'Exercise',
    'skill_creative': 'Creative',
    'skill_planning': 'Planning',
    'skill_problemSolving': 'Solving',
    'skill_design': 'Design',
    'skill_programming': 'Coding',
    'skill_presentation': 'Present',
    'skill_eq': 'EQ',
};

// Fallback for missing data
const EMPTY_DATA = Object.values(SKILL_LABELS).map(label => ({ subject: label, A: 0, fullMark: 5 }));

export const PerformanceRadarChart = ({ data }: PerformanceRadarChartProps) => {



    // Safety check
    if (!data || !data.skills) {
        return (
            <div className="h-full w-full flex items-center justify-center text-slate-400">
                <p>No Skill Data</p>
            </div>
        );
    }

    // Process data
    let chartData = Object.entries(SKILL_LABELS).map(([key, label]) => ({
        subject: label,
        A: Number(data.skills[key]) || 0,
        fullMark: 5,
    }));

    // Ensure we have at least some data points, otherwise Recharts might act weird on "empty" logical data
    if (chartData.length === 0) chartData = EMPTY_DATA;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                <Radar
                    name="Skill Score"
                    dataKey="A"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fill="#6366f1"
                    fillOpacity={0.4}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};
