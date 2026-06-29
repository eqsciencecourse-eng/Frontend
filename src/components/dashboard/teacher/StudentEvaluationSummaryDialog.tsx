import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config';
import { Loader2, Award, CalendarCheck, TrendingUp, AlertCircle, ChevronRight, User, ChevronDown, ChevronUp } from "lucide-react";
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; bar: string }> = {
    present:     { label: 'มาเรียน',  color: 'text-emerald-700', bg: 'bg-emerald-100', bar: '#34d399' },
    late:        { label: 'สาย',       color: 'text-amber-600',   bg: 'bg-amber-100',   bar: '#fbbf24' },
    leave:       { label: 'ลา',        color: 'text-blue-600',    bg: 'bg-blue-100',    bar: '#60a5fa' },
    video_leave: { label: 'ลาวิดีโอ', color: 'text-purple-600',  bg: 'bg-purple-100',  bar: '#a78bfa' },
    absent:      { label: 'ขาด',       color: 'text-red-600',     bg: 'bg-red-100',     bar: '#f87171' },
};

interface MonthData {
    month: string;
    present: number;
    late: number;
    leave: number;
    video_leave: number;
    absent: number;
}

/* ─── Custom CSS Stacked Bar Chart ─── */
function AttendanceBarChart({ data }: { data: MonthData[] }) {
    const [hovered, setHovered] = useState<{ month: string; x: number; y: number } | null>(null);
    const keys = ['present', 'late', 'leave', 'video_leave', 'absent'] as const;
    const maxTotal = Math.max(...data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0)), 1);


    if (data.length === 0) {
        return (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200">
                <CalendarCheck className="w-10 h-10 mb-2" /><p>ยังไม่มีข้อมูลการมาเรียน</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs font-bold">
                {keys.map(k => (
                    <div key={k} className="flex items-center gap-1">
                        <div className="w-3 h-3" style={{ backgroundColor: STATUS_MAP[k].bar }} />
                        <span className="text-slate-600">{STATUS_MAP[k].label}</span>
                    </div>
                ))}
            </div>
            {/* Bars */}
            <div className="flex items-end gap-2 h-44 overflow-x-auto pb-6">
                {data.map((d) => {
                    const total = keys.reduce((s, k) => s + (d[k] || 0), 0);
                    return (
                        <div key={d.month} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 40 }}>
                            <div
                                className="flex flex-col-reverse w-10 cursor-pointer border border-transparent hover:border-slate-400 transition-all"
                                style={{ height: 130 }}
                                onMouseEnter={(e) => setHovered({ month: d.month, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHovered(null)}
                            >
                                {keys.map(k => {
                                    const val = d[k] || 0;
                                    if (!val) return null;
                                    const pct = (val / maxTotal) * 100;
                                    return (
                                        <div
                                            key={k}
                                            style={{ height: `${pct}%`, backgroundColor: STATUS_MAP[k].bar, minHeight: val > 0 ? 4 : 0 }}
                                            title={`${STATUS_MAP[k].label}: ${val}`}
                                        />
                                    );
                                })}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{d.month}</span>
                        </div>
                    );
                })}
            </div>
            {/* Tooltip */}
            {hovered && (() => {
                const d = data.find(x => x.month === hovered.month);
                if (!d) return null;
                return (
                    <div className="fixed z-50 bg-white border border-slate-200 shadow-lg p-3 text-xs pointer-events-none" style={{ top: hovered.y - 120, left: hovered.x + 10, minWidth: 120 }}>
                        <div className="font-black text-slate-800 mb-2 pb-1 border-b border-slate-100">{d.month}</div>
                        {keys.map(k => (d[k] ? (
                            <div key={k} className="flex justify-between gap-4">
                                <span className={STATUS_MAP[k].color + ' font-bold'}>{STATUS_MAP[k].label}</span>
                                <span className="font-black">{d[k]} วัน</span>
                            </div>
                        ) : null))}
                    </div>
                );
            })()}
        </div>
    );
}

