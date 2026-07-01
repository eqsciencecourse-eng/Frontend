'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EvolutionChartProps {
    evaluationLogs: any[];
    selectedSessions: string[];
    attendanceHistory: any[];
    studentName?: string;
    subjectName?: string;
    level?: string;
    subLevel?: string;
}

interface DataPoint {
    date: string;
    rawDate: Date;
    creativity: number;
    planning: number;
    problemSolving: number;
    design: number;
    programming: number;
    focus: number;
    average: number;
}

const SKILL_CONFIG: Record<string, { color: string; label: string }> = {
    creativity: { color: '#8B5CF6', label: 'ความคิดสร้างสรรค์' },
    planning: { color: '#3B82F6', label: 'การวางแผน' },
    problemSolving: { color: '#10B981', label: 'การแก้ปัญหา' },
    design: { color: '#F59E0B', label: 'การออกแบบ' },
    programming: { color: '#EF4444', label: 'การเขียนโปรแกรม' },
    focus: { color: '#EC4899', label: 'ความตั้งใจ' },
};

const CHART_HEIGHT = 340;
const PAD = { top: 10, right: 16, bottom: 50, left: 48 };
const SKILL_KEYS = Object.keys(SKILL_CONFIG);

export default function EvolutionChart({ evaluationLogs, selectedSessions, attendanceHistory, studentName, subjectName, level, subLevel }: EvolutionChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const pdfRenderRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);
    const chartData: DataPoint[] = useMemo(() => {
        const selectedDateSet = new Set(
            attendanceHistory
                .filter(a => selectedSessions.includes(a._id))
                .map(a => new Date(a.date).toDateString())
        );

        const filtered = evaluationLogs
            .filter(log => selectedDateSet.has(new Date(log.date).toDateString()))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (filtered.length === 0) return [];

        return filtered.map(log => {
            const scores = log.scores || {};
            const values = SKILL_KEYS.map(k => Number(scores[k] || 0));
            const avg = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);

            return {
                date: (() => {
                    const d = new Date(log.date);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
                })(),
                rawDate: new Date(log.date),
                creativity: ((scores.creativity || 0) / 5) * 100,
                planning: ((scores.planning || 0) / 5) * 100,
                problemSolving: ((scores.problemSolving || 0) / 5) * 100,
                design: ((scores.design || 0) / 5) * 100,
                programming: ((scores.programming || 0) / 5) * 100,
                focus: ((scores.focus || 0) / 5) * 100,
                average: (avg / 5) * 100,
            };
        });
    }, [evaluationLogs, selectedSessions, attendanceHistory]);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const W = 700;
    const H = CHART_HEIGHT;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const xPos = (i: number) => PAD.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * innerW : innerW / 2);
    const yPos = (v: number) => PAD.top + innerH - (v / 100) * innerH;

    const makePath = (key: keyof DataPoint) =>
        chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(Number(d[key]))}`).join(' ');

    const totalAvg = chartData.reduce((s, d) => s + d.average, 0) / Math.max(1, chartData.length);

    const handleExportPDF = useCallback(async () => {
        if (!pdfRenderRef.current || chartData.length === 0) return;
        setExporting(true);
        try {
            // Wait for hidden render to stabilize
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(pdfRenderRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            const imgRatio = canvas.width / canvas.height;
            let imgW = pw - 20;
            let imgH = imgW / imgRatio;

            if (imgH > ph - 20) {
                imgH = ph - 20;
                imgW = imgH * imgRatio;
            }

            const xOff = (pw - imgW) / 2;
            const yOff = (ph - imgH) / 2;

            pdf.addImage(imgData, 'JPEG', xOff, yOff, imgW, imgH);
            pdf.save('report_evaluation.pdf');
        } catch (err) {
            console.error('PDF export error:', err);
        } finally {
            setExporting(false);
        }
    }, [chartData]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-300 bg-slate-50">
                <p className="font-medium">ไม่มีข้อมูลคะแนนในช่วงวันที่เลือก</p>
                <p className="text-xs mt-1">กรุณาตรวจสอบว่านักเรียนมีคะแนนในคาบเรียนที่เลือก</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white border border-slate-200 shadow-sm p-4 relative">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 inline-block" />
                    กราฟแสดงพัฒนาการของผู้เรียน (ร้อยละ)
                </h4>
                <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-3 py-1.5 shadow-sm transition-colors"
                >
                    {exporting ? 'กำลังสร้าง PDF...' : 'บันทึก PDF'}
                </button>
            </div>
            <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', display: 'block' }}>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(v => (
                    <line key={v} x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={v === 50 ? '' : '3 3'} />
                ))}
                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map(v => (
                    <text key={v} x={PAD.left - 8} y={yPos(v) + 4} textAnchor="end" fontSize={11} fill="#64748b" fontFamily="inherit">
                        {v}%
                    </text>
                ))}
                {/* X-axis labels */}
                {chartData.map((d, i) => (
                    <text
                        key={i}
                        x={xPos(i)}
                        y={H - PAD.bottom + 16}
                        textAnchor={i === 0 ? 'start' : i === chartData.length - 1 ? 'end' : 'middle'}
                        fontSize={10}
                        fill="#64748b"
                        fontFamily="inherit"
                    >
                        {d.date}
                    </text>
                ))}
                {/* Skill lines */}
                {SKILL_KEYS.map(skill => (
                    <path key={skill} d={makePath(skill as keyof DataPoint)} fill="none" stroke={SKILL_CONFIG[skill].color} strokeWidth={1.5} strokeLinejoin="round" />
                ))}
                {/* Dots for each skill */}
                {chartData.map((d, i) => (
                    <g key={i}>
                        {SKILL_KEYS.map(skill => (
                            <circle key={skill} cx={xPos(i)} cy={yPos(Number(d[skill as keyof DataPoint]))} r={2.5} fill={SKILL_CONFIG[skill].color} />
                        ))}
                    </g>
                ))}
                {/* Average line */}
                <path d={makePath('average')} fill="none" stroke="#1e293b" strokeWidth={3} strokeDasharray="6 3" strokeLinejoin="round" />
                {/* Average dots */}
                {chartData.map((d, i) => (
                    <circle key={i} cx={xPos(i)} cy={yPos(d.average)} r={4} fill="#1e293b" />
                ))}
                {/* Hover detection areas */}
                {chartData.map((d, i) => {
                    const x = xPos(i);
                    const segW = chartData.length > 1 ? innerW / (chartData.length - 1) : innerW;
                    return (
                        <rect key={i} x={x - segW / 2} y={PAD.top} width={segW} height={innerH}
                            fill="transparent"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{ cursor: 'pointer' }}
                        />
                    );
                })}
            </svg>
            {/* Tooltip */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (() => {
                const d = chartData[hoveredIndex];
                return (
                    <div className="absolute z-50 bg-slate-900 text-white text-xs rounded-none shadow-xl border border-slate-700 pointer-events-none"
                        style={{
                            left: `${(xPos(hoveredIndex) / W) * 100}%`,
                            top: `4px`,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 font-bold text-indigo-300 whitespace-nowrap">
                            วันที่ {d.date}
                        </div>
                        <div className="p-3 space-y-1.5">
                            {SKILL_KEYS.map(skill => (
                                <div key={skill} className="flex items-center justify-between gap-6 whitespace-nowrap">
                                    <span className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SKILL_CONFIG[skill].color }} />
                                        {SKILL_CONFIG[skill].label}
                                    </span>
                                    <span className="font-bold tabular-nums" style={{ color: SKILL_CONFIG[skill].color }}>
                                        {Number(d[skill as keyof DataPoint]).toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                            <div className="pt-1.5 mt-1.5 border-t border-slate-700 flex items-center justify-between gap-6 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                                    <span className="w-3 h-0.5 bg-white shrink-0" />
                                    ค่าเฉลี่ยรวม
                                </span>
                                <span className="font-bold text-white tabular-nums">
                                    {d.average.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                {SKILL_KEYS.map(skill => (
                    <span key={skill} className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SKILL_CONFIG[skill].color }} />
                        {SKILL_CONFIG[skill].label}
                    </span>
                ))}
                <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <span className="w-3 h-0.5 bg-slate-800 shrink-0" />
                    ค่าเฉลี่ยรวม
                </span>
            </div>

            {/* Hidden PDF render target */}
            <div ref={pdfRenderRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', background: '#fff', fontFamily: 'Kanit, Tahoma, sans-serif', padding: '30px 40px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '3px solid #1e293b', paddingBottom: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e293b' }}>รายงานสรุปผลการประเมิน</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                        {studentName && <span>ผู้เรียน: {studentName} &nbsp;|&nbsp; </span>}
                        {subjectName && <span>วิชา: {subjectName} &nbsp;|&nbsp; </span>}
                        {level && <span>ระดับ: {level} {subLevel}</span>}
                    </div>
                </div>

                {/* Chart SVG (clone scaled for 800px width) */}
                <div style={{ marginBottom: 20 }}>
                    <svg width={800} height={Math.round(800 * CHART_HEIGHT / W)} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                        {[0, 25, 50, 75, 100].map(v => (
                            <line key={v} x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={v === 50 ? '' : '3 3'} />
                        ))}
                        {[0, 25, 50, 75, 100].map(v => (
                            <text key={v} x={PAD.left - 8} y={yPos(v) + 4} textAnchor="end" fontSize={11} fill="#64748b" fontFamily="Kanit, Tahoma, sans-serif">
                                {v}%
                            </text>
                        ))}
                        {chartData.map((d, i) => (
                            <text key={i} x={xPos(i)} y={H - PAD.bottom + 16}
                                textAnchor={i === 0 ? 'start' : i === chartData.length - 1 ? 'end' : 'middle'}
                                fontSize={10} fill="#64748b" fontFamily="Kanit, Tahoma, sans-serif">
                                {d.date}
                            </text>
                        ))}
                        {SKILL_KEYS.map(skill => (
                            <path key={skill} d={makePath(skill as keyof DataPoint)} fill="none" stroke={SKILL_CONFIG[skill].color} strokeWidth={1.5} strokeLinejoin="round" />
                        ))}
                        {chartData.map((d, i) => (
                            <g key={i}>
                                {SKILL_KEYS.map(skill => (
                                    <circle key={skill} cx={xPos(i)} cy={yPos(Number(d[skill as keyof DataPoint]))} r={2.5} fill={SKILL_CONFIG[skill].color} />
                                ))}
                            </g>
                        ))}
                        <path d={makePath('average')} fill="none" stroke="#1e293b" strokeWidth={3} strokeDasharray="6 3" strokeLinejoin="round" />
                        {chartData.map((d, i) => (
                            <circle key={i} cx={xPos(i)} cy={yPos(d.average)} r={4} fill="#1e293b" />
                        ))}
                    </svg>
                </div>

                {/* Summary table */}
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 }}>สรุปคะแนนแต่ละคาบเรียน</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                            <th style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>วันที่</th>
                            {SKILL_KEYS.map(skill => (
                                <th key={skill} style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>{SKILL_CONFIG[skill].label}</th>
                            ))}
                            <th style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>เฉลี่ย</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((d, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{d.date}</td>
                                {SKILL_KEYS.map(skill => (
                                    <td key={skill} style={{ padding: '4px 4px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: SKILL_CONFIG[skill].color }}>{Number(d[skill as keyof DataPoint]).toFixed(1)}%</td>
                                ))}
                                <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>{d.average.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Total average */}
                <div style={{ marginTop: 12, background: '#1e293b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>คะแนนเฉลี่ยรวมทุกคาบ</span>
                    <span>{totalAvg.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}
