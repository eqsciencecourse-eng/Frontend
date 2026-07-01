
'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessAccounting } from '@/lib/admin';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountingPage() {
    const [sidebarTab, setSidebarTab] = useState('accounting');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { user } = useAuth();

    const canAccess = canAccessAccounting(user);

    // Target URL provided by user
    const PHP_APP_URL = 'https://eq-ac.vercel.app/';

    if (!canAccess) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
                <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-16'} h-full flex items-center justify-center transition-all duration-300`}>
                    <div className="text-center max-w-md p-8">
                        <div className="h-20 w-20 mx-auto mb-6 rounded-none bg-red-50 border border-red-200 flex items-center justify-center">
                            <ShieldX className="h-10 w-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">ไม่สามารถเข้าใช้งานระบบนี้ได้</h2>
                        <p className="text-slate-500 mb-6">
                            บัญชีผู้ใช้ของคุณไม่มีสิทธิ์เข้าใช้งานระบบบัญชี กรุณาติดต่อผู้ดูแลระบบหลัก
                        </p>
                        <Button
                            onClick={() => router.push('/dashboard/admin')}
                            className="rounded-none bg-slate-800 hover:bg-slate-700 text-white"
                        >
                            กลับไปหน้าแรก
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

            <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-16'} h-full relative flex flex-col transition-all duration-300`}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <span className="ml-3 text-slate-600 font-medium">Loading Accounting System...</span>
                    </div>
                )}

                <iframe
                    src={PHP_APP_URL}
                    className="w-full h-full border-none"
                    title="Legacy Accounting System"
                    onLoad={() => setIsLoading(false)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            </main>
        </div>
    );
}
