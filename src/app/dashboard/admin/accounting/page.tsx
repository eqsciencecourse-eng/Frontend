
'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AccountingPage() {
    const [sidebarTab, setSidebarTab] = useState('accounting');
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { logout } = useAuth();

    // Target URL provided by user
    const PHP_APP_URL = 'https://eq-ac.vercel.app/';

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} />

            <main className="flex-1 ml-64 h-full relative flex flex-col">
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
