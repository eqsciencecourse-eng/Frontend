
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS } from '@/lib/api-config';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Upload } from 'lucide-react';

interface AddInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddInvoiceDialog({ open, onOpenChange, onSuccess }: AddInvoiceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        receiveId: '',
        customerName: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentTime: '12:00',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.receiveId || !formData.customerName || !formData.amount) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const formDataToSend = new FormData();

            Object.entries(formData).forEach(([key, value]) => {
                formDataToSend.append(key, value);
            });

            if (file) {
                formDataToSend.append('slip', file);
            }

            const res = await fetch(API_ENDPOINTS.ACCOUNTING.CREATE, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formDataToSend,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create invoice');
            }

            toast.success('สร้างใบเสร็จเรียบร้อยแล้ว');
            onSuccess();
            onOpenChange(false);
            // Reset form
            setFormData({
                receiveId: '',
                customerName: '',
                paymentDate: new Date().toISOString().split('T')[0],
                amount: '',
                paymentTime: '12:00',
            });
            setFile(null);

        } catch (error: any) {
            console.error('Error creating invoice:', error);
            // Check for duplicate key error from MongoDB (code 11000)
            if (error.message.includes('duplicate key') || error.message.includes('E11000')) {
                toast.error('เลขที่ใบเสร็จนี้มีอยู่แล้วในระบบ');
            } else {
                toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white rounded-none p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800 text-center">สร้างใบเสร็จรับเงิน</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="receiveId">เลขที่ใบเสร็จ *</Label>
                            <Input
                                id="receiveId"
                                name="receiveId"
                                value={formData.receiveId}
                                onChange={handleChange}
                                placeholder="เช่น REC001"
                                className="rounded-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">จำนวนเงิน *</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="rounded-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="customerName">ชื่อลูกค้า/นักเรียน *</Label>
                        <Input
                            id="customerName"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            placeholder="ชื่อ-นามสกุล"
                            className="rounded-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="paymentDate">วันที่ชำระ *</Label>
                            <Input
                                id="paymentDate"
                                name="paymentDate"
                                type="date"
                                value={formData.paymentDate}
                                onChange={handleChange}
                                className="rounded-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentTime">เวลาที่ชำระ</Label>
                            <Input
                                id="paymentTime"
                                name="paymentTime"
                                type="time"
                                value={formData.paymentTime}
                                onChange={handleChange}
                                className="rounded-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slip">แนบสลิปโอนเงิน</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="slip"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">ยกเลิก</Button>
                        <Button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none min-w-[100px]"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
