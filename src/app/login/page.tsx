'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Home, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6 max-w-md w-full bg-white p-10 rounded-3xl border border-slate-200 shadow-xl"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Home className="w-10 h-10 text-primary" />
                </div>

                <h1 className="text-3xl font-bold text-slate-900">
                    เข้าสู่ระบบ
                </h1>

                <p className="text-slate-500 text-lg">
                    กรุณาเข้าสู่ระบบที่หน้าหลักเพื่อเริ่มต้นใช้งาน
                </p>

                <div className="pt-4 space-y-3">
                    <Link href="/" className="block">
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
                        >
                            <Home className="mr-2 h-5 w-5" />
                            กลับสู่หน้าหลัก
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