/* ─── Custom SVG Radar Chart ─── */
function SkillRadarChart({ data, name }: { data: Array<{ skill: string; value: number }>; name: string }) {
    const size = 260;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    const levels = 5;
    const n = data.length;

    if (n < 3) return (
        <div className="h-40 flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200">
            <AlertCircle className="w-10 h-10 mb-2" /><p>ต้องมีทักษะอย่างน้อย 3 ด้าน</p>
        </div>
    );

    const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;
    const pt = (i: number, radius: number) => ({
        x: cx + radius * Math.cos(angle(i)),
        y: cy + radius * Math.sin(angle(i))
    });

    const gridPolygons = Array.from({ length: levels }, (_, lv) => {
        const pts = data.map((_, i) => pt(i, (r * (lv + 1)) / levels));
        return pts.map(p => `${p.x},${p.y}`).join(' ');
    });

    const dataPoints = data.map((d, i) => {
        const ratio = Math.min(d.value, 5) / 5;
        return pt(i, r * ratio);
    });
    const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Grid */}
                {gridPolygons.map((pts, i) => (
                    <polygon key={i} points={pts} fill="none" stroke="#e2e8f0" strokeWidth={1} />
                ))}
                {/* Axes */}
                {data.map((_, i) => {
                    const end = pt(i, r);
                    return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth={1} />;
                })}
                {/* Data polygon */}
                <polygon points={dataPolygon} fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={2} />
                {/* Data dots */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill="#6366f1" stroke="white" strokeWidth={2} />
                ))}
                {/* Labels */}
                {data.map((d, i) => {
                    const labelPt = pt(i, r + 22);
                    const anchor = labelPt.x < cx - 5 ? 'end' : labelPt.x > cx + 5 ? 'start' : 'middle';
                    return (
                        <text key={i} x={labelPt.x} y={labelPt.y + 4} textAnchor={anchor} fontSize={10} fill="#475569" fontWeight={700}>
                            {d.skill}
                        </text>
                    );
                })}
                {/* Level labels */}
                {[1,2,3,4,5].map(lv => {
                    const p = { x: cx, y: cy - (r * lv) / 5 - 3 };
                    return <text key={lv} x={p.x + 2} y={p.y} fontSize={8} fill="#94a3b8">{lv}</text>;
                })}
            </svg>
        </div>
    );
}

/* ─── Main Dialog ─── */
interface Props {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
    onProceedToCertificate: (student: any, subject: any) => void;
}

