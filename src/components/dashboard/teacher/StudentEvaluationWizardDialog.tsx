import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calculator, Award, CalendarCheck, Settings2, Download, LayoutTemplate, X, ChevronRight, Loader2, Image as ImageIcon, Mail, Send, FileText, ArrowLeft, Upload, BarChart3 } from "lucide-react";
import EvolutionChart from './EvolutionChart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_ENDPOINTS, buildApiUrl } from '@/lib/api-config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useRef } from 'react';

const CERT_THEMES: Record<string, { color: string, label: string }> = {
    gold: { color: '#d4af37', label: 'กรอบทอง' },
    blue: { color: '#1d4ed8', label: 'กรอบน้ำเงิน' },
    red: { color: '#dc2626', label: 'กรอบสีแดง' },
    green: { color: '#15803d', label: 'กรอบสีเขียว' },
    yellow: { color: '#eab308', label: 'กรอบสีเหลือง' }
};

interface StudentEvaluationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
    onUpdate?: () => void;
    onBack?: () => void;
}

export default function StudentEvaluationWizardDialog({ isOpen, onClose, student, subject, teacher, onUpdate, onBack }: StudentEvaluationWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [certLayout, setCertLayout] = useState({
        titleX: 0, titleY: 0, titleScale: 1,
        nameX: 0, nameY: 0, nameScale: 1,
        courseX: 0, courseY: 0, courseScale: 1,
        signatureX: 0, signatureY: 0, signatureScale: 1,
        schoolLogoX: 0, schoolLogoY: 0, schoolLogoScale: 1,
        subjectLogoX: 0, subjectLogoY: 0, subjectLogoScale: 1,
        codeX: 0, codeY: 0, codeScale: 1
    });
    const issueDateEN = format(new Date(), 'MMMM d, yyyy');
    const [certCodeText, setCertCodeText] = useState(`DATE OF ISSUE : ${issueDateEN.toUpperCase()}`);
    const [showSchoolLogo, setShowSchoolLogo] = useState(false);
    const [showSubjectLogo, setShowSubjectLogo] = useState(false);
    const [subjectLogoUrl, setSubjectLogoUrl] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string>('Basic');
    const [selectedSubLevel, setSelectedSubLevel] = useState<string>('1');
    const certificateRef = useRef<HTMLDivElement>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [previewScale, setPreviewScale] = useState(0.55);
    const [certTheme, setCertTheme] = useState<string>('red');
    
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
        const record = attendanceHistory.find(r => r._id === id);
        if (record) {
            const log = evaluationLogs.find(log => new Date(log.date).toDateString() === new Date(record.date).toDateString());
            if (!log) {
                toast.error("ไม่มีคะเเนนในคาบนี้กรุณากรอกคะเเนน");
                return;
            }
            if (log.level !== selectedLevel || String(log.subLevel) !== String(selectedSubLevel)) {
                toast.error(`คาบเรียนนี้ถูกประเมินในระดับ ${log.level} ${log.subLevel} ไปแล้ว`);
                return;
            }
        }
        setSelectedSessions(prev => 
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedSessions.length > 0) {
            setSelectedSessions([]);
        } else {
            const validIds = attendanceHistory.filter(r => {
                const log = evaluationLogs.find(log => new Date(log.date).toDateString() === new Date(r.date).toDateString());
                return log && log.level === selectedLevel && String(log.subLevel) === String(selectedSubLevel);
            }).map(r => r._id);
            if (validIds.length === 0) {
                toast.error(`ไม่มีคาบเรียนใดที่มีคะแนนระดับ ${selectedLevel} ${selectedSubLevel} เลย`);
                return;
            }
            setSelectedSessions(validIds);
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
        const levelString = `${selectedLevel} ${selectedSubLevel}`;
        
        if (finalAvg >= 4.5) return { text: `ยอดเยี่ยม (A) - ระดับ ${levelString}`, color: 'emerald', avg: finalAvg, level: selectedLevel, subLevel: selectedSubLevel, baseGrade: 'ยอดเยี่ยม' };
        if (finalAvg >= 4.0) return { text: `ดีมาก (B+) - ระดับ ${levelString}`, color: 'blue', avg: finalAvg, level: selectedLevel, subLevel: selectedSubLevel, baseGrade: 'ดีมาก' };
        if (finalAvg >= 3.0) return { text: `ดี (B) - ระดับ ${levelString}`, color: 'indigo', avg: finalAvg, level: selectedLevel, subLevel: selectedSubLevel, baseGrade: 'ดี' };
        return { text: `ผ่านเกณฑ์ (C) - ระดับ ${levelString}`, color: 'orange', avg: finalAvg, level: selectedLevel, subLevel: selectedSubLevel, baseGrade: 'ผ่านเกณฑ์' };
    }, [selectedSessions, attendanceHistory, evaluationLogs]);

    useEffect(() => {
        if ((guidanceStats as any).baseGrade) {
            setFinalGrade((guidanceStats as any).baseGrade);
        }
    }, [guidanceStats]);


    const saveGradeToBackend = async () => {
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
                    teacherRemark: remark,
                    level: selectedLevel,
                    subLevel: selectedSubLevel
                })
            });
        } catch (err) {
            console.error("Failed to save final grade to DB", err);
        }
    };

    const generateCanvas = async () => {
        if (selectedSessions.length === 0) {
            toast.error("กรุณาเลือกคาบเรียนอย่างน้อย 1 คาบ");
            return null;
        }
        setGeneratingPDF(true);
        // Wait for React to render the hidden certificate fully
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!certificateRef.current) {
            setGeneratingPDF(false);
            toast.error("ไม่พบเทมเพลตใบประกาศ");
            return null;
        }

        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 3, // High quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            return canvas;
        } catch (error) {
            console.error("Canvas Gen Error:", error);
            toast.error("เกิดข้อผิดพลาดในการสร้างรูปใบประกาศ");
            setGeneratingPDF(false);
            return null;
        }
    };

    const handleDownloadPDF = async () => {
        toast.success(`กำลังสร้าง PDF สำหรับ ${student?.displayName} ...`);
        const canvas = await generateCanvas();
        if (!canvas) return;

        try {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Certificate_${student.displayName}_${subject.name}.pdf`);
            
            await saveGradeToBackend();
            toast.success("บันทึกและดาวน์โหลด PDF สำเร็จ");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก PDF");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handleDownloadPNG = async () => {
        toast.success(`กำลังสร้างรูปภาพ สำหรับ ${student?.displayName} ...`);
        const canvas = await generateCanvas();
        if (!canvas) return;

        try {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Certificate_${student.displayName}_${subject.name}.png`;
            link.href = imgData;
            link.click();
            
            await saveGradeToBackend();
            toast.success("บันทึกและดาวน์โหลดรูปภาพสำเร็จ");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("PNG Export Error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกรูปภาพ");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handleSendEmail = async () => {
        const email = student?.email;
        if (!email) {
            toast.error("ไม่พบอีเมลของนักเรียนในระบบ ไม่สามารถส่งอีเมลได้", {
                description: "กรุณาให้นักเรียนเพิ่มอีเมลในหน้าโปรไฟล์ หรือเลือกใช้วิธีดาวน์โหลดแทน"
            });
            return;
        }

        toast.info(`กำลังเตรียมส่งอีเมลไปยัง ${email} ...`);
        const canvas = await generateCanvas();
        if (!canvas) return;

        try {
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            // In a real scenario, this would post the imgData/PDF Blob to a backend endpoint to send email
            // Example:
            // await fetch('/api/grades/send-certificate', { ... })
            
            await saveGradeToBackend();
            
            // Simulating API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(`ส่งใบประกาศไปยัง ${email} สำเร็จ!`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Email Sending Error:", error);
            toast.error("เกิดข้อผิดพลาดในการส่งอีเมล");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handleSendToStudentWebsite = async () => {
        if (!student) return;
        toast.info(`กำลังบันทึกใบประกาศสำหรับ ${student.displayName || student.firstName} ...`);
        const canvas = await generateCanvas();
        if (!canvas) return;

        try {
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const token = await teacher.getIdToken();

            const res = await fetch(API_ENDPOINTS.GRADES.BASE + '/finalize', {
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
                    teacherRemark: remark,
                    certificateImage: imgData,
                    level: selectedLevel,
                    subLevel: selectedSubLevel
                })
            });

            if (res.ok) {
                toast.success(`บันทึกใบประกาศให้นักเรียนในเว็บไซต์เรียบร้อย`);
                if (onUpdate) onUpdate();
            } else {
                toast.error("บันทึกไม่สำเร็จ");
            }
        } catch (error) {
            console.error("Send to Website Error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกใบประกาศ");
        } finally {
            setGeneratingPDF(false);
        }
    };

    if (!student || !subject) return null;

    const totalHours = selectedSessions.length * 2;
    const scorePercent = ((guidanceStats.avg / 5) * 100).toFixed(1);
    const studentName = student?.displayName || `${student?.firstName || ''} ${student?.lastName || ''}`;
    const issueDateTH = format(new Date(), 'd MMMM yyyy', { locale: th });

    const renderCertificate = (isHD: boolean = false) => (
        <div
            ref={isHD ? certificateRef : null}
            style={{
                width: '297mm',
                height: '210mm',
                backgroundColor: '#ffffff',
                position: 'relative',
                boxSizing: 'border-box',
                fontFamily: '"Kanit", "Inter", sans-serif',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '14px solid #d4af37',
                ...(isHD ? {} : {
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    flexShrink: 0,
                })
            }}
        >
            {/* Background: subtle dot grid */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.35, pointerEvents: 'none' }} />

            {/* Magnificent Inner Borders */}
            <div style={{ position: 'absolute', inset: '6px', border: '1px solid #d4af37', pointerEvents: 'none', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: '12px', border: `2px solid ${CERT_THEMES[certTheme].color}`, pointerEvents: 'none', zIndex: 1, transition: 'border-color 0.3s' }} />

            {/* Decorative corner - Top Left (Intricate Layered) */}
            <div style={{ position: 'absolute', top: '12px', left: '12px', width: '180px', height: '180px', pointerEvents: 'none', zIndex: 2 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '180px 180px 0 0', borderColor: `${CERT_THEMES[certTheme].color} transparent transparent transparent`, transition: 'border-color 0.3s' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '140px 140px 0 0', borderColor: '#d4af37 transparent transparent transparent' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '120px 120px 0 0', borderColor: '#ffffff transparent transparent transparent' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '60px 60px 0 0', borderColor: `${CERT_THEMES[certTheme].color} transparent transparent transparent`, transition: 'border-color 0.3s' }} />
            </div>

            {/* Decorative corner - Bottom Left */}
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '180px', height: '180px', pointerEvents: 'none', zIndex: 2 }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 180px 180px 0', borderColor: `transparent transparent ${CERT_THEMES[certTheme].color} transparent`, transition: 'border-color 0.3s' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 140px 140px 0', borderColor: 'transparent transparent #d4af37 transparent' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 120px 120px 0', borderColor: 'transparent transparent #ffffff transparent' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 60px 60px 0', borderColor: `transparent transparent ${CERT_THEMES[certTheme].color} transparent`, transition: 'border-color 0.3s' }} />
            </div>

            {/* Decorative corner - Top Right */}
            <div style={{ position: 'absolute', top: '12px', right: '12px', width: '180px', height: '180px', pointerEvents: 'none', zIndex: 2 }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 180px 180px 0', borderColor: `transparent ${CERT_THEMES[certTheme].color} transparent transparent`, transition: 'border-color 0.3s' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 140px 140px 0', borderColor: 'transparent #d4af37 transparent transparent' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 120px 120px 0', borderColor: 'transparent #ffffff transparent transparent' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 60px 60px 0', borderColor: `transparent ${CERT_THEMES[certTheme].color} transparent transparent`, transition: 'border-color 0.3s' }} />
            </div>

            {/* Decorative corner - Bottom Right */}
            <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '180px', height: '180px', pointerEvents: 'none', zIndex: 2 }}>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 180px 180px', borderColor: `transparent transparent ${CERT_THEMES[certTheme].color} transparent`, transition: 'border-color 0.3s' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 140px 140px', borderColor: 'transparent transparent #d4af37 transparent' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 120px 120px', borderColor: 'transparent transparent #ffffff transparent' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 60px 60px', borderColor: `transparent transparent ${CERT_THEMES[certTheme].color} transparent`, transition: 'border-color 0.3s' }} />
            </div>

            {/* Independent School Logo */}
            {showSchoolLogo && (
                <div style={{ position: 'absolute', top: '40px', right: '60px', zIndex: 10, transform: `translate(${certLayout.schoolLogoX}px, ${certLayout.schoolLogoY}px) scale(${certLayout.schoolLogoScale})`, transformOrigin: 'top right' }}>
                    <img src="/school_logo_official.png" style={{ height: '80px', objectFit: 'contain' }} alt="School Badge" onError={(e) => { (e.target as HTMLImageElement).src = '/school_badge.png'; }} />
                </div>
            )}

            {/* Independent Subject Logo (Uploaded) */}
            {showSubjectLogo && subjectLogoUrl && (
                <div style={{ position: 'absolute', top: '40px', left: '60px', zIndex: 10, transform: `translate(${certLayout.subjectLogoX}px, ${certLayout.subjectLogoY}px) scale(${certLayout.subjectLogoScale})`, transformOrigin: 'top left' }}>
                    <img src={subjectLogoUrl} style={{ height: '80px', objectFit: 'contain' }} alt="Subject Logo" />
                </div>
            )}

            {/* Title area (Separated from logos) */}
            <div style={{ textAlign: 'center', padding: '60px 80px 0', position: 'relative', zIndex: 10, transform: `translate(${certLayout.titleX}px, ${certLayout.titleY}px) scale(${certLayout.titleScale})`, transformOrigin: 'top center' }}>
                <h1 style={{ fontSize: '52px', fontWeight: 900, color: '#0f172a', letterSpacing: '6px', margin: 0, lineHeight: 1, textTransform: 'uppercase', fontFamily: '"Kanit", sans-serif' }}>
                    CERTIFICATE
                </h1>
                <p style={{ fontSize: '20px', color: '#0f172a', fontWeight: 500, letterSpacing: '3px', margin: '4px 0 6px', textTransform: 'uppercase' }}>OF ACHIEVEMENT</p>
                <p style={{ fontSize: '12px', color: CERT_THEMES[certTheme].color, fontWeight: 700, letterSpacing: '2px', margin: 0, textTransform: 'uppercase', transition: 'color 0.3s' }}>EQ SCIENCE LEARNING CENTER, THAILAND</p>
                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 400, margin: '12px 0 0', letterSpacing: '0.5px' }}>THIS CERTIFICATE IS PROUDLY AWARDED TO :</p>
            </div>

            {/* Student Name */}
            <div style={{ textAlign: 'center', padding: '30px 80px', position: 'relative', zIndex: 10, transform: `translate(${certLayout.nameX}px, ${certLayout.nameY}px) scale(${certLayout.nameScale})`, transformOrigin: 'center' }}>
                <div style={{ borderBottom: '3px solid #0f172a', borderTop: '1px solid #0f172a', display: 'inline-block', padding: '6px 40px' }}>
                    <h2 style={{ fontSize: '42px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '1px' }}>{studentName}</h2>
                </div>
            </div>

            {/* Course & Stats details */}
            <div style={{ textAlign: 'center', padding: '20px 80px', position: 'relative', zIndex: 10, transform: `translate(${certLayout.courseX}px, ${certLayout.courseY}px) scale(${certLayout.courseScale})`, transformOrigin: 'center' }}>
                <p style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 8px', fontWeight: 400, letterSpacing: '0.5px' }}>
                    HAS COMPLETED THE &ldquo;<strong style={{ fontWeight: 700 }}>{subject?.name?.toUpperCase()}</strong>&rdquo;
                </p>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: '4px 0', fontWeight: 400, letterSpacing: '0.5px' }}>
                    WITH THE PASSING SCORE OF <strong style={{ fontWeight: 700 }}>{scorePercent}%</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: '4px 0', fontWeight: 400, letterSpacing: '0.5px' }}>
                    TOTAL <strong style={{ fontWeight: 700 }}>{totalHours} HOUR</strong> COURSE
                </p>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: '4px 0', fontWeight: 400, letterSpacing: '0.5px' }}>
                    LEVEL: <strong style={{ fontWeight: 700 }}>{selectedLevel} {selectedSubLevel}</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: '4px 0', fontWeight: 400, letterSpacing: '0.5px' }}>
                    DATE : <strong style={{ fontWeight: 700 }}>{issueDateEN.toUpperCase()}</strong>
                </p>
            </div>

            {/* Signature area */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', padding: '0 80px 40px', marginTop: 'auto', position: 'relative', zIndex: 10, transform: `translate(${certLayout.signatureX}px, ${certLayout.signatureY}px) scale(${certLayout.signatureScale})`, transformOrigin: 'bottom left' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', height: '56px', width: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px' }}>
                        <img src="/director_signature.png" style={{ height: '70px', objectFit: 'contain', position: 'relative', zIndex: 5 }} alt="Signature" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                    <div style={{ borderTop: '2px solid #0f172a', paddingTop: '6px', width: '180px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>DIRECTOR</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', fontWeight: 400 }}>( นาง ลัลน์นภัทร ทวีขจรวงศ์ )</p>
                    </div>
                </div>
            </div>

            {/* Certificate Code / Custom Text (Bottom Right Area) */}
            <div style={{ position: 'absolute', bottom: '10px', right: '70px', zIndex: 10, textAlign: 'right', transform: `translate(${certLayout.codeX}px, ${certLayout.codeY}px) scale(${certLayout.codeScale})`, transformOrigin: 'bottom right' }}>
                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}>
                    {certCodeText}
                </p>
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-full w-screen h-screen m-0 p-0 overflow-hidden bg-slate-50 border-none rounded-none shadow-none !block [&>button]:hidden">
                <DialogTitle className="sr-only">ตัดเกรด/ใบประกาศ</DialogTitle>
                <div className="flex h-full w-full overflow-hidden">
                    
                    {/* Left Sidebar - Steps */}
                    <div className="w-64 bg-indigo-900 text-white p-6 flex flex-col">
                        <div className="mb-8">
                            {onBack && (
                                <button onClick={onBack} className="text-indigo-200 hover:text-white text-sm font-bold mb-3 flex items-center gap-1 transition-colors">
                                    <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
                                </button>
                            )}
                            <h2 className="text-xl font-bold mb-1">ตัดเกรด/ใบประกาศ</h2>
                            <p className="text-indigo-200 text-xs">วิชา: {subject.name}</p>
                        </div>
                        
                        <div className="space-y-6 flex-1">
                            {/* Step 1 */}
                            <div className={`flex items-start gap-4 ${step === 1 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-10 h-10 flex items-center justify-center font-bold shrink-0 border transition-all ${step === 1 ? 'bg-indigo-600 text-white shadow-sm border-indigo-500' : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'}`}>
                                    1
                                </div>
                                <div className="mt-0.5">
                                    <h4 className="font-bold text-sm">เลือกระดับ</h4>
                                    <p className="text-xs text-indigo-200 mt-1">เลือกระดับที่จะออกเกรด</p>
                                </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className={`flex items-start gap-4 ${step === 2 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-10 h-10 flex items-center justify-center font-bold shrink-0 border transition-all ${step === 2 ? 'bg-indigo-600 text-white shadow-sm border-indigo-500' : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'}`}>
                                    2
                                </div>
                                <div className="mt-0.5">
                                    <h4 className="font-bold text-sm">เลือกคาบเรียน</h4>
                                    <p className="text-xs text-indigo-200 mt-1">เลือกวันที่เข้าเรียนที่จะนำมาคิดคะแนน</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className={`flex items-start gap-4 ${step === 3 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-10 h-10 flex items-center justify-center font-bold shrink-0 border transition-all ${step === 3 ? 'bg-indigo-600 text-white shadow-sm border-indigo-500' : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'}`}>
                                    3
                                </div>
                                <div className="mt-0.5">
                                    <h4 className="font-bold text-sm">ตรวจสอบสถิติ</h4>
                                    <p className="text-xs text-indigo-200 mt-1">สรุปผลและคำนวณสถิติ</p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className={`flex items-start gap-4 ${step === 4 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-10 h-10 flex items-center justify-center font-bold shrink-0 border transition-all ${step === 4 ? 'bg-indigo-600 text-white shadow-sm border-indigo-500' : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'}`}>
                                    4
                                </div>
                                <div className="mt-0.5">
                                    <h4 className="font-bold text-sm">ออกแบบใบประกาศ</h4>
                                    <p className="text-xs text-indigo-200 mt-1">จัดวางตำแหน่งและออกเอกสาร</p>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className={`flex items-start gap-4 ${step === 5 ? 'opacity-100' : 'opacity-50'}`}>
                                <div className={`w-10 h-10 flex items-center justify-center font-bold shrink-0 border transition-all ${step === 5 ? 'bg-indigo-600 text-white shadow-sm border-indigo-500' : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'}`}>
                                    5
                                </div>
                                <div className="mt-0.5">
                                    <h4 className="font-bold text-sm">ส่งออก & จัดส่ง</h4>
                                    <p className="text-xs text-indigo-200 mt-1">บันทึกหรือส่งให้นักเรียน</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-indigo-800 flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-950 border border-indigo-800 flex items-center justify-center font-bold text-lg">
                                {student.displayName?.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{student.displayName}</p>
                                <p className="text-[10px] text-indigo-300 uppercase tracking-wider mt-0.5">นร.ในความดูแล</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* Step 1 Content - Select Level */}
                        {step === 1 && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Award className="w-5 h-5 text-indigo-500" />
                                        เลือกระดับ (Level) ที่ต้องการออกเกรด
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-auto bg-white rounded-none border border-slate-200 shadow-sm p-6 space-y-8">
                                    <div>
                                        <Label className="text-base font-bold text-slate-800 mb-4 block">เลือกระดับ (Level)</Label>
                                        <div className="flex gap-4">
                                            {['Basic', 'Inter', 'Advance'].map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => {
                                                        setSelectedLevel(level);
                                                        setSelectedSessions([]);
                                                    }}
                                                    className={`px-8 py-4 border-2 font-bold text-lg transition-all ${selectedLevel === level ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-base font-bold text-slate-800 mb-4 block">เลือกระดับย่อย (Sub-Level)</Label>
                                        <div className="flex gap-3">
                                            {['1', '2', '3', '4', '5'].map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => {
                                                        setSelectedSubLevel(sub);
                                                        setSelectedSessions([]);
                                                    }}
                                                    className={`w-14 h-14 border-2 font-bold text-lg transition-all ${selectedSubLevel === sub ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end items-center bg-slate-50 p-5 border border-slate-200 shadow-sm">
                                    <Button 
                                        className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold h-12 px-8 rounded-none shadow-sm transition-all"
                                        onClick={() => setStep(2)}
                                    >
                                        ถัดไป <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 Content - Select Sessions */}
                        {step === 2 && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <CalendarCheck className="w-5 h-5 text-indigo-500" />
                                        ประวัติการเข้าเรียน (เลือกคาบที่ต้องการคิดคะแนนระดับ {selectedLevel} {selectedSubLevel})
                                    </h3>
                                    <Button variant="outline" size="sm" onClick={toggleAll}>
                                        {selectedSessions.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมดที่มีคะแนน'}
                                    </Button>
                                </div>
                                
                                <div className="flex-1 overflow-auto bg-white rounded-none border border-slate-200 shadow-sm p-5 space-y-3">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                                            กำลังโหลดประวัติ...
                                        </div>
                                    ) : attendanceHistory.filter(record => {
                                        const log = evaluationLogs.find(l => new Date(l.date).toDateString() === new Date(record.date).toDateString());
                                        if (!log) return true; // show ungraded so they get the error if they click
                                        return log.level === selectedLevel && String(log.subLevel) === String(selectedSubLevel); // only show matching level
                                    }).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <CalendarCheck className="h-12 w-12 mb-3 opacity-20" />
                                            ไม่พบคาบเรียนในระดับ {selectedLevel} {selectedSubLevel}
                                        </div>
                                    ) : (
                                        attendanceHistory.filter(record => {
                                            const log = evaluationLogs.find(l => new Date(l.date).toDateString() === new Date(record.date).toDateString());
                                            if (!log) return true;
                                            return log.level === selectedLevel && String(log.subLevel) === String(selectedSubLevel);
                                        }).map((record) => {
                                            const log = evaluationLogs.find(l => new Date(l.date).toDateString() === new Date(record.date).toDateString());
                                            const hasLog = !!log;
                                            
                                            return (
                                            <div 
                                                key={record._id} 
                                                className={`group relative flex items-center gap-5 p-4 border transition-all cursor-pointer ${selectedSessions.includes(record._id) ? 'bg-indigo-50/50 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                                onClick={() => toggleSession(record._id)}
                                            >
                                                <Checkbox 
                                                    checked={selectedSessions.includes(record._id)}
                                                    onCheckedChange={() => toggleSession(record._id)}
                                                    className="rounded-none border-slate-300"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 text-sm">
                                                        วันที่ {new Date(record.date).toLocaleDateString('th-TH')}
                                                    </p>
                                                    {!hasLog && (
                                                        <p className="text-xs text-red-500 font-medium mt-1">ไม่มีคะแนนในคาบนี้ กรุณาให้คะแนนก่อนเลือก</p>
                                                    )}
                                                    {hasLog && log.level && (
                                                        <p className="text-xs text-emerald-600 font-bold mt-1">ประเมินแล้ว: {log.level} {log.subLevel}</p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className={`rounded-none border font-bold px-3 py-1 text-xs ${
                                                    record.status === 'มาเรียน' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    record.status === 'เรียนออนไลน์' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-orange-50 text-orange-700 border-orange-200'
                                                }`}>
                                                    {record.status}
                                                </Badge>

                                                {hasLog && log.scores && (
                                                    <div className="absolute left-[300px] top-1/2 -translate-y-1/2 hidden group-hover:block w-64 bg-slate-800 text-white p-3 shadow-lg z-50 text-xs rounded-none border border-slate-700">
                                                        <div className="font-bold border-b border-slate-600 pb-1 mb-2 text-indigo-300 uppercase tracking-wide">รายละเอียดคะแนน</div>
                                                        {Object.entries(log.scores).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between py-0.5">
                                                                <span className="text-slate-300 capitalize">{k}</span>
                                                                <span className="font-bold">{String(v)}/5</span>
                                                            </div>
                                                        ))}
                                                        {log.note && (
                                                            <div className="mt-2 pt-2 border-t border-slate-600 text-slate-300 italic">
                                                                "{log.note}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )})
                                    )}
                                </div>
                                <div className="mt-6 flex justify-between items-center bg-slate-50 p-5 border border-slate-200 shadow-sm">
                                    <Button variant="outline" onClick={() => setStep(1)} className="text-slate-600 border border-slate-300 bg-white rounded-none h-12 px-8 font-bold hover:bg-slate-100">
                                        ย้อนกลับ
                                    </Button>
                                    <div className="flex gap-6 items-center">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">เลือกแล้ว</p>
                                            <p className="text-xl font-bold text-indigo-700">{selectedSessions.length} <span className="text-sm font-normal text-slate-400">คาบ</span></p>
                                        </div>
                                        <div className="w-px h-10 bg-slate-200" />
                                        <Button
                                            className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold h-12 px-8 rounded-none shadow-sm transition-all"
                                            onClick={() => setStep(3)}
                                            disabled={selectedSessions.filter(id => {
                                                const rec = attendanceHistory.find(r => r._id === id);
                                                if (!rec) return false;
                                                const log = evaluationLogs.find(l => new Date(l.date).toDateString() === new Date(rec.date).toDateString());
                                                return log && log.level === selectedLevel && String(log.subLevel) === String(selectedSubLevel);
                                            }).length === 0}
                                        >
                                            ยืนยันเพื่อถัดไป <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3 Content - Statistics Review with Chart */}
                        {step === 3 && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    ตรวจสอบสถิติและพัฒนาการ
                                </h3>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-5">
                                    {/* Stats Cards Row */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card className="p-5 border border-slate-200 bg-white rounded-none shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวนคาบ</p>
                                                    <p className="text-3xl font-bold text-indigo-700 mt-1">{selectedSessions.length}</p>
                                                </div>
                                                <CalendarCheck className="h-8 w-8 text-indigo-200" />
                                            </div>
                                        </Card>
                                        <Card className="p-5 border border-slate-200 bg-white rounded-none shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">รวมชั่วโมงเรียน</p>
                                                    <p className="text-3xl font-bold text-indigo-700 mt-1">{selectedSessions.length * 2}</p>
                                                </div>
                                                <Calculator className="h-8 w-8 text-indigo-200" />
                                            </div>
                                        </Card>
                                        <Card className="p-5 border border-emerald-200 bg-emerald-50 rounded-none shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">คะแนนเฉลี่ย</p>
                                                    <p className="text-3xl font-bold text-emerald-800 mt-1">
                                                        {((guidanceStats.avg / 5) * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                                <Award className="h-8 w-8 text-emerald-200" />
                                            </div>
                                            <p className="text-xs text-emerald-600 mt-2 font-medium">
                                                {guidanceStats.avg.toFixed(2)}/5 • ระดับ {selectedLevel} {selectedSubLevel}
                                            </p>
                                        </Card>
                                    </div>

                                    <EvolutionChart
                                        evaluationLogs={evaluationLogs}
                                        selectedSessions={selectedSessions}
                                        attendanceHistory={attendanceHistory}
                                        studentName={studentName}
                                        subjectName={subject?.name}
                                        level={selectedLevel}
                                        subLevel={selectedSubLevel}
                                    />
                                </div>

                                <div className="mt-6 flex justify-between items-center bg-slate-50 p-5 border border-slate-200 shadow-sm">
                                    <Button variant="outline" onClick={() => setStep(2)} className="text-slate-600 border border-slate-300 bg-white rounded-none h-12 px-8 font-bold hover:bg-slate-100">
                                        ย้อนกลับ
                                    </Button>
                                    <Button 
                                        className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold h-12 px-8 rounded-none shadow-sm transition-all flex items-center gap-2"
                                        onClick={() => setStep(4)}
                                    >
                                        <LayoutTemplate className="w-5 h-5" />
                                        ออกแบบและจัดวางใบประกาศ
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4 Content - Certificate Designer */}
                        {step === 4 && (
                            <div className="flex-1 flex overflow-hidden bg-slate-300">
                                {/* Left: Preview Area - takes remaining space */}
                                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                                    {/* Toolbar */}
                                    <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-3 shadow-sm shrink-0">
                                        <LayoutTemplate className="w-5 h-5 text-indigo-600 shrink-0" />
                                        <h3 className="font-bold text-slate-800 text-sm shrink-0">ตัวอย่างใบประกาศ (Preview)</h3>
                                        <div className="ml-auto flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                                            <button
                                                onClick={() => setPreviewScale(s => Math.max(0.2, parseFloat((s - 0.1).toFixed(2))))}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-400 font-bold text-sm leading-none shadow-sm transition-colors"
                                                title="ซูมออก"
                                            >−</button>
                                            <span className="text-xs font-bold text-slate-700 w-12 text-center tabular-nums">{Math.round(previewScale * 100)}%</span>
                                            <input
                                                type="range"
                                                min="0.2"
                                                max="0.75"
                                                step="0.05"
                                                value={previewScale}
                                                onChange={e => setPreviewScale(Number(e.target.value))}
                                                className="w-28 accent-indigo-600 cursor-pointer"
                                            />
                                            <button
                                                onClick={() => setPreviewScale(s => Math.min(0.75, parseFloat((s + 0.1).toFixed(2))))}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-400 font-bold text-sm leading-none shadow-sm transition-colors"
                                                title="ซูมเข้า"
                                            >+</button>
                                            <button
                                                onClick={() => setPreviewScale(0.55)}
                                                className="text-[10px] text-slate-400 hover:text-indigo-600 font-medium ml-1 px-2 py-1 rounded border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
                                            >รีเซ็ต</button>
                                        </div>
                                        {!isToolbarOpen && (
                                            <button
                                                onClick={() => setIsToolbarOpen(true)}
                                                className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow transition-colors"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                                เปิดเครื่องมือ
                                            </button>
                                        )}
                                    </div>
                                    {/* Scrollable Preview Canvas */}
                                    <div className="flex-1 overflow-auto">
                                        <div
                                            className="flex justify-center items-start p-8"
                                            style={{ minWidth: `calc(297mm * ${previewScale} + 64px)`, minHeight: `calc(210mm * ${previewScale} + 64px)` }}
                                        >
                                            <div style={{ width: `calc(297mm * ${previewScale})`, height: `calc(210mm * ${previewScale})`, position: 'relative', flexShrink: 0, transition: 'width 0.2s ease, height 0.2s ease' }}>
                                                <div style={{ transformOrigin: 'top left', transform: `scale(${previewScale})`, width: '297mm', height: '210mm', position: 'absolute', top: 0, left: 0, transition: 'transform 0.2s ease' }}>
                                                    {renderCertificate(false)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Controls panel - static flex, not absolute */}
                                {isToolbarOpen && (
                                    <div className="w-[400px] shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-2xl min-h-0">
                                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <Settings2 className="w-4 h-4 text-indigo-500" />
                                                    ปรับตำแหน่งและขนาดองค์ประกอบ
                                                </h3>
                                                <p className="text-[11px] text-slate-400 mt-0.5">ปรับแกน X, Y และขนาด ของแต่ละส่วน</p>
                                            </div>
                                            <button
                                                onClick={() => setIsToolbarOpen(false)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                                title="ปิดแผง"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                                            <Button
                                                variant="outline"
                                                className="w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm font-bold"
                                                onClick={() => setCertLayout(p => ({
                                                    ...p,
                                                    titleX: 0, titleY: 0, titleScale: 1,
                                                    nameX: 0, nameY: 0, nameScale: 1,
                                                    courseX: 0, courseY: 0, courseScale: 1,
                                                    signatureX: 0, signatureY: 0, signatureScale: 1,
                                                    codeX: 0, codeY: 0, codeScale: 1
                                                }))}
                                            >
                                                <LayoutTemplate className="w-4 h-4" />
                                                จัดหน้ากึ่งกลางอัตโนมัติ (Auto Align)
                                            </Button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {/* Theme Selector */}
                                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider block mb-2">รูปแบบสีของกรอบใบประกาศ</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(CERT_THEMES).map(([key, theme]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setCertTheme(key)}
                                                            className={`px-3 py-2 rounded text-xs font-bold transition-all border-2 flex items-center gap-2 ${certTheme === key ? 'border-indigo-600 bg-indigo-50 shadow-sm scale-105' : 'border-transparent bg-white hover:bg-slate-100 shadow-sm'}`}
                                                        >
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: theme.color }} />
                                                            {theme.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {[
                                                { key: 'title', label: 'หัวข้อ (Title)' },
                                                { key: 'name', label: 'ชื่อนักเรียน' },
                                                { key: 'course', label: 'ชื่อคอร์ส + สถิติ' },
                                                { key: 'signature', label: 'ลายเซ็นต์' },
                                                { key: 'code', label: 'รหัส/ข้อความ มุมขวาล่าง' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">{label}</Label>
                                                        <button onClick={() => setCertLayout(p => ({ ...p, [`${key}X`]: 0, [`${key}Y`]: 0, [`${key}Scale`]: 1 }))} className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors bg-white px-2 py-1 border rounded shadow-sm">รีเซ็ต</button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div>
                                                            <Label className="text-[10px] text-slate-500 mb-1 block">แกน X: {(certLayout as any)[`${key}X`]}px</Label>
                                                            <input type="range" min="-800" max="800" step="1" value={(certLayout as any)[`${key}X`]} onChange={(e) => setCertLayout(p => ({ ...p, [`${key}X`]: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-slate-500 mb-1 block">แกน Y: {(certLayout as any)[`${key}Y`]}px</Label>
                                                            <input type="range" min="-800" max="800" step="1" value={(certLayout as any)[`${key}Y`]} onChange={(e) => setCertLayout(p => ({ ...p, [`${key}Y`]: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-slate-500 mb-1 block">ขนาด: {((certLayout as any)[`${key}Scale`] * 100).toFixed(0)}%</Label>
                                                            <input type="range" min="0.2" max="3" step="0.05" value={(certLayout as any)[`${key}Scale`]} onChange={(e) => setCertLayout(p => ({ ...p, [`${key}Scale`]: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Logos Manager */}
                                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-4">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-2">ระบบจัดการโลโก้ (Logos)</Label>
                                                
                                                {/* School Logo */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={showSchoolLogo} onChange={(e) => setShowSchoolLogo(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                                                            แสดงโลโก้โรงเรียน (ถาวร)
                                                        </Label>
                                                        {showSchoolLogo && <button onClick={() => setCertLayout(p => ({ ...p, schoolLogoX: 0, schoolLogoY: 0, schoolLogoScale: 1 }))} className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors bg-white px-2 py-1 border rounded shadow-sm">รีเซ็ต</button>}
                                                    </div>
                                                    {showSchoolLogo && (
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <Label className="text-[10px] text-slate-500 mb-1 block">แกน X: {certLayout.schoolLogoX}px</Label>
                                                                <input type="range" min="-800" max="800" step="1" value={certLayout.schoolLogoX} onChange={(e) => setCertLayout(p => ({ ...p, schoolLogoX: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] text-slate-500 mb-1 block">แกน Y: {certLayout.schoolLogoY}px</Label>
                                                                <input type="range" min="-800" max="800" step="1" value={certLayout.schoolLogoY} onChange={(e) => setCertLayout(p => ({ ...p, schoolLogoY: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] text-slate-500 mb-1 block">ขนาด: {(certLayout.schoolLogoScale * 100).toFixed(0)}%</Label>
                                                                <input type="range" min="0.2" max="3" step="0.05" value={certLayout.schoolLogoScale} onChange={(e) => setCertLayout(p => ({ ...p, schoolLogoScale: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Subject Logo Upload */}
                                                <div className="space-y-3 pt-3 border-t border-slate-200">
                                                    <div>
                                                        <Label className="text-xs font-bold text-slate-700 block mb-2">โลโก้รายวิชา (อัปโหลดชั่วคราว)</Label>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setSubjectLogoUrl(URL.createObjectURL(e.target.files[0]));
                                                                    setShowSubjectLogo(true);
                                                                }
                                                            }}
                                                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                        />
                                                        <p className="text-[10px] text-slate-400 mt-1">ไฟล์โลโก้นี้จะไม่ถูกบันทึกลงฐานข้อมูล เพื่อประหยัดพื้นที่</p>
                                                    </div>
                                                    
                                                    {subjectLogoUrl && (
                                                        <>
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                                                                    <input type="checkbox" checked={showSubjectLogo} onChange={(e) => setShowSubjectLogo(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                                                                    แสดงโลโก้รายวิชา
                                                                </Label>
                                                                {showSubjectLogo && <button onClick={() => setCertLayout(p => ({ ...p, subjectLogoX: 0, subjectLogoY: 0, subjectLogoScale: 1 }))} className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors bg-white px-2 py-1 border rounded shadow-sm">รีเซ็ต</button>}
                                                            </div>
                                                            {showSubjectLogo && (
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div>
                                                                        <Label className="text-[10px] text-slate-500 mb-1 block">แกน X: {certLayout.subjectLogoX}px</Label>
                                                                        <input type="range" min="-800" max="800" step="1" value={certLayout.subjectLogoX} onChange={(e) => setCertLayout(p => ({ ...p, subjectLogoX: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-[10px] text-slate-500 mb-1 block">แกน Y: {certLayout.subjectLogoY}px</Label>
                                                                        <input type="range" min="-800" max="800" step="1" value={certLayout.subjectLogoY} onChange={(e) => setCertLayout(p => ({ ...p, subjectLogoY: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-[10px] text-slate-500 mb-1 block">ขนาด: {(certLayout.subjectLogoScale * 100).toFixed(0)}%</Label>
                                                                        <input type="range" min="0.2" max="3" step="0.05" value={certLayout.subjectLogoScale} onChange={(e) => setCertLayout(p => ({ ...p, subjectLogoScale: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Certificate Code Text Edit */}
                                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-2">ข้อความ / รหัสใบประกาศ</Label>
                                                <div>
                                                    <Label className="text-[10px] text-slate-500 mb-1 block">ข้อความที่แสดง (มุมขวาล่าง)</Label>
                                                    <input 
                                                        type="text" 
                                                        value={certCodeText} 
                                                        onChange={(e) => setCertCodeText(e.target.value)} 
                                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        placeholder="ระบุข้อความหรือรหัส..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t border-slate-200 space-y-3 bg-white shrink-0">
                                            <Button variant="outline" onClick={() => setStep(3)} className="w-full h-11 rounded-none font-bold text-slate-600 border-slate-300">ย้อนกลับ</Button>
                                            <Button
                                                className="w-full h-11 bg-indigo-700 hover:bg-indigo-800 text-white rounded-none font-bold shadow-sm"
                                                onClick={() => setStep(5)}
                                            >
                                                ตรวจสอบและดำเนินการต่อ <ChevronRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 5 Content - Export & Delivery */}
                        {step === 5 && (
                            <div className="flex-1 flex overflow-hidden bg-slate-300">
                                {/* Left: Static Preview Area */}
                                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                                    <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-3 shadow-sm shrink-0">
                                        <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                                        <h3 className="font-bold text-slate-800 text-sm shrink-0">พรีวิวใบประกาศ (เสร็จสิ้น)</h3>
                                    </div>
                                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
                                        <div 
                                            style={{ 
                                                transform: `scale(${previewScale})`, 
                                                transformOrigin: 'center center',
                                                transition: 'transform 0.2s',
                                                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                                            }}
                                            className="bg-white shrink-0"
                                        >
                                            {renderCertificate(false)}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Action Panel */}
                                <div className="w-[400px] shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-2xl min-h-0">
                                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col gap-1 shrink-0">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Send className="w-5 h-5 text-indigo-500" />
                                            การส่งออกและจัดส่ง
                                        </h3>
                                        <p className="text-xs text-slate-500">เลือกวิธีการบันทึกหรือส่งใบประกาศให้นักเรียน</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {/* Student Info Summary */}
                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block border-b pb-2">ข้อมูลผู้รับ</Label>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-600">ชื่อนักเรียน:</span>
                                                    <span className="text-sm font-bold text-slate-800">{student?.displayName}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-600">รายวิชา:</span>
                                                    <span className="text-sm font-bold text-slate-800">{subject?.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-600">อีเมลระบบ:</span>
                                                    <span className={`text-sm font-bold ${student?.email ? 'text-slate-800' : 'text-red-500'}`}>
                                                        {student?.email || 'ไม่มีข้อมูลอีเมล'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ตัวเลือกการดาวน์โหลด</Label>
                                            <Button
                                                onClick={handleDownloadPDF}
                                                disabled={generatingPDF}
                                                variant="outline"
                                                className="w-full h-12 flex items-center justify-start gap-3 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                            >
                                                {generatingPDF ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <FileText className="w-5 h-5 text-indigo-500" />}
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">ดาวน์โหลด PDF</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">คุณภาพสูง สำหรับการพิมพ์</div>
                                                </div>
                                            </Button>

                                            <Button
                                                onClick={handleDownloadPNG}
                                                disabled={generatingPDF}
                                                variant="outline"
                                                className="w-full h-12 flex items-center justify-start gap-3 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                            >
                                                {generatingPDF ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : <ImageIcon className="w-5 h-5 text-emerald-500" />}
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">ดาวน์โหลดรูปภาพ (PNG)</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">แชร์ลงโซเชียลมีเดียได้ทันที</div>
                                                </div>
                                            </Button>
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-slate-200">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ส่งตรงให้นักเรียน</Label>
                                            <Button
                                                onClick={handleSendToStudentWebsite}
                                                disabled={generatingPDF}
                                                className="w-full h-14 flex items-center justify-start gap-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                                            >
                                                {generatingPDF ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">ส่งให้กับนักเรียนในเว็บไซต์</div>
                                                    <div className="text-[10px] text-emerald-200 font-normal">
                                                        บันทึกใบประกาศในระบบ ให้นักเรียนดูได้ที่หน้าแดชบอร์ด
                                                    </div>
                                                </div>
                                            </Button>
                                            <Button
                                                onClick={handleSendEmail}
                                                disabled={generatingPDF || !student?.email}
                                                className="w-full h-14 flex items-center justify-start gap-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                                            >
                                                {generatingPDF ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mail className="w-6 h-6" />}
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">ส่งอีเมลใบประกาศ</div>
                                                    <div className="text-[10px] text-indigo-200 font-normal">
                                                        {student?.email ? `ส่งไปยัง ${student.email}` : 'ไม่สามารถส่งได้ (ไม่มีอีเมล)'}
                                                    </div>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-slate-200 space-y-3 bg-white shrink-0">
                                        <Button variant="outline" onClick={() => setStep(4)} disabled={generatingPDF} className="w-full h-11 rounded-none font-bold text-slate-600 border-slate-300">
                                            ย้อนกลับไปแก้ไข
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={onClose}
                                            disabled={generatingPDF}
                                            className="w-full h-11 rounded-none font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        >
                                            ปิดหน้าต่างนี้
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- HIDDEN CERTIFICATE FOR PDF GENERATION --- */}
                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
                    {renderCertificate(true)}
                </div>
            </DialogContent>
        </Dialog>
    );
}
