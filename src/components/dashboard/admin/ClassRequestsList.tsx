import { useState, useEffect } from 'react';
import { Check, X, Clock, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { API_ENDPOINTS } from '@/lib/api-config';

interface ClassRequest {
    _id: string;
    studentId: string;
    studentName: string;
    subjectName: string;
    studyTime: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

interface ClassRequestsListProps {
    user: any;
    onRequestsUpdate?: (count: number) => void;
}

export default function ClassRequestsList({ user, onRequestsUpdate }: ClassRequestsListProps) {
    const { t } = useLanguage();
    const [requests, setRequests] = useState<ClassRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.CLASSES.PENDING_REQUESTS, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
                if (onRequestsUpdate) onRequestsUpdate(data.length);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(
                action === 'approve'
                    ? API_ENDPOINTS.CLASSES.APPROVE_REQUEST(requestId)
                    : API_ENDPOINTS.CLASSES.REJECT_REQUEST(requestId),
                {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (res.ok) {
                toast.success(action === 'approve' ? 'อนุมัติคำขอสำเร็จ' : 'ปฏิเสธคำขอสำเร็จ');
                // Remove from local list
                const updated = requests.filter(r => r._id !== requestId);
                setRequests(updated);
                if (onRequestsUpdate) onRequestsUpdate(updated.length);
            } else {
                toast.error('เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    if (loading) return <div className="p-4 text-center text-sm text-slate-500">Loading requests...</div>;

    if (requests.length === 0) {
        return <div className="p-8 text-center text-slate-500">ไม่มีคำขอลงทะเบียนเรียนใหม่</div>;
    }

    return (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            {requests.map((req) => (
                <div key={req._id} className="p-3 bg-white rounded-none border border-slate-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <User className="h-3 w-3 text-slate-400" />
                                {req.studentName}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                <BookOpen className="h-3 w-3 text-primary" />
                                {req.subjectName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {req.studyTime}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1 border-t border-slate-50 pt-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => handleAction(req._id, 'reject')}
                        >
                            <X className="h-3 w-3 mr-1" />
                            ไม่อนุมัติ
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                            onClick={() => handleAction(req._id, 'approve')}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            อนุมัติ
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
