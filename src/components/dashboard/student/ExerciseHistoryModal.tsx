import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Calendar, ExternalLink, Download, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ExerciseHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    scores: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export default function ExerciseHistoryModal({ isOpen, onClose, scores }: ExerciseHistoryModalProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        // Ensure path starts with / if not present
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_URL}${cleanPath}`;
    };

    const handleDownload = async (imageUrl: string, fileName: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || 'exercise-image.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>ประวัติคะแนนแบบฝึกหัด (Exercise Scores)</DialogTitle>
                    <DialogDescription>
                        รายการคะแนนแบบฝึกหัดทั้งหมดของคุณ
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4 mt-4">
                    {scores && scores.length > 0 ? (
                        <div className="space-y-6">

                            <div className="space-y-4">
                                {scores.slice().reverse().map((item: any, i: number) => {
                                    const imageUrl = item.image ? getImageUrl(item.image) : null;

                                    return (
                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-md transition-all gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                                    <Award className="h-6 w-6 text-orange-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">{item.title || 'แบบฝึกหัด'}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 mt-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {item.date ? new Date(item.date).toLocaleDateString('th-TH', {
                                                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        }) : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-16 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                        {item.score} <span className="text-xs text-slate-400 font-normal">/ {item.maxScore}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Score</div>
                                                </div>

                                                {imageUrl && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2 text-xs gap-1.5"
                                                            onClick={() => {
                                                                setImageError(false);
                                                                setPreviewImage(imageUrl);
                                                            }}
                                                        >
                                                            <ImageIcon className="h-3.5 w-3.5" />
                                                            ดูรูป
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                            onClick={() => handleDownload(imageUrl, `exercise-${item.title}.jpg`)}
                                                            title="ดาวน์โหลดรูปภาพ"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Award className="h-16 w-16 mb-4 opacity-10" />
                            <p className="text-lg font-medium text-slate-500">ยังไม่มีคะแนนแบบฝึกหัด</p>
                            <p className="text-sm">เมื่อคุณทำแบบฝึกหัดเสร็จ คะแนนจะปรากฏที่นี่</p>
                        </div>
                    )}
                </ScrollArea>

                <div className="mt-4 flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="secondary" onClick={onClose} className="px-8">ปิด</Button>
                </div>
            </DialogContent>

            <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-slate-950 border-slate-800 flex flex-col">
                    <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between">
                        <DialogTitle className="text-white">ตัวอย่างรูปภาพ (Image Preview)</DialogTitle>
                        <DialogDescription className="sr-only">
                            ดูรูปภาพขนาดใหญ่
                        </DialogDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-4 min-h-[300px] relative">
                        {previewImage && !imageError ? (
                            <img
                                src={previewImage}
                                alt="Lesson"
                                className="max-w-full max-h-[75vh] object-contain rounded shadow-2xl"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="text-center p-8 text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
                                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="mb-4">ไม่สามารถแสดงตัวอย่างรูปภาพได้</p>
                                <Button
                                    onClick={() => previewImage && window.open(previewImage, '_blank')}
                                    variant="outline"
                                    className="bg-transparent border-slate-600 text-slate-300 hover:bg-white/5"
                                >
                                    ลองเปิดในหน้าต่างใหม่
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700"
                            onClick={() => previewImage && handleDownload(previewImage, 'exercise-image.jpg')}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            ดาวน์โหลด
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => previewImage && window.open(previewImage, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            เปิดในแท็บใหม่
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
