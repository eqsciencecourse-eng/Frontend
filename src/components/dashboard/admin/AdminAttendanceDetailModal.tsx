
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface AdminAttendanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any;
}

export default function AdminAttendanceDetailModal({ isOpen, onClose, record }: AdminAttendanceDetailModalProps) {
    if (!record) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Present': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-none">มาเรียน</Badge>;
            case 'Late': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 rounded-none">มาสาย</Badge>;
            case 'Leave': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-none">ลา</Badge>;
            case 'Absent': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 rounded-none">ขาดเรียน</Badge>;
            default: return <Badge variant="outline" className="rounded-none">{status}</Badge>;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-none border-slate-200">
                <div className="p-6 border-b flex justify-between items-start bg-white">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 mb-1">
                            รายละเอียดการเข้าเรียน
                        </DialogTitle>
                        <div className="text-sm text-slate-500 space-y-1">
                            <p><span className="font-semibold text-slate-700">วิชา:</span> {record.subjectName}</p>
                            <p><span className="font-semibold text-slate-700">วันที่:</span> {format(new Date(record.date), 'd MMMM yyyy', { locale: th })}</p>
                            <p><span className="font-semibold text-slate-700">ครูผู้สอน:</span> {record.teacherName || record.teacherId}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 print:hidden rounded-none">
                        <Printer className="w-4 h-4" />
                        พิมพ์
                    </Button>
                </div>

                <div className="flex-1 overflow-auto p-0 bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[50px] text-center">#</TableHead>
                                <TableHead>ชื่อ-นามสกุล</TableHead>
                                <TableHead className="text-center">เวลาที่มา</TableHead>
                                <TableHead className="text-center">สถานะ</TableHead>
                                <TableHead>หมายเหตุ / สาเหตุการลา</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {record.students && record.students.map((student: any, idx: number) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50">
                                    <TableCell className="text-center text-slate-500 text-xs">{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-700">{student.firstName} {student.lastName}</div>
                                        {student.nickname && <div className="text-xs text-slate-400">({student.nickname})</div>}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm text-slate-600">
                                        {student.time || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(student.status)}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {student.comment || '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 border-t bg-slate-50 text-right text-xs text-slate-400 print:hidden">
                    Report Generated at {new Date().toLocaleString('th-TH')}
                </div>
            </DialogContent>
        </Dialog>
    );
}
