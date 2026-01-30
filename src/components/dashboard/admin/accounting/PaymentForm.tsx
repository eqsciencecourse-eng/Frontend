
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_ENDPOINTS } from '@/lib/api-config';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PaymentForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        receiveId: '',
        customerName: '',
        program: '',
        classLevel: '',
        periodStart: '',
        periodEnd: '',
        amount: '',
        bank: '',
        paymentDate: '',
        paymentTime: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                headers: { Authorization: `Bearer ${token}` },
                body: formDataToSend,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create invoice');
            }

            toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
            // Reset form
            setFormData({
                receiveId: '',
                customerName: '',
                program: '',
                classLevel: '',
                periodStart: '',
                periodEnd: '',
                amount: '',
                bank: '',
                paymentDate: '',
                paymentTime: '',
            });
            setFile(null);

        } catch (error: any) {
            console.error('Error creating invoice:', error);
            toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 shadow-sm border border-slate-100 rounded-none">
            <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">ระบบชำระเงิน</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label>หมายเลขใบเสร็จ :</Label>
                    <Input name="receiveId" value={formData.receiveId} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>ชื่อ-สกุล นักเรียน :</Label>
                    <Input name="customerName" value={formData.customerName} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>เลือกโปรแกรมวิชา :</Label>
                    <Select onValueChange={(val) => handleSelectChange('classLevel', val)}>
                        <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="-เลือกโปรแกรมวิชา-" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Scratch Game">Scratch Game</SelectItem>
                            <SelectItem value="Python Data Science (AI)">Python Data Science (AI)</SelectItem>
                            <SelectItem value="Microbit (Robotic)">Microbit (Robotic)</SelectItem>
                            <SelectItem value="Web Development">Web Development</SelectItem>
                            <SelectItem value="Drone">Drone</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>วันที่เริ่มเรียน :</Label>
                    <Input type="date" name="periodStart" value={formData.periodStart} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>วันสิ้นสุดชำระค่าเรียน :</Label>
                    <Input type="date" name="periodEnd" value={formData.periodEnd} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>จำนวนเงินที่ชำระ :</Label>
                    <Input type="number" name="amount" value={formData.amount} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>เลือกธนาคาร :</Label>
                    <Select onValueChange={(val) => handleSelectChange('bank', val)}>
                        <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="เลือกธนาคาร" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="KBANK">กสิกรไทย (KBANK)</SelectItem>
                            <SelectItem value="SCB">ไทยพาณิชย์ (SCB)</SelectItem>
                            <SelectItem value="BBL">กรุงเทพ (BBL)</SelectItem>
                            <SelectItem value="KTB">กรุงไทย (KTB)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>วันที่ชำระเงิน :</Label>
                    <Input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>เวลาที่ชำระเงิน :</Label>
                    <Input type="time" name="paymentTime" value={formData.paymentTime} onChange={handleChange} className="rounded-none" />
                </div>

                <div className="space-y-2">
                    <Label>แนบรูปสลิป :</Label>
                    <Input type="file" accept="image/*" onChange={handleFileChange} className="rounded-none cursor-pointer" />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none h-12 text-lg" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Submit
                </Button>
            </form>
        </div>
    );
}
