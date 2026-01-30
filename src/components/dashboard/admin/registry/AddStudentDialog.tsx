'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';

interface AddStudentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function AddStudentDialog({ open, onOpenChange, onSuccess }: AddStudentDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        studentIdMap: '',
        prefix: '',
        firstName: '',
        lastName: '',
        nickname: '',
        school: '', // Manual text input as requested
        studentClass: '',
        studentPhone: '',
        parentName: '',
        parentRelation: '',
        parentPhone: '',
        address: '',
        enrollmentType: '',
        status: 'studying'
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            toast.error('กรุณากรอกชื่อและนามสกุล');
            return;
        }

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const payload = {
                ...formData,
                role: 'student',
                username: formData.studentIdMap || undefined, // Optional: use ID as username if provided
                isRegistry: true, // Mark as registry entry
                isApproved: true
            };

            const res = await fetch(API_ENDPOINTS.USERS.LIST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create student');
            }

            toast.success('เพิ่มนักเรียนสำเร็จ');
            onSuccess();
            onOpenChange(false);
            // Reset form
            setFormData({
                studentIdMap: '',
                prefix: '',
                firstName: '',
                lastName: '',
                nickname: '',
                school: '',
                studentClass: '',
                studentPhone: '',
                parentName: '',
                parentRelation: '',
                parentPhone: '',
                address: '',
                enrollmentType: '',
                status: 'studying'
            });

        } catch (error: any) {
            console.error('Create Error:', error);
            toast.error(error.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none border-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <UserPlus className="h-6 w-6 text-indigo-600" />
                        เพิ่มนักเรียนใหม่ (Manual)
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* 1. Student Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700 border-b pb-2">ข้อมูลส่วนตัว</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label>รหัสบัตร/ID (ถ้ามี)</Label>
                                <Input
                                    value={formData.studentIdMap}
                                    onChange={(e) => handleChange('studentIdMap', e.target.value)}
                                    className="rounded-none placeholder:text-slate-300"
                                    placeholder="Auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>คำนำหน้า</Label>
                                <Select value={formData.prefix} onValueChange={(val) => handleChange('prefix', val)}>
                                    <SelectTrigger className="rounded-none"><SelectValue placeholder="เลือก..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ด.ช.">ด.ช.</SelectItem>
                                        <SelectItem value="ด.ญ.">ด.ญ.</SelectItem>
                                        <SelectItem value="นาย">นาย</SelectItem>
                                        <SelectItem value="นางสาว">นางสาว</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-red-500">* ชื่อจริง</Label>
                                <Input required value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-red-500">* นามสกุล</Label>
                                <Input required value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="space-y-1">
                                <Label>ชื่อเล่น</Label>
                                <Input value={formData.nickname} onChange={(e) => handleChange('nickname', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="space-y-1 lg:col-span-2">
                                <Label>โรงเรียน</Label>
                                <Input
                                    value={formData.school}
                                    onChange={(e) => handleChange('school', e.target.value)}
                                    className="rounded-none"
                                    placeholder="กรอกชื่อโรงเรียน..."
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>ระดับชั้น</Label>
                                <Input value={formData.studentClass} onChange={(e) => handleChange('studentClass', e.target.value)} className="rounded-none" placeholder="เช่น ม.1" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Contact Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700 border-b pb-2">ข้อมูลติดต่อ & ผู้ปกครอง</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>ชื่อผู้ปกครอง</Label>
                                <Input value={formData.parentName} onChange={(e) => handleChange('parentName', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="space-y-1">
                                <Label>ความสัมพันธ์</Label>
                                <Input value={formData.parentRelation} onChange={(e) => handleChange('parentRelation', e.target.value)} className="rounded-none" placeholder="บิดา/มารดา" />
                            </div>
                            <div className="space-y-1">
                                <Label>เบอร์ผู้ปกครอง</Label>
                                <Input value={formData.parentPhone} onChange={(e) => handleChange('parentPhone', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="space-y-1">
                                <Label>เบอร์ส่วนตัว</Label>
                                <Input value={formData.studentPhone} onChange={(e) => handleChange('studentPhone', e.target.value)} className="rounded-none" />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <Label>ที่อยู่</Label>
                                <Input value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="rounded-none" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Enrollment Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700 border-b pb-2">ข้อมูลการเรียน</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>สมัครเรียนหลักสูตร</Label>
                                <Input value={formData.enrollmentType} onChange={(e) => handleChange('enrollmentType', e.target.value)} className="rounded-none" placeholder="เช่น วิทย์-คณิต" />
                            </div>
                            <div className="space-y-1">
                                <Label>สถานะ</Label>
                                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="studying">กำลังเรียน</SelectItem>
                                        <SelectItem value="drop">ดรอป</SelectItem>
                                        <SelectItem value="resigned">ลาออก</SelectItem>
                                        <SelectItem value="graduated">จบการศึกษา</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">
                            <X className="w-4 h-4 mr-2" /> ยกเลิก
                        </Button>
                        <Button type="submit" disabled={loading} className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            บันทึกข้อมูล
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
