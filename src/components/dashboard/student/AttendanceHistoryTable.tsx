
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

interface AttendanceRecord {
    _id: string;
    subjectName: string;
    date: string;
    students: {
        studentId: string;
        status: string; // 'Present', 'Late', 'Leave', 'Absent'
        studentName?: string;
        studentNickname?: string;
        time?: string;
        comment?: string;
    }[];
}

interface Props {
    history: AttendanceRecord[];
    studentId: string;
    studentName: string;
}

export default function AttendanceHistoryTable({ history, studentId, studentName }: Props) {
    // Process history to find specific student status for each record
    const processedHistory = history.map(record => {
        const studentInfo = record.students.find(s => s.studentId === studentId);
        const displayName = studentInfo?.studentName || studentName;
        return {
            ...record,
            status: studentInfo?.status || 'Unknown',
            displayName: displayName,
            comment: studentInfo?.comment || '',
        };
    }).filter(r => r.status !== 'Unknown');

    const getStatusBadge = (status: string, comment: string) => {
        switch (status) {
            case 'Present':
                return (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> มาเรียน
                    </Badge>
                );
            case 'Late':
                return (
                    <div className="flex flex-col items-start gap-1">
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> มาสาย
                        </Badge>
                        {comment && <span className="text-xs text-red-500 font-medium">เหตุผล: {comment}</span>}
                    </div>
                );
            case 'Leave':
                return (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" /> ลา
                    </Badge>
                );
            case 'Absent':
                return (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> ขาดเรียน
                    </Badge>
                );
            default:
                return <span className="text-slate-400">-</span>;
        }
    };

    return (
        <div className="rounded-sm border border-slate-200 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[180px] font-bold text-slate-700">วัน/เดือน/ปี</TableHead>
                        <TableHead className="font-bold text-slate-700">รายวิชา</TableHead>
                        <TableHead className="font-bold text-slate-700">สถานะ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {processedHistory.length > 0 ? (
                        processedHistory.map((record) => (
                            <TableRow key={record._id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-700">
                                    {new Date(record.date).toLocaleDateString('th-TH', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </TableCell>
                                <TableCell className="text-slate-600">{record.subjectName}</TableCell>

                                <TableCell>{getStatusBadge(record.status, record.comment)}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                ยังไม่มีประวัติการเช็กชื่อ
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
