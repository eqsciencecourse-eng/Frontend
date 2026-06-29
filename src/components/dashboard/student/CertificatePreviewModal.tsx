import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Download, Loader2, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';

interface CertificatePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    grade: any;
    studentName: string;
}

export default function CertificatePreviewModal({ isOpen, onClose, grade, studentName }: CertificatePreviewModalProps) {
    const [generating, setGenerating] = useState(false);

    const certificateImageUrl = grade?.certificateURL
        ? `${API_ENDPOINTS.GRADES.BASE}/certificate-image/${grade.certificateURL}`
        : null;

    const handleDownload = async () => {
        if (!certificateImageUrl) return;
        setGenerating(true);
        try {
            const resp = await fetch(certificateImageUrl);
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificate_${studentName}_${grade?.subjectName}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download Error:", error);
        } finally {
            setGenerating(false);
        }
    };

    if (!grade) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-900 border-none shadow-2xl">
                <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
                <div className="relative p-6 flex flex-col items-center">
                    <div className="absolute right-4 top-4 z-50">
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Award className="w-6 h-6 text-yellow-400" />
                        ใบประกาศ - {grade.subjectName}
                    </h2>

                    {/* Level Badge */}
                    {grade.level && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs text-slate-400 uppercase tracking-wider">ระดับ:</span>
                            <span className="bg-indigo-600/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/40">
                                {grade.level} {grade.subLevel || ''}
                            </span>
                            <span className="text-xs text-slate-500 mx-1">|</span>
                            <span className="bg-emerald-600/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/40">
                                Grade: {grade.finalGrade}
                            </span>
                        </div>
                    )}

                    {/* Certificate Image / No Certificate Message */}
                    <div className="w-full overflow-auto flex justify-center p-4 bg-slate-800 rounded-2xl shadow-inner mb-6 min-h-[300px] items-center">
                        {certificateImageUrl ? (
                            <img
                                src={certificateImageUrl}
                                alt={`Certificate for ${grade?.subjectName}`}
                                className="rounded-lg shadow-lg"
                                style={{
                                    maxWidth: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                    maxHeight: '65vh',
                                    objectFit: 'contain',
                                    aspectRatio: '297 / 210'
                                }}
                            />
                        ) : (
                            <div className="text-center text-slate-500">
                                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-40" />
                                <p className="text-lg font-bold">ยังไม่ได้ออกใบประกาศ</p>
                                <p className="text-sm text-slate-600 mt-1">รอคุณครูออกใบประกาศให้กับนักเรียน</p>
                            </div>
                        )}
                    </div>

                    {certificateImageUrl && (
                        <Button
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-12 py-6 text-lg font-bold shadow-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 mb-4"
                            onClick={handleDownload}
                            disabled={generating}
                        >
                            {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                            {generating ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลดรูปภาพ (JPG)'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
