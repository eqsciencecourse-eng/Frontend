import { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';
import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface OfficialReportDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    grades: any[];
    studentName: string;
}

// [UPDATED] Skill Structure Matches Teacher Dashboard (6 Skills)
const SKILL_STRUCTURE = [
    {
        category: 'ด้านองค์ความรู้ (Knowledge)',
        items: [
            { id: 'k_exercise', label: 'แบบฝึกหัด', max: 5 }
        ]
    },
    {
        category: 'ด้านการปฏิบัติ (Action/Skill)',
        items: [
            { id: 's_creative', label: 'ความคิดสร้างสรรค์ (Creative Thinking)', max: 5 },
            { id: 's_planning', label: 'วางแผนการทำงาน (Planning & Time Management)', max: 5 },
            { id: 's_problem_solving', label: 'การแก้ปัญหา (Problem Solving)', max: 5 },
            { id: 's_design_improve', label: 'ปรับปรุงการออกแบบ (Improve of Design)', max: 5 },
            { id: 's_programming', label: 'ทักษะการเขียนโปรแกรม (Programming)', max: 5 },
            { id: 's_emotional', label: 'ทักษะทางอารมณ์/สมาธิ/ความขยัน', max: 5 }
        ]
    }
];

export default function OfficialReportDownloadModal({ isOpen, onClose, grades, studentName }: OfficialReportDownloadModalProps) {
    const [downloading, setDownloading] = useState(false);
    const [reportGrade, setReportGrade] = useState<any | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Filter ONLY completed grades or sufficiently progressed ones
    const completedGrades = grades.filter(g => g.isComplete || g.finalGrade || (g.evaluations && g.evaluations.length >= 10));

    const handleSelectSubject = async (grade: any) => {
        if (downloading) return;
        setReportGrade(grade);
        setDownloading(true);

        // Allow render
        setTimeout(async () => {
            if (!reportRef.current) {
                setDownloading(false);
                return;
            }
            try {
                // Use higher scale for better quality
                const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Official_Report_${studentName}_${grade.subjectName}.pdf`);
            } catch (error) {
                console.error('PDF Error', error);
            } finally {
                setDownloading(false);
                setReportGrade(null);
            }
        }, 1500); // Wait for images to load
    };

    // Calculate final score for display in the simplified table
    const getFinalScoreInfo = (grade: any) => {
        if (!grade) return { score: 0, grade: '-' };

        // If backend already has finalScore
        if (grade.finalScore) return { score: grade.finalScore, grade: grade.finalGrade };

        // Otherwise calculate manually (fallback)
        let total = 0;
        let max = 0;
        // Assume 12 periods max for calculation if not specified
        const periods = grade.evaluations?.map((e: any) => e.period) || [];
        // Flatten scores
        grade.evaluations?.forEach((e: any) => {
            if (e.scores) {
                Object.values(e.scores).forEach((v: any) => {
                    total += Number(v) || 0;
                });
                // Rough estimate: 7 items * 5 pts = 35 max per period
                max += 40;
            }
        });

        const percent = max > 0 ? (total / max) * 100 : 0;

        // Thai Grade Logic
        let thaiGrade = "0";
        if (percent >= 80) thaiGrade = "4";
        else if (percent >= 75) thaiGrade = "3.5";
        else if (percent >= 70) thaiGrade = "3";
        else if (percent >= 65) thaiGrade = "2.5";
        else if (percent >= 60) thaiGrade = "2";
        else if (percent >= 55) thaiGrade = "1.5";
        else if (percent >= 50) thaiGrade = "1";

        return { score: percent, grade: thaiGrade };
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-xl">
                {/* 1. Selection State */}
                {!reportGrade && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold font-itim text-slate-800">เลือกผลการเรียนที่ต้องการดาวน์โหลด</h2>
                            <Button variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
                        </div>

                        {completedGrades.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p>ยังไม่มีผลการเรียนที่เสร็จสมบูรณ์</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {completedGrades.map((g, idx) => (
                                    <div key={idx}
                                        onClick={() => handleSelectSubject(g)}
                                        className="border p-4 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all flex items-center justify-between group">
                                        <div>
                                            <h3 className="font-bold text-slate-700">{g.subjectName}</h3>
                                            <p className="text-xs text-slate-500">Term: {g.term || '1'} | Level: {g.level || 'Basic'}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-indigo-200 group-hover:text-indigo-600">
                                            <Download className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Rendering State (Hidden/Preview) */}
                {reportGrade && (
                    <div className="relative w-full h-[90vh] bg-slate-100 flex items-center justify-center p-8 overflow-auto">
                        {downloading && (
                            <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                                <p className="text-slate-600 font-bold animate-pulse">กำลังสร้างไฟล์ PDF...</p>
                            </div>
                        )}

                        {/* THE A4 PAGE CONTAINER */}
                        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-[15mm] flex flex-col items-center relative box-border mx-auto text-slate-900 leading-normal">
                            {/* --- HEADER (Government Style) --- */}
                            <div className="w-full flex flex-col items-center mb-6 relative">
                                <div className="absolute left-0 top-0">
                                    <img src="/logo.png" alt="Logo" className="h-20 object-contain" />
                                </div>

                                <div className="text-center mt-2">
                                    <h1 className="text-2xl font-bold text-indigo-900 mb-1">ใบรายงานผลการเรียน</h1>
                                    <h2 className="text-lg font-bold text-slate-700">สถาบันกวดวิชา EQ Science Learning Center</h2>
                                    <p className="text-sm text-slate-500">12/34 ถนนสุขุมวิท ตำบลเนินพระ อำเภอเมืองระยอง จังหวัดระยอง 21000</p>
                                </div>
                                <div className="w-full h-[2px] bg-slate-800 mt-6 mb-8"></div>
                            </div>

                            {/* --- STUDENT INFO --- */}
                            <div className="w-full grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-base">
                                <div className="flex">
                                    <span className="font-bold w-[100px]">ชื่อ-นามสกุล:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1 px-2">{studentName}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-bold w-[60px]">วิชา:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1 px-2 font-bold">{reportGrade.subjectName}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-bold w-[100px]">รหัสนักเรียน:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1 px-2">-</span>
                                </div>
                                <div className="flex">
                                    <span className="font-bold w-[60px]">วันที่:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1 px-2">
                                        {format(new Date(), 'd MMMM yyyy', { locale: th })}
                                    </span>
                                </div>
                            </div>

                            {/* --- GRADE BOX --- */}
                            <div className="w-full border border-slate-800 rounded-xl p-8 mb-8 flex items-center justify-between">
                                <div className="text-center flex-1 border-r border-slate-200">
                                    <p className="text-slate-500 text-lg font-bold mb-2">ผลการประเมินตลอดหลักสูตร (Term {reportGrade.term || '1'})</p>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                                        {getFinalScoreInfo(reportGrade).score.toFixed(0)}
                                    </h1>
                                    <p className="text-xs text-slate-400 mt-1">(คะแนนรวม)</p>
                                </div>
                                <div className="text-center w-[150px]">
                                    <p className="text-slate-500 font-bold mb-1">ระดับคะแนน</p>
                                    <h1 className="text-6xl font-black text-slate-900">{getFinalScoreInfo(reportGrade).grade}</h1>
                                </div>
                            </div>

                            {/* --- TABLE HEADER --- */}
                            <h3 className="w-full text-left font-bold text-lg mb-4">รายละเอียดการประเมิน (Evaluation Details)</h3>

                            {/* --- SIMPLIFIED TABLE --- */}
                            <div className="w-full mb-8">
                                <table className="w-full text-lg border-collapse border border-black gov-table">
                                    <thead>
                                        <tr className="text-center bg-slate-100">
                                            <th className="w-[10%] p-2 border border-black">ลำดับ</th>
                                            <th className="w-[50%] text-left pl-4 p-2 border border-black">รายการประเมิน (Evaluation Criteria)</th>
                                            <th className="w-[15%] p-2 border border-black">คะแนนเต็ม</th>
                                            <th className="w-[25%] p-2 border border-black">ผลประเมิน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SKILL_STRUCTURE.map((group, gIdx) => (
                                            <>
                                                <tr key={gIdx} className="bg-slate-50 font-bold border border-black">
                                                    <td colSpan={4} className="pl-4 py-2 border border-black text-slate-700">{group.category}</td>
                                                </tr>
                                                {group.items.map((item, iIdx) => (
                                                    <tr key={item.id} className="border border-black">
                                                        <td className="text-center py-2 border border-black text-slate-500">{iIdx + 1}</td>
                                                        <td className="pl-4 py-2 border border-black">{item.label}</td>
                                                        <td className="text-center border border-black">5</td>
                                                        <td className="text-center border border-black font-semibold">ผ่านเกณฑ์</td>
                                                    </tr>
                                                ))}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex-1"></div>

                            {/* --- SIGNATURE SECTION --- */}
                            <div className="w-full flex justify-end mt-8 mb-16">
                                <div className="w-[450px] flex flex-col items-center relative gap-1">
                                    {/* Signature Line Block */}
                                    <div className="relative w-full flex justify-center items-end h-[60px] mb-2">
                                        <img
                                            src="/director_signature.png"
                                            alt="Signature"
                                            className="absolute bottom-2 left-1/2 -translate-x-1/2 h-[70px] object-contain z-10"
                                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                        />
                                        <div className="flex items-end text-lg z-0 relative">
                                            <span className="font-bold mr-2 mb-1">ลงชื่อ</span>
                                            <span className="tracking-widest text-slate-400">............................................................</span>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold">( นาง ลัลน์นภัทร ทวีขจรวงศ์ )</p>
                                    <p className="text-lg">ผู้อำนวยการโรงเรียนต้นแบบนวัตกรรมและเทคโนโลยี</p>
                                    <p className="text-base mt-2">วันที่ {format(new Date(), 'd MMMM yyyy', { locale: th })}</p>
                                </div>
                            </div>

                            <div className="w-full text-center text-sm text-slate-500">
                                เอกสารฉบับนี้เป็นเอกสารทางราชการของโรงเรียนต้นแบบนวัตกรรมและเทคโนโลยี (EQ Science)
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
