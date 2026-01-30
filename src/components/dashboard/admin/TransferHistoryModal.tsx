import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, FileText, User, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { API_ENDPOINTS } from '@/lib/api-config';

interface TransferHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    users: any[]; // To map recipient IDs to names
}

export default function TransferHistoryModal({ isOpen, onClose, currentUser, users }: TransferHistoryModalProps) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchHistory = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(API_ENDPOINTS.FILES.SENT(currentUser.uid), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFiles(data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("ไม่สามารถดึงประวัติการส่งได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, currentUser]);

    const handleDelete = async (fileId: string) => {
        if (!confirm("คุณต้องการลบไฟล์นี้จากรายการของผู้เรียนใช่หรือไม่? (ผู้เรียนจะไม่เห็นไฟล์นี้อีก)")) return;

        setDeletingId(fileId);
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(API_ENDPOINTS.FILES.BY_ID(fileId), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("ลบไฟล์เรียบร้อยแล้ว");
                setFiles(files.filter(f => f._id !== fileId));
            } else {
                toast.error("ลบไฟล์ไม่สำเร็จ");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("เกิดข้อผิดพลาดในการลบไฟล์");
        } finally {
            setDeletingId(null);
        }
    };

    const getRecipientName = (id: string) => {
        const user = users.find(u => u._id === id || u.uid === id);
        return user?.displayName || 'Unknown User';
    };

    const filteredFiles = files.filter(file => {
        const searchLower = (searchTerm || '').toLowerCase();
        const filename = (file.originalName || '').toLowerCase();
        const recipient = (getRecipientName(file.recipientId) || '').toLowerCase();
        return filename.includes(searchLower) || recipient.includes(searchLower);
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        ประวัติการส่งไฟล์
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-none">
                            {files.length} รายการ
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        รายการไฟล์ทั้งหมดที่คุณส่งให้นักเรียน สามารถค้นหาและลบรายการที่ส่งผิดได้
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="ค้นหาชื่อไฟล์ หรือ ชื่อนักเรียน..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={fetchHistory} size="icon">
                        <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-none">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow>
                                <TableHead className="w-[180px]">วันที่ส่ง</TableHead>
                                <TableHead>ชื่อไฟล์</TableHead>
                                <TableHead>ผู้รับ</TableHead>
                                <TableHead className="w-[100px] text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                        กำลังโหลดข้อมูล...
                                    </TableCell>
                                </TableRow>
                            ) : filteredFiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                        ไม่พบประวัติการส่งไฟล์
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredFiles.map((file) => (
                                    <TableRow key={file._id} className="group hover:bg-slate-50">
                                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {format(new Date(file.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                <span className="truncate max-w-[200px]" title={file.originalName}>
                                                    {file.originalName}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-none bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                                                    <User className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm text-slate-600">{getRecipientName(file.recipientId)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                                onClick={() => handleDelete(file._id)}
                                                disabled={deletingId === file._id}
                                            >
                                                {deletingId === file._id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
