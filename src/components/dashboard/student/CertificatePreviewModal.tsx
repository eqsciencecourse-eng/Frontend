import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Download, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface CertificatePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    grade: any;
    studentName: string;
}

export default function CertificatePreviewModal({ isOpen, onClose, grade, studentName }: CertificatePreviewModalProps) {
    const [generating, setGenerating] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!certificateRef.current) return;
        setGenerating(true);
        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Certificate_${studentName}_${grade?.subjectName}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
        } finally {
            setGenerating(false);
        }
    };

    if (!grade) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-900 border-none shadow-2xl">
                <div className="relative p-6 flex flex-col items-center">
                    <div className="absolute right-4 top-4 z-50">
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Award className="w-6 h-6 text-yellow-400" />
                        Certificate Preview
                    </h2>

                    {/* Preview Scrollable Area */}
                    <div className="w-full overflow-auto flex justify-center p-4 bg-slate-800 rounded-2xl shadow-inner mb-6">
                         <div 
                            ref={certificateRef}
                            style={{
                                width: '297mm',
                                height: '210mm',
                                backgroundColor: '#ffffff',
                                position: 'relative',
                                padding: '20mm',
                                boxSizing: 'border-box',
                                fontFamily: '"Kanit", "Inter", sans-serif',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#1e293b',
                                transform: 'scale(0.6)',
                                transformOrigin: 'top center'
                            }}
                            className="certificate-render-target"
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

                            {/* Top Watermark/Logo styling */}
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
                                    {studentName}
                                </h2>
                            </div>

                            {/* Description */}
                            <div style={{ zIndex: 10, width: '70%', textAlign: 'center', marginBottom: '30px' }}>
                                <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#475569' }}>
                                    for successfully completing and demonstrating exceptional skills in the course of  
                                    <strong style={{ color: '#4338ca', fontWeight: 'bold', marginLeft: '6px' }}>{grade?.subjectName}</strong>. 
                                    We commend your dedication, creativity, and commitment to learning.
                                </p>
                            </div>

                            {/* Grade Ribbon */}
                            <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                                <span style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Performance Grade</span>
                                <div style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '10px 30px', borderRadius: '50px', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                    {grade?.finalGrade || '-'}
                                </div>
                            </div>

                            {/* Signatures */}
                            <div style={{ zIndex: 10, display: 'flex', justifyContent: 'space-between', width: '80%', marginTop: 'auto', marginBottom: '20px' }}>
                                {/* Date */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderBottom: '1px solid #1e293b', width: '200px', paddingBottom: '5px', marginBottom: '5px', fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
                                        {grade?.certificateIssuedAt ? format(new Date(grade.certificateIssuedAt), 'd MMMM yyyy', { locale: th }) : format(new Date(), 'd MMMM yyyy', { locale: th })}
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

                    <Button 
                        size="lg"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-12 py-6 text-lg font-bold shadow-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 mb-4"
                        onClick={handleDownload}
                        disabled={generating}
                    >
                        {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                        {generating ? 'กำลังสร้างไฟล์ PDF...' : 'Download Certificate (PDF)'}
                    </Button>
                    <p className="text-slate-400 text-xs">ไฟล์จะถูกดาวน์โหลดในสัดส่วน A4 แนวนอนที่ความละเอียดสูงพิเศษ</p>
                </div>
            </DialogContent>
            
            {/* CSS override for scaling in preview */}
            <style jsx>{`
                .certificate-render-target {
                    height: calc(210mm * 0.6) !important;
                    width: calc(297mm * 0.6) !important;
                }
                @media (max-width: 768px) {
                    .certificate-render-target {
                        transform: scale(0.3) !important;
                        height: calc(210mm * 0.3) !important;
                        width: calc(297mm * 0.3) !important;
                    }
                }
            `}</style>
        </Dialog>
    );
}