export default function StudentEvaluationSummaryDialog({ isOpen, onClose, student, subject, teacher, onProceedToCertificate }: Props) {
    const [loading, setLoading]             = useState(false);
    const [attendance, setAttendance]       = useState<any[]>([]);
    const [evalLogs, setEvalLogs]           = useState<any[]>([]);
    const [expanded, setExpanded]           = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen) { setAttendance([]); setEvalLogs([]); return; }
        const load = async () => {
            if (!student || !subject) return;
            setLoading(true);
            try {
                const token = await teacher.getIdToken();
                const sid = student._id || student.id;
                const subId = subject._id || subject.id;
                const subName = subject.name;
                const [a, e] = await Promise.all([
                    fetch(buildApiUrl(`attendance/student/${sid}`), { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_ENDPOINTS.BASE}/evaluations/student/${sid}/history?subjectId=${subId}`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                if (a.ok) {
                    const data = await a.json();
                    setAttendance(data.filter((r: any) => r.subjectId === subId || r.subjectName === subName));
                }
                if (e.ok) {
                    const data = await e.json();
                    setEvalLogs(Array.isArray(data) ? data : (data.logs || []));
                }
            } catch {}
            finally { setLoading(false); }
        };
        load();
    }, [isOpen, student, subject]);

    const monthlyBars = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        attendance.forEach(a => {
            const k = format(new Date(a.date), 'MMM yy', { locale: th });
            if (!map[k]) map[k] = { present:0, late:0, leave:0, video_leave:0, absent:0 };
            const s = a.status || 'present';
            if (s in map[k]) map[k][s]++; else map[k].present++;
        });
        return Object.entries(map).map(([month, c]) => ({
            month,
            present: c['present'] || 0,
            late: c['late'] || 0,
            leave: c['leave'] || 0,
            video_leave: c['video_leave'] || 0,
            absent: c['absent'] || 0,
        } as MonthData));
    }, [attendance]);

    const monthlyText = useMemo(() => {
        const map: Record<string, any[]> = {};
        [...attendance].sort((a,b) => new Date(a.date).getTime()-new Date(b.date).getTime()).forEach(a => {
            const k = format(new Date(a.date), 'MMMM yyyy', { locale: th });
            if (!map[k]) map[k] = [];
            map[k].push(a);
        });
        return map;
    }, [attendance]);

    const radarData = useMemo(() => {
        const t: Record<string, {sum:number;count:number}> = {};
        evalLogs.forEach(log => {
            if (log.scores && typeof log.scores === 'object') {
                Object.entries(log.scores).forEach(([s, v]) => {
                    if (!t[s]) t[s] = { sum:0, count:0 };
                    t[s].sum += Number(v); t[s].count++;
                });
            }
        });
        return Object.entries(t).map(([skill, {sum, count}]) => ({ skill, value: parseFloat((sum/count).toFixed(2)) }));
    }, [evalLogs]);

    const stats = useMemo(() => {
        const counts = { present:0, late:0, leave:0, video_leave:0, absent:0 };
        attendance.forEach(a => {
            const s = a.status || 'present';
            if (s in counts) (counts as any)[s]++;
            else counts.present++;
        });
        const total = attendance.length;
        return { ...counts, total, evalPct: total > 0 ? Math.round((evalLogs.length/total)*100) : 0 };
    }, [attendance, evalLogs]);

    const toggleMonth = (m: string) => setExpanded(p => { const n=new Set(p); n.has(m)?n.delete(m):n.add(m); return n; });

    if (!student || !subject) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-100 rounded-none border border-slate-300 shadow-2xl">
                <DialogTitle className="sr-only">ผลประเมินนักเรียนรายบุคคล</DialogTitle>
                <div className="flex flex-col h-[90vh] max-h-[900px]">

                    {/* Header */}
                    <div className="bg-white border-b-2 border-indigo-600 p-5 flex items-center gap-4 shrink-0">
                        <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-slate-800 truncate">
                                {student.studentName || student.displayName}
                                {student.nickname && <span className="text-base text-slate-500 font-medium ml-2">({student.nickname})</span>}
                            </h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                <span>วิชา: <strong className="text-indigo-600">{subject.name}</strong></span>
                            </div>
                        </div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest shrink-0 hidden sm:block">ระบบตรวจสอบผล</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" /><p className="font-bold">กำลังดึงข้อมูล...</p>
                            </div>
                        ) : (
                            <>
                                {/* Status Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {(['present','late','leave','video_leave','absent'] as const).map(k => (
                                        <div key={k} className="bg-white border border-slate-200 p-4 flex items-center gap-3">
                                            <div className="w-2.5 h-10 shrink-0" style={{ backgroundColor: STATUS_MAP[k].bar }} />
                                            <div>
                                                <div className="text-2xl font-black text-slate-800">{(stats as any)[k]}</div>
                                                <div className="text-xs font-bold text-slate-500">{STATUS_MAP[k].label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Eval Progress */}
                                <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                                    <TrendingUp className="w-7 h-7 text-indigo-500 shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-slate-700 text-sm">% ที่ลงคะแนนประเมินแล้ว</span>
                                            <span className="font-black text-indigo-600 text-lg">{stats.evalPct}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-3">
                                            <div className="h-3 bg-indigo-500" style={{ width: `${stats.evalPct}%` }} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">ลงคะแนนแล้ว {evalLogs.length} จาก {stats.total} คาบ</p>
                                    </div>
                                </div>

                                {/* Monthly Bar Chart (CSS — no external lib) */}
                                <div className="bg-white border border-slate-200 p-5">
                                    <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <CalendarCheck className="w-5 h-5 text-slate-400" />
                                        สรุปการมาเรียนรายเดือน
                                    </h3>
                                    <AttendanceBarChart data={monthlyBars} />
                                </div>

                                {/* Monthly Detail (expandable text) */}
                                {Object.entries(monthlyText).map(([month, recs]) => {
                                    const isOpen2 = expanded.has(month);
                                    const p = recs.filter(r=>!r.status||r.status==='present').length;
                                    const a = recs.filter(r=>r.status==='absent').length;
                                    const l = recs.filter(r=>r.status==='leave'||r.status==='video_leave').length;
                                    return (
                                        <div key={month} className="bg-white border border-slate-200">
                                            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors" onClick={() => toggleMonth(month)}>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-slate-700">{month}</span>
                                                    <Badge className="bg-emerald-100 text-emerald-700 rounded-none border-0 text-xs font-bold hover:bg-emerald-200">มา {p} วัน</Badge>
                                                    {l>0&&<Badge className="bg-blue-100 text-blue-700 rounded-none border-0 text-xs font-bold hover:bg-blue-200">ลา {l} วัน</Badge>}
                                                    {a>0&&<Badge className="bg-red-100 text-red-700 rounded-none border-0 text-xs font-bold hover:bg-red-200">ขาด {a} วัน</Badge>}
                                                </div>
                                                {isOpen2?<ChevronUp className="w-4 h-4 text-slate-400 shrink-0"/>:<ChevronDown className="w-4 h-4 text-slate-400 shrink-0"/>}
                                            </button>
                                            {isOpen2 && (
                                                <div className="border-t border-slate-100">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                                                <th className="p-3 text-left">วันที่</th>
                                                                <th className="p-3 text-left">สถานะ</th>
                                                                <th className="p-3 text-left">หมายเหตุ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {recs.map((rec,i) => {
                                                                const si = STATUS_MAP[rec.status]||STATUS_MAP['present'];
                                                                return (
                                                                    <tr key={i} className="hover:bg-slate-50">
                                                                        <td className="p-3 font-medium text-slate-700">{format(new Date(rec.date),'EEEE d MMM yyyy',{locale:th})}</td>
                                                                        <td className="p-3"><span className={`font-bold ${si.color}`}>{si.label}</span></td>
                                                                        <td className="p-3 text-slate-400 text-xs">{rec.remark||rec.note||'-'}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Radar Chart (pure SVG — no external lib) */}
                                <div className="bg-white border border-slate-200 p-5">
                                    <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <Award className="w-5 h-5 text-indigo-500" />
                                        วิเคราะห์ความถนัด (Radar Chart)
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">ค่าเฉลี่ยจากทุกคาบที่มีการประเมิน — ยิ่งเว้าออกมากยิ่งถนัดด้านนั้น</p>
                                    {radarData.length >= 3 ? (
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            <SkillRadarChart data={radarData} name={student.displayName||student.studentName||''} />
                                            <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                                                {radarData.map(d => (
                                                    <div key={d.skill} className="flex items-center justify-between bg-slate-50 p-2 border border-slate-100">
                                                        <span className="text-xs font-bold text-slate-600 truncate mr-2">{d.skill}</span>
                                                        <span className="text-sm font-black text-indigo-600 shrink-0">{d.value}<span className="text-xs font-normal text-slate-400">/5</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200">
                                            <AlertCircle className="w-10 h-10 mb-2" />
                                            <p className="font-medium">ยังไม่มีข้อมูลคะแนนประเมิน</p>
                                            <p className="text-xs">ต้องมีทักษะที่ประเมินอย่างน้อย 3 ด้าน</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3 shrink-0">
                        <Button variant="outline" onClick={onClose} className="rounded-none border-slate-300 text-slate-600 h-11 font-bold">
                            ปิด
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 rounded-none"
                            onClick={() => { onClose(); onProceedToCertificate(student, subject); }}
                        >
                            <Award className="w-5 h-5 mr-2" />
                            ออกใบประกาศ / สรุปผล
                            <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
