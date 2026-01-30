'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import TeacherLoginModal from '@/components/auth/TeacherLoginModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

function AuthPageContent() {
    const [openRegister, setOpenRegister] = useState(false);
    const [openLogin, setOpenLogin] = useState(false);
    const [openTeacher, setOpenTeacher] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (searchParams.get('mode') === 'login') {
            setOpenLogin(true);
        }
    }, [searchParams]);

    const handleLoginSuccess = () => {
        const redirect = searchParams.get('redirect');
        if (redirect) {
            router.push(redirect);
        } else {
            setOpenLogin(false);
            // Optional: Default redirect to dashboard if needed, but LoginModal might have handled toast only.
            // If just closing, the user stays on Auth page. 
            // Usually we want to go to Dashboard?
            // Existing logic just closed modal. Ill keep it as is if no redirect.
            router.push('/dashboard/student');
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse delay-1000" />

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="glass rounded-3xl p-8 space-y-8 animate-fade-in-up">
                    <div className="text-center space-y-4">
                        {/* Logo Section */}
                        <div className="flex justify-center mb-6">
                            {/* Ideally use <Image src="/logo.png" ... /> here if file exists */}
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-secondary opacity-75 blur"></div>
                                <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl">
                                    <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                        EQ.Science
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-foreground">
                            Rayong Learning Center
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            ระบบจัดการผลสัมฤทธิ์ทางการเรียน
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button
                            className="h-12 text-lg font-medium bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-primary/25 transition-all duration-300"
                            onClick={() => setOpenRegister(true)}
                        >
                            สมัครสมาชิก
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 text-lg border-2 hover:bg-secondary/10 hover:text-secondary hover:border-secondary transition-all duration-300"
                            onClick={() => setOpenLogin(true)}
                        >
                            เข้าสู่ระบบ
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">สำหรับครูผู้สอน</span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="h-10 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setOpenTeacher(true)}
                        >
                            เข้าสู่ระบบครู
                        </Button>
                    </div>

                    <div className="text-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5 text-secondary" /> : <Moon className="h-5 w-5 text-primary" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Register Modal */}
            <Dialog open={openRegister} onOpenChange={setOpenRegister}>
                <DialogContent className="sm:max-w-md glass border-0">
                    <DialogHeader>
                        <DialogTitle className="text-primary text-xl">สมัครสมาชิกใหม่</DialogTitle>
                    </DialogHeader>
                    <RegisterModal onSuccess={() => setOpenRegister(false)} onClose={() => setOpenRegister(false)} />
                </DialogContent>
            </Dialog>

            {/* Login Modal */}
            <Dialog open={openLogin} onOpenChange={setOpenLogin}>
                <DialogContent className="sm:max-w-md glass border-0">
                    <DialogHeader>
                        <DialogTitle className="text-primary text-xl">เข้าสู่ระบบ</DialogTitle>
                    </DialogHeader>
                    <LoginModal onSuccess={handleLoginSuccess} />
                </DialogContent>
            </Dialog>

            {/* Teacher Login Modal */}
            <Dialog open={openTeacher} onOpenChange={setOpenTeacher}>
                <DialogContent className="sm:max-w-md glass border-0">
                    <DialogHeader>
                        <DialogTitle className="text-secondary text-xl">Teacher Portal</DialogTitle>
                    </DialogHeader>
                    <TeacherLoginModal onSuccess={() => setOpenTeacher(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <AuthPageContent />
        </Suspense>
    );
}
