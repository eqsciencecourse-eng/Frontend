'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Eye, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';

interface PendingTeacher {
    _id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    createdAt: string;
}

export default function TeacherRequests() {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<PendingTeacher | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPendingTeachers = async () => {
        if (!currentUser) return;

        try {
            const token = await currentUser.getIdToken();

            const response = await fetch(API_ENDPOINTS.USERS.PENDING_TEACHERS, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pending teachers');
            }

            const data = await response.json();
            setTeachers(data);
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingTeachers();
    }, [currentUser]);

    const handleView = (teacher: PendingTeacher) => {
        setSelectedTeacher(teacher);
        setShowDetails(true);
    };

    const handleApprove = async (teacherId: string) => {
        if (!currentUser) return;

        setActionLoading(true);
        try {
            const token = await currentUser.getIdToken();

            const response = await fetch(API_ENDPOINTS.ADMIN.APPROVE_TEACHER(teacherId), {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to approve teacher');
            }

            toast.success('อนุมัติครูสำเร็จ!');
            setShowDetails(false);
            fetchPendingTeachers();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการอนุมัติ');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (teacherId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบคำขอนี้?')) {
            return;
        }

        if (!currentUser) return;

        setActionLoading(true);
        try {
            const token = await currentUser.getIdToken();

            const response = await fetch(API_ENDPOINTS.ADMIN.DELETE_USER(teacherId), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete teacher request');
            }

            toast.success('ลบคำขอสำเร็จ');
            setShowDetails(false);
            fetchPendingTeachers();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>คำขอเข้าใช้งานระบบครู</CardTitle>
                    <CardDescription>
                        มีคำขอรออนุมัติ {teachers.length} รายการ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {teachers.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">ไม่มีคำขอรออนุมัติ</p>
                    ) : (
                        <div className="space-y-4">
                            {teachers.map((teacher) => (
                                <div
                                    key={teacher._id}
                                    className="flex items-center justify-between p-4 border rounded-none hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={teacher.photoURL} />
                                            <AvatarFallback>{teacher.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{teacher.displayName}</p>
                                            <p className="text-sm text-gray-500">{teacher.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleView(teacher)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            ตรวจสอบ
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleApprove(teacher._id)}
                                            disabled={actionLoading}
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            อนุมัติ
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(teacher._id)}
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            ลบ
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ข้อมูลผู้ขอสิทธิ์ครู</DialogTitle>
                    </DialogHeader>
                    {selectedTeacher && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedTeacher.photoURL} />
                                    <AvatarFallback className="text-2xl">
                                        {selectedTeacher.displayName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-lg">{selectedTeacher.displayName}</p>
                                    <p className="text-sm text-gray-500">{selectedTeacher.email}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-sm text-gray-500">
                                    วันที่ส่งคำขอ: {new Date(selectedTeacher.createdAt).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="default"
                                    className="flex-1"
                                    onClick={() => handleApprove(selectedTeacher._id)}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    อนุมัติ
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleDelete(selectedTeacher._id)}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    ลบ
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
