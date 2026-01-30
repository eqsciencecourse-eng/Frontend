'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function CreateTeacherForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', displayName: '', password: '' });
    const [createdTeacher, setCreatedTeacher] = useState<{ email: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setCreatedTeacher(null);

        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.CREATE_TEACHER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create teacher');
            }

            const data = await res.json();
            setCreatedTeacher({
                email: data.user.email,
                password: data.tempPassword,
            });
            toast.success('สร้างบัญชีครูสำเร็จ');
            setFormData({ email: '', displayName: '', password: '' });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!createdTeacher) return;
        const text = `Email: ${createdTeacher.email}\nPassword: ${createdTeacher.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('คัดลอกข้อมูลแล้ว');
    };

    return (
        <Card className="dark:bg-slate-800 dark:border-slate-700 rounded-none">
            <CardHeader>
                <CardTitle className="dark:text-white">สร้างบัญชีครูใหม่</CardTitle>
                <CardDescription>สร้างบัญชีสำหรับครูเพื่อให้สามารถเข้าสู่ระบบด้วย Username/Password ได้</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล (Email)</Label>
                            <Input
                                className="rounded-none"
                                type="email"
                                placeholder="teacher@eqscience.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="displayName">ชื่อ-นามสกุล (Display Name)</Label>
                            <Input
                                className="rounded-none"
                                placeholder="คุณครูสมศรี ใจดี"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">รหัสผ่าน (Optional)</Label>
                        <Input
                            className="rounded-none"
                            type="text"
                            placeholder="ปล่อยว่างเพื่อสุ่มรหัสผ่านอัตโนมัติ"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">หากไม่ระบุ ระบบจะสุ่มรหัสผ่านให้</p>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full md:w-auto rounded-none">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        สร้างบัญชี
                    </Button>
                </form>

                {createdTeacher && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-none">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-green-800 dark:text-green-400">สร้างบัญชีสำเร็จ!</h3>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-green-700 hover:text-green-800 hover:bg-green-100 rounded-none">
                                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}
                            </Button>
                        </div>
                        <div className="space-y-1 text-sm text-green-900 dark:text-green-300">
                            <p><span className="font-medium">Email:</span> {createdTeacher.email}</p>
                            <p><span className="font-medium">Password:</span> <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded-none border border-green-200 dark:border-green-800">{createdTeacher.password}</code></p>
                        </div>
                        <p className="mt-2 text-xs text-green-700 dark:text-green-500">
                            * กรุณาบันทึกรหัสผ่านนี้และส่งให้ครูผู้ใช้งาน รหัสผ่านนี้จะไม่แสดงอีกครั้ง
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
