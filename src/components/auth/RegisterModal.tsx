'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, ArrowLeft, Key, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface RegisterModalProps {
    onSuccess: () => void;
    onClose?: () => void;
}

export default function RegisterModal({ onSuccess, onClose }: RegisterModalProps) {
    const [loading, setLoading] = useState(false);
    const { loginWithCredentials } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password) {
            toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        setLoading(true);
        try {
            await loginWithCredentials({
                username: formData.username,
                password: formData.password
            });
            toast.success('เข้าสู่ระบบสำเร็จ');
            onSuccess();
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full bg-slate-50/50 dark:bg-slate-900/50 relative flex flex-col">
            {/* Custom Header with Back Button & Logo */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b px-6 py-4 shadow-sm flex items-center justify-between transition-all">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                    </Button>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white font-itim">เข้าสู่ระบบ (นักเรียน)</h3>
                        <p className="text-xs text-slate-500">กรอกข้อมูลเพื่อเข้าใช้งาน</p>
                    </div>
                </div>

                {/* Official Logo */}
                <div className="relative h-10 w-32 hidden sm:block">
                    <Image
                        src="/logo.png"
                        alt="EQ.Science Logo"
                        width={128}
                        height={40}
                        className="object-contain object-right"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center sm:hidden">
                        <Image
                            src="/logo.png"
                            alt="EQ.Science Logo"
                            width={80}
                            height={80}
                            className="mx-auto mb-4"
                        />
                        <h2 className="text-2xl font-bold text-slate-800">EQ Science</h2>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="font-semibold text-gray-700">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="ชื่อผู้ใช้"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="รหัสผ่าน"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
