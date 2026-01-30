'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, User, ShieldCheck, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { FcGoogle } from 'react-icons/fc';

interface TeacherLoginModalProps {
    onSuccess: () => void;
}

export default function TeacherLoginModal({ onSuccess }: TeacherLoginModalProps) {
    const [loading, setLoading] = useState(false);
    const { signInWithGoogle, loginWithCredentials, logout } = useAuth();

    const [teacherForm, setTeacherForm] = useState({ username: '', password: '' });

    const handleTeacherLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginWithCredentials({
                email: teacherForm.username,
                password: teacherForm.password,
            });
            toast.success('เข้าสู่ระบบสำเร็จ');
            onSuccess();
        } catch (error) {
            console.error('Teacher Login Error:', error);
            toast.error('เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบอีเมลและรหัสผ่าน');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async () => {
        setLoading(true);
        try {
            const result = await signInWithGoogle();
            const userEmail = result.user.email;
            const allowedEmails = ['67319010041@technicrayong.ac.th', 'eq.science.course@gmail.com'];

            if (!allowedEmails.includes(userEmail)) {
                await logout();
                toast.error('คุณไม่มีสิทธิ์เข้าสู่ระบบนี้');
                return;
            }

            toast.success('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ');
            onSuccess();
        } catch (error) {
            console.error('Admin Login Error:', error);
            toast.error('เข้าสู่ระบบล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-2 px-2">
            <Tabs defaultValue="teacher" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 p-1 rounded-2xl h-14">
                    <TabsTrigger
                        value="teacher"
                        className="rounded-xl h-12 text-md font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all space-x-2"
                    >
                        <GraduationCap className="w-5 h-5" />
                        <span>คุณครู</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="admin"
                        className="rounded-xl h-12 text-md font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all space-x-2"
                    >
                        <ShieldCheck className="w-5 h-5" />
                        <span>ผู้ดูแลระบบ</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="teacher" className="mt-0">
                    <form onSubmit={handleTeacherLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-gray-700 font-semibold">อีเมล (Email)</Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                    <Input
                                        id="username"
                                        className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                        placeholder="teacher@eqscience.com"
                                        value={teacherForm.username}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-700 font-semibold">รหัสผ่าน (Password)</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                        placeholder="••••••••"
                                        value={teacherForm.password}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl text-lg font-medium shadow-md hover:shadow-lg transition-all"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            เข้าสู่ระบบ
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="admin" className="mt-0">
                    <div className="space-y-8 py-8 px-4 text-center">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                                <ShieldCheck className="w-10 h-10 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold font-itim text-gray-800">สำหรับผู้ดูแลระบบ</h3>
                            <p className="text-gray-500">
                                กรุณาเข้าสู่ระบบด้วยบัญชี Google<br />ที่ได้รับอนุญาตเท่านั้น
                            </p>
                        </div>

                        <Button
                            variant="outline"
                            type="button"
                            className="w-full h-14 text-lg font-medium relative rounded-xl border-2 hover:border-indigo-200 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md group bg-white"
                            onClick={handleAdminLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-3 h-5 w-5 animate-spin text-indigo-600" />
                            ) : (
                                <FcGoogle className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-gray-700">Login as Admin</span>
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
