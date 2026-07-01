'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import AdminScoreManagement from '@/components/dashboard/admin/AdminScoreManagement';

export default function ManageScoresPage() {
    const [sidebarTab, setSidebarTab] = useState('manage-scores');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

            <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-16'} h-full overflow-y-auto p-8 transition-all duration-300`}>
                <AdminScoreManagement />
            </main>
        </div>
    );
}
