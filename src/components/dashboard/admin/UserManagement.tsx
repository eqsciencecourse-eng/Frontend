'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
    Search, Users, Trash2, Eye, Calendar, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

interface UserManagementProps {
    users: any[]; // These are the teachers being managed
    onDeleteUser: (id: string, name: string) => void;
    onUpdateUser?: () => void;
    allSubjects?: { _id: string; name: string }[];
}

export default function UserManagement({ users, onDeleteUser, onUpdateUser, allSubjects = [] }: UserManagementProps) {
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Get unique classes for filter
    const classes = Array.from(new Set(users.map(u => u.studentClass).filter(Boolean)));

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = filterClass === 'all' || u.studentClass === filterClass;
        return matchesSearch && matchesClass;
    });

    const formatThaiDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    return (
        <>
            <Card className="dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-none">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="dark:text-white text-xl">ระบบจัดการครู</CardTitle>
                            <p className="text-sm text-slate-500">จัดการข้อมูลครูในระบบ (เพิ่ม/ลบ/แก้ไข)</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="ค้นหาครู..."
                                className="pl-10 rounded-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="py-4 pl-6">ชื่อ-นามสกุล</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>วันที่สมัคร</TableHead>
                                <TableHead className="text-right pr-6">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                        ไม่พบข้อมูลครู
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((u) => (
                                    <TableRow key={u._id} className="hover:bg-slate-50/50">
                                        <TableCell className="py-3 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-none bg-indigo-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden text-indigo-700 font-bold text-xs">
                                                    {u.photoURL ? (
                                                        <img src={u.photoURL} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        u.displayName?.substring(0, 2).toUpperCase() || <Users className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="font-medium text-slate-800 dark:text-white">
                                                    {u.displayName}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{u.email}</TableCell>
                                        <TableCell className="text-slate-600 font-mono text-xs">
                                            {u.createdAt ? formatThaiDate(u.createdAt) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 h-8 rounded-none border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => setSelectedUser(u)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    ดูข้อมูล
                                                </Button>
                                                {u.role !== 'admin' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-none"
                                                        onClick={() => onDeleteUser(u._id, u.displayName)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Manage User Modal */}
                <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogContent className="max-w-md rounded-none">
                        <DialogHeader>
                            <DialogTitle>ข้อมูลผู้ใช้</DialogTitle>
                        </DialogHeader>
                        {selectedUser && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-24 w-24 rounded-none bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                        {selectedUser.photoURL ? (
                                            <img src={selectedUser.photoURL} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Users className="h-10 w-10 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold dark:text-white">{selectedUser.displayName}</h3>
                                        <p className="text-gray-500">{selectedUser.email}</p>
                                        <Badge className="mt-2 capitalize rounded-none">{selectedUser.role}</Badge>
                                    </div>
                                </div>

                                <div className="space-y-6 border-t pt-4 dark:border-slate-700">
                                    {/* Personal Info */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> ข้อมูลส่วนตัว
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-slate-500">ชื่อ-นามสกุล</p>
                                                <p className="font-medium">{selectedUser.prefix || ''} {selectedUser.firstName} {selectedUser.lastName} {(!selectedUser.firstName && selectedUser.displayName)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">ชื่อเล่น</p>
                                                <p className="font-medium">{selectedUser.nickname || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">วัน/เดือน/ปี เกิด</p>
                                                <p className="font-medium">{selectedUser.birthDate || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">อายุ</p>
                                                <p className="font-medium">{selectedUser.age || '-'} ปี</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500">ที่อยู่</p>
                                                <p className="font-medium">{selectedUser.address || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">เบอร์โทรศัพท์</p>
                                                <p className="font-medium">{selectedUser.studentPhone || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">สถานะ</p>
                                                <Badge variant={selectedUser.status === 'drop' ? 'destructive' : 'default'} className="rounded-none">
                                                    {selectedUser.status === 'drop' ? 'Drop' : 'กำลังเรียน'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parent Info */}
                                    <div className="bg-slate-50 p-3 rounded-none border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                            <UserPlus className="w-4 h-4" /> ข้อมูลผู้ปกครอง
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-slate-500">ชื่อผู้ปกครอง</p>
                                                <p className="font-medium">{selectedUser.parentName || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">ความสัมพันธ์</p>
                                                <p className="font-medium">{selectedUser.parentRelation || '-'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500">เบอร์โทรติดต่อ</p>
                                                <p className="font-medium">{selectedUser.parentPhone || '-'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500">ที่อยู่ผู้ปกครอง</p>
                                                <p className="font-medium">{selectedUser.parentAddress || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={() => setSelectedUser(null)} className="rounded-none">ปิดหน้าต่าง</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </Card>
        </>
    );
}
