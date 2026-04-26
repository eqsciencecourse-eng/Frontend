import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Award, CheckCircle2, ChevronRight, Calculator, FileText, CalendarCheck, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_ENDPOINTS, buildApiUrl } from '@/lib/api-config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useRef } from 'react';

interface StudentEvaluationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
    onUpdate?: () => void;
}

export default function StudentEvaluationWizardDialog({ isOpen, onClose, student, subject, teacher, onUpdate }: StudentEvaluationWizardProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const certificateRef = useRef<HTMLDivElement>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    
    // Data State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [evaluationLogs, setEvaluationLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Selection State
    const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
    const [finalGrade, setFinalGrade] = useState<string>('ดีมาก');
    const [remark, setRemark] = useState<string>('');

    // Fetch Attendance History on Open
    useEffect(() => {
        if (isOpen && student && subject) {
            setStep(1);
            setFinalGrade('ดีมาก');
            setRemark('');
            // Assuming attendanceHistory is passed or we can fetch it here.
            // For now, let's mock it if API is missing, but ideally fetch from API_ENDPOINTS.ATTENDANCE.STUDENT_HISTORY
            fetchAttendance();
        }
    }, [isOpen, student, subject]);

    const fetchAttendance = async () => {
        if (!student || !subject) return;
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const subjectId = subject._id || subject.id;
            const subjectName = subject.name;

            const [attRes, evalRes] = await Promise.all([
                fetch(buildApiUrl(`attendance/student/${student._id || student.id}`), {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API_ENDPOINTS.BASE}/evaluations/student/${student._id || student.id}/history?subjectId=${subjectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (attRes.ok) {
                const data = await attRes.json();
                const filtered = data.filter((record: any) => 
                    record.subjectId === subjectId || 
                    record.subjectName === subjectName
                );
                setAttendanceHistory(filtered);
                setSelectedSessions(filtered.map((r: any) => r._id));
            }

            if (evalRes.ok) {
                setEvaluationLogs(await evalRes.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSession = (id: string) => {
        setSelectedSessions(prev => 
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedSessions.length === attendanceHistory.length) {
            setSelectedSessions([]);
        } else {
            setSelectedSessions(attendanceHistory.map(r => r._id));
        }
    };

    // Derived Guidance Data
    const guidanceStats = useMemo(() => {
        if (selectedSessions.length === 0) return { text: 'N/A', color: 'slate', avg: 0 };
        
        // Find relevant logs for selected sessions (matching by date)
        const selectedAttendanceDates = attendanceHistory
            .filter(a => selectedSessions.includes(a._id))
            .map(a => new Date(a.date).toDateString());
            
        const relevantLogs = evaluationLogs.filter(log => 
            selectedAttendanceDates.includes(new Date(log.date).toDateString())
        );

        if (relevantLogs.length === 0) {
            // Fallback to attendance ratio if no detailed logs
            const ratio = selectedSessions.length / 10;
            if (ratio >= 0.8) return { text: 'ดีเยี่ยม (แนะนำ)', color: 'emerald', avg: 5 };
            return { text: 'ผ่านเกณฑ์ (แนะนำ)', color: 'blue', avg: 3 };
        }

        // Calculate average of averages
        let totalSum = 0;
        let count = 0;
        relevantLogs.forEach(log => {
            const scores = log.scores as any;
            if (scores) {
                const values = Object.values(scores);
                const sessionSum: any = values.reduce((a: any, b: any) => a + Number(b || 0), 0);
                const sessionAvg = (sessionSum as number) / Math.max(1, values.length);
                totalSum += sessionAvg;
                count++;
            }
        });

        const finalAvg = count > 0 ? totalSum / count : 0;
        
        if (finalAvg >= 4.5) return { text: 'ยอดเยี่ยม (A)', color: 'emerald', avg: finalAvg };
        if (finalAvg >= 4.0) return { text: 'ดีมาก (B+)', color: 'blue', avg: finalAvg };
        if (finalAvg >= 3.0) return { text: 'ดี (B)', color: 'indigo', avg: finalAvg };
        return { text: 'ผ่านเกณฑ์ (C)', color: 'orange', avg: finalAvg };
    }, [selectedSessions, attendanceHistory, evaluationLogs]);


    const handleFinalize = async () => {
        if (selectedSessions.length === 0) {
            toast.error("กรุณาเลือกคาบเรียนอย่างน้อย 1 คาบ");
            return;
        }
        
        try {
            setGeneratingPDF(true);
            toast.success(`กำลังสร้างใบประกาศสำหรับ ${student?.displayName} ...`);
            
            // Wait for React to render the hidden certificate fully
            await new Promise(resolve => setTimeout(resolve, 800));

            if (!certificateRef.current) {
                throw new Error("ไม่พบเทมเพลตใบประกาศ");
            }

            // Capture the certificate div
            const canvas = await html2canvas(certificateRef.current, {
                scale: 3, // High quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // Landscape A4 (297 x 210 mm)
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // ~297
            const pdfHeight = pdf.internal.pageSize.getHeight(); // ~210

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            
            // Download the PDF
            pdf.save(`Certificate_${student.displayName}_${subject.name}.pdf`);
            
            // 3. Notify Backend that assessment is complete
            try {
                const token = await teacher.getIdToken();
                await fetch(API_ENDPOINTS.GRADES.BASE + '/finalize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentId: student._id || student.id,
                        subjectId: subject?._id || subject?.id,
                        subjectName: subject?.name,
                        finalGrade: finalGrade,
                        teacherRemark: remark
                    })
                });
            } catch (err) {
                console.error("Failed to save final grade to DB", err);
            }

            // Provide feedback and save to database (TODO: save state to Backend)
            toast.success("สร้างและดาวน์โหลดเอกสารสำเร็จ");

            // Mark as done
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("เกิดข้อผิดพลาดในการสร้างใบประกาศ (PDF Error)");
        } finally {
            setGeneratingPDF(false);
        }
    };

    if (!student || !subject) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#F8FAFC]">
                <div className="flex h-[600px]">
                    
                    {/* Left Sidebar - Steps */}
                    <div className="w-64 bg-indigo-900 text-white p-6 flex flex-col">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-1">ตัดเกรด/ใบประกาศ</h2>
                            <p className="text-indigo-200 text-xs">วิชา: {subject.name}</p>
                        </div>
                        
                        <div className="space-y-6 flex-1">
                            {/* Step 1 */}
                            <div className={`flex items-start gap-3 ${step === 1 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${step === 1 ? 'bg-indigo-500 text-white shadow-lg' : 'bg-indigo-800 text-indigo-300'}`}>
                                    1
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">เลือกคาบเรียน</h4>
                                    <p className="text-xs text-indigo-200 mt-1">เลือกวันที่เข้าเรียนที่จะนำมาคิดคะแนน</p>
                                </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className={`flex items-start gap-3 ${step === 2 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${step === 2 ? 'bg-indigo-500 text-white shadow-lg' : 'bg-indigo-800 text-indigo-300'}`}>
                                    2
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">ตรวจสอบและอนุมัติ</h4>
                                    <p className="text-xs text-indigo-200 mt-1">ยืนยันเกรดและสร้างเอกสาร</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-indigo-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center font-bold">
                                {student.displayName?.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{student.displayName}</p>
                                <p className="text-xs text-indigo-300 truncate">นร.ในความดูแล</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* Step 1 Content */}
                        {step === 1 && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <CalendarCheck className="w-5 h-5 text-indigo-500" />
                                        ประวัติการเข้าเรียน (เลือกเพื่อคิดคะแนน)
                                    </h3>
                                    <Button variant="outline" size="sm" onClick={toggleAll}>
                                        {selectedSessions.length === attendanceHistory.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                                            กำลังโหลดประวัติ...
                                        </div>
                                    ) : attendanceHistory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <CalendarCheck className="h-12 w-12 mb-3 opacity-20" />
                                            ไม่พบประวัติการเรียนในวิชานี้
                                        </div>
                                    ) : (
                                        attendanceHistory.map((record) => (
                                            <div 
                                                key={record._id} 
                                                className={`flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer ${selectedSessions.includes(record._id) ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                                onClick={() => toggleSession(record._id)}
                                            >
                                                <Checkbox 
                                                    checked={selectedSessions.includes(record._id)}
                                                    onCheckedChange={() => toggleSession(record._id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-700 text-sm">
                                                        วันที่ {new Date(record.date).toLocaleDateString('th-TH')}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={
                                                    record.status === 'มาเรียน' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    record.status === 'เรียนออนไลน์' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-orange-50 text-orange-700 border-orange-200'
                                                }>
                                                    {record.status}
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">เลือกแล้ว</p>
                                            <p className="text-lg font-bold text-indigo-600">{selectedSessions.length} <span className="text-sm font-normal text-slate-400">คาบ</span></p>
                                        </div>
                                        <div className="w-px bg-slate-200" />
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">แนะนำเกณฑ์</p>
                                            <p className="text-lg font-bold text-emerald-600">{guidanceStats.text}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 rounded-xl"
                                        onClick={() => setStep(2)}
                                        disabled={selectedSessions.length === 0}
                                    >
                                        ยืนยันเพื่อถัดไป <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 Content */}
                        {step === 2 && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                    <Calculator className="w-5 h-5 text-indigo-500" />
                                    สรุปผลและการติดสินใจ (Manual Adjustment)
                                </h3>

                                <div className="space-y-6 flex-1 overflow-auto">
                                    <Card className="p-5 border-emerald-100 bg-emerald-50/50 shadow-sm">
                                        <h4 className="text-sm font-bold text-emerald-800 mb-2">คำแนะนำจากระบบ (Guided Score)</h4>
                                        <p className="text-sm text-emerald-600">
                                            จากคาบเรียนที่เลือก ({selectedSessions.length} คาบ) ระบบวิเคราะห์ผลการประเมินเบื้องต้นอยู่ในเกณฑ์ 
                                            <Badge className="ml-2 bg-emerald-500 hover:bg-emerald-600">
                                                {guidanceStats.text}
                                            </Badge>
                                        </p>
                                    </Card>

                                    <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <div>
                                            <Label className="text-base font-bold text-slate-700">เกรด/ผลประเมินสุทธิที่จะพิมพ์ลงเกียรติบัตร</Label>
                                            <p className="text-xs text-slate-500 mb-3 mt-1">คุณสามารถปรับเปลี่ยนข้อความนี้ได้ตามที่เห็นสมควร</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['ยอดเยี่ยม', 'ดีมาก', 'ดี', 'พอใช้', 'ผ่านเกณฑ์'].map(grade => (
                                                    <Button
                                                        key={grade}
                                                        type="button"
                                                        variant="outline"
                                                        className={`border-2 h-12 rounded-xl transition-all ${finalGrade === grade ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-indigo-200'}`}
                                                        onClick={() => setFinalGrade(grade)}
                                                    >
                                                        {grade}
                                                        {finalGrade === grade && <CheckCircle2 className="w-4 h-4 ml-2" />}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-base font-bold text-slate-700 inline-block mb-2 mt-4">หมายเหตุของครูผู้สอน (Teacher Remark)</Label>
                                            <textarea 
                                                className="w-full h-24 p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="ครูภูมิใจในความมุ่งมั่นและตั้งใจเรียนของหนู..."
                                                value={remark}
                                                onChange={(e) => setRemark(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 border border-slate-300 bg-white" disabled={generatingPDF}>
                                        ย้อนกลับ
                                    </Button>
                                    <Button 
                                        className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 rounded-xl"
                                        onClick={handleFinalize}
                                        disabled={generatingPDF}
                                    >
                                        {generatingPDF ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
                                        {generatingPDF ? 'กำลังสร้างไฟล์ PDF...' : 'ยืนยันและรับไฟล์ PDF'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- HIDDEN CERTIFICATE TEMPLATE --- */}
                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
                    <div 
                        ref={certificateRef}
                        style={{
                            width: '297mm', // A4 Landscape width
                            height: '210mm', // A4 Landscape height
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            padding: '20mm',
                            boxSizing: 'border-box',
                            fontFamily: '"Kanit", "Inter", sans-serif',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#1e293b'
                        }}
                    >
                        {/* Inner Border Layer 1 */}
                        <div style={{
                            position: 'absolute', top: '10mm', bottom: '10mm', left: '10mm', right: '10mm',
                            border: '3px solid #1e1b4b',
                            borderRadius: '16px'
                        }} />
                        
                        {/* Inner Border Layer 2 */}
                        <div style={{
                            position: 'absolute', top: '12mm', bottom: '12mm', left: '12mm', right: '12mm',
                            border: '1px solid #4338ca',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(248, 250, 252, 0.4)'
                        }} />

                        {/* Top Watermark/Logo styling (using text symbol as fallback if logo not found) */}
                        <div style={{ zIndex: 10, textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ width: '80px', height: '80px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2ff', borderRadius: '50%', color: '#4f46e5' }}>
                                <Award size={48} />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 style={{ zIndex: 10, fontSize: '48px', color: '#1e1b4b', fontWeight: 800, letterSpacing: '2px', margin: '0 0 10px 0' }}> CERTIFICATE OF EXCELLENCE </h1>
                        <p style={{ zIndex: 10, fontSize: '18px', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}> EQ Science Learning Center </p>
                        
                        {/* Awarded to */}
                        <div style={{ zIndex: 10, marginTop: '40px', marginBottom: '20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '10px' }}>This certificate is proudly awarded to:</p>
                            <h2 style={{ fontSize: '36px', color: '#0f172a', fontWeight: 'bold', margin: '0', borderBottom: '2px solid #cbd5e1', display: 'inline-block', padding: '0 40px 10px 40px' }}>
                                {student?.displayName || student?.firstName + ' ' + student?.lastName}
                            </h2>
                        </div>

                        {/* Description */}
                        <div style={{ zIndex: 10, width: '70%', textAlign: 'center', marginBottom: '30px' }}>
                            <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#475569' }}>
                                for successfully completing and demonstrating exceptional skills in the course of  
                                <strong style={{ color: '#4338ca', fontWeight: 'bold', marginLeft: '6px' }}>{subject?.name}</strong>. 
                                We commend your dedication, creativity, and commitment to learning.
                            </p>
                        </div>

                        {/* Grade Ribbon */}
                        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                            <span style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Performance Grade</span>
                            <div style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '10px 30px', borderRadius: '50px', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                {finalGrade}
                            </div>
                        </div>

                        {/* Signatures */}
                        <div style={{ zIndex: 10, display: 'flex', justifyContent: 'space-between', width: '80%', marginTop: 'auto', marginBottom: '20px' }}>
                            {/* Date */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #1e293b', width: '200px', paddingBottom: '5px', marginBottom: '5px', fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
                                    {format(new Date(), 'd MMMM yyyy', { locale: th })}
                                </div>
                                <span style={{ fontSize: '14px', color: '#64748b' }}>Date of Issue</span>
                            </div>

                            {/* Director Signature */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ position: 'relative', width: '200px', height: '50px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <div style={{ borderBottom: '1px solid #1e293b', width: '200px', position: 'absolute', bottom: 0 }}></div>
                                    <img src="/director_signature.png" style={{ height: '60px', opacity: 0.8, marginBottom: '5px', zIndex: 5, position: 'relative' }} alt="Signature" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                </div>
                                <span style={{ fontSize: '14px', color: '#64748b', display: 'block', marginTop: '5px' }}>Director Signature</span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>( นาง ลัลน์นภัทร ทวีขจรวงศ์ )</span>
                            </div>
                        </div>
                        
                        {/* Background Decorative Circles */}
                        <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.03)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.05)', pointerEvents: 'none' }} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
