'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';

interface LoginModalProps {
    onSuccess: () => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
    const [loading, setLoading] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);
    const { signInWithGoogle } = useAuth();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            toast.success('เข้าสู่ระบบสำเร็จ!');
            onSuccess();
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.message === 'EMAIL_NOT_FOUND') {
                setShowNotFoundPopup(true);
            } else {
                toast.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 py-8 px-4">
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                    <LogIn className="w-10 h-10 text-indigo-600" />
                </motion.div>
                <h3 className="text-2xl font-bold font-itim text-gray-800">ยินดีต้อนรับกลับมา!</h3>
                <p className="text-gray-500 font-medium">
                    เข้าสู่ระบบเพื่อเรียนรู้และสนุกไป EqScience
                </p>
            </div>

            <div className="space-y-4">
                <Button
                    variant="outline"
                    type="button"
                    className="w-full h-14 text-lg font-medium relative rounded-xl border-2 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md group"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="mr-3 h-5 w-5 animate-spin text-indigo-600" />
                    ) : (
                        <FcGoogle className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">Login with Google</span>
                </Button>

                <div className="text-center">
                    <p className="text-xs text-gray-400 mt-6">
                        ระบบจะตรวจสอบข้อมูลของคุณอัตโนมัติและพาไปยังหน้า Dashboard
                    </p>
                </div>
            </div>

            {/* Not Found Popup with Animated Emoji */}
            <Dialog open={showNotFoundPopup} onOpenChange={setShowNotFoundPopup}>
                <DialogContent className="sm:max-w-sm text-center rounded-2xl">
                    <div className="py-8 flex flex-col items-center gap-6">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20
                            }}
                            className="bg-red-50 p-6 rounded-full"
                        >
                            <span className="text-5xl">😢</span>
                        </motion.div>
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl font-bold text-red-600 font-itim">ไม่พบบัญชีในระบบ</DialogTitle>
                        </DialogHeader>
                        <p className="text-gray-600 text-lg">
                            ขออภัย เราไม่พบข้อมูลบัญชี Google นี้<br />
                            <span className="font-semibold text-gray-800">กรุณาสมัครสมาชิกก่อนเข้าใช้งาน</span>
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center w-full">
                        <Button
                            onClick={() => setShowNotFoundPopup(false)}
                            className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl h-12 text-lg font-medium"
                        >
                            ปิดหน้าต่าง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
