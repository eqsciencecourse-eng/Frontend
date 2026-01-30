import { useState } from 'react';
import { Send, History, CheckCircle, AlertCircle, FileText, Image as ImageIcon, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

import StudentSelector from './StudentSelector';
import FileUploader from './FileUploader';
import TransferHistoryModal from './TransferHistoryModal';
import { API_ENDPOINTS } from '@/lib/api-config';

interface User {
    _id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: string;
    parentName?: string;
    studentClass?: string;
    username?: string;
    isRegistry?: boolean;
}

interface SendFileTabProps {
    users: User[];
    currentUser: any;
    onUpdateUser?: () => void;
    onDeleteUser?: (id: string, name: string) => void;
}

export default function SendFileTab({ users = [], currentUser, onDeleteUser }: SendFileTabProps) {
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Filter students: Must have username AND NOT be a legacy registry import
    const students = users.filter(u => u.role === 'student' && u.username && !u.isRegistry);

    const handleSendFiles = async () => {
        if (selectedStudentIds.length === 0) {
            toast.error('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
            return;
        }
        if (filesToUpload.length === 0) {
            toast.error('กรุณาเลือกไฟล์เกียรติบัตรอย่างน้อย 1 ไฟล์');
            return;
        }

        setIsUploading(true);
        try {
            const token = await currentUser.getIdToken();
            const formData = new FormData();

            filesToUpload.forEach((file) => {
                formData.append('files', file);
            });

            formData.append('recipientIds', JSON.stringify(selectedStudentIds));
            formData.append('uploaderId', currentUser.uid);

            const res = await fetch(API_ENDPOINTS.FILES.BULK_SEND, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                toast.success(`ส่งเกียรติบัตรสำเร็จไปยังนักเรียน ${selectedStudentIds.length} คน`);
                setUploadSuccess(true);
                // Reset after delay
                setTimeout(() => {
                    setUploadSuccess(false);
                    setFilesToUpload([]);
                    setSelectedStudentIds([]);
                }, 3000);
            } else {
                const err = await res.json();
                toast.error(`ส่งไฟล์ล้มเหลว: ${err.message}`);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('เกิดข้อผิดพลาดในการส่งไฟล์');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-none border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-none">
                            <Award className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold font-itim tracking-wide text-slate-800">ระบบส่งเกียรติบัตร</h2>
                    </div>
                    <p className="text-slate-500 text-lg max-w-xl">
                        ส่งมอบความสำเร็จให้นักเรียนด้วยระบบส่งเกียรติบัตรออนไลน์ รองรับไฟล์ PDF และรูปภาพคุณภาพสูง
                    </p>
                </div>
                <div className="relative z-10 flex gap-3">
                    <Button
                        onClick={() => setIsHistoryOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-12 px-6 rounded-none transition-all shadow-sm"
                    >
                        <History className="h-5 w-5 mr-2" />
                        ประวัติการส่ง
                    </Button>
                </div>
            </div>

            <TransferHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                currentUser={currentUser}
                users={users}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                {/* Left Column: Student Selector */}
                <Card className="lg:col-span-5 flex flex-col overflow-hidden border border-slate-200 shadow-sm rounded-none bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 pt-6 px-6">
                        <CardTitle className="text-xl flex justify-between items-center text-slate-800">
                            <span>เลือกผู้รับเกียรติบัตร</span>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 text-sm rounded-none">
                                {selectedStudentIds.length} คน
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            ค้นหาและเลือกนักเรียนที่ต้องการมอบเกียรติบัตร
                        </CardDescription>
                    </CardHeader>
                    <div className="flex-1 overflow-hidden p-0 bg-white">
                        <StudentSelector
                            students={students}
                            selectedIds={selectedStudentIds}
                            onSelectionChange={setSelectedStudentIds}
                            onDeleteUser={onDeleteUser}
                        />
                    </div>
                </Card>

                {/* Right Column: File Uploader & Actions */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <Card className="flex-1 border border-slate-200 shadow-sm rounded-none overflow-hidden bg-white flex flex-col">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 pt-6 px-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-none text-blue-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl text-slate-800">อัปโหลดไฟล์เกียรติบัตร</CardTitle>
                                    <CardDescription className="mt-1">
                                        รองรับไฟล์ <span className="font-semibold text-slate-700">PDF, PNG, JPEG</span> (สูงสุด 10MB/ไฟล์)
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-6 bg-white">
                            {uploadSuccess ? (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-none border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-500">
                                    <div className="h-24 w-24 bg-emerald-50 rounded-none flex items-center justify-center mb-6">
                                        <CheckCircle className="h-12 w-12 text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">ส่งเกียรติบัตรเรียบร้อยแล้ว!</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto">
                                        ระบบได้ทำการส่งไฟล์ไปยังนักเรียนที่เลือกจำนวน {selectedStudentIds.length} คน เรียบร้อยแล้ว
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-8 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-none"
                                        onClick={() => setUploadSuccess(false)}
                                    >
                                        ส่งเพิ่มอีกครั้ง
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-none border border-slate-200 border-dashed h-full">
                                    <FileUploader
                                        files={filesToUpload}
                                        onFilesSelected={setFilesToUpload}
                                        maxFiles={10}

                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary & Action Card */}
                    <Card className="border border-slate-200 shadow-sm rounded-none bg-white overflow-hidden">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                                <div className="space-y-2">
                                    <h4 className="text-lg font-semibold text-slate-800">สรุปรายการที่จะส่ง</h4>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            <span>{filesToUpload.length} ไฟล์</span>
                                        </div>
                                        <div className="w-1 h-1 bg-slate-300 rounded-none"></div>
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" />
                                            <span>{(filesToUpload.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-slate-900">{selectedStudentIds.length}</div>
                                    <div className="text-sm text-slate-500">ผู้รับ (คน)</div>
                                </div>
                            </div>

                            {selectedStudentIds.length > 1 && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-none flex items-start gap-3 text-blue-700">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold">คำเตือน: คุณกำลังจะส่งไฟล์แบบกลุ่ม (Bulk Send)</p>
                                        <p>ระบบจะส่งไฟล์ <strong>ชุดเดียวกัน</strong> ให้กับนักเรียนทุกคนที่เลือก ({selectedStudentIds.length} คน) </p>
                                        <p className="underline mt-1">เหมาะสำหรับ: ประกาศ, ตารางเรียน, หรือเอกสารทั่วไป</p>
                                    </div>
                                </div>
                            )}

                            {selectedStudentIds.length === 0 && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-none flex items-center gap-3 text-red-600">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">กรุณาเลือกนักเรียนจากรายการด้านซ้ายก่อนดำเนินการ</span>
                                </div>
                            )}

                            <Button
                                className={`w-full h-14 text-lg font-semibold rounded-none shadow-sm transition-all transform hover:scale-[1.01] active:scale-[0.99]
                                    ${selectedStudentIds.length === 0 || filesToUpload.length === 0 || isUploading
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                    }
                                `}
                                disabled={selectedStudentIds.length === 0 || filesToUpload.length === 0 || isUploading}
                                onClick={handleSendFiles}
                            >
                                {isUploading ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-3"></span>
                                        กำลังส่งข้อมูล...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-3 h-5 w-5" />
                                        ยืนยันการส่งเกียรติบัตร ({selectedStudentIds.length} คน)
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
