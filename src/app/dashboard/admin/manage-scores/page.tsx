'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import AdminScoreManagement from '@/components/dashboard/admin/AdminScoreManagement';

export default function ManageScoresPage() {
    const [sidebarTab, setSidebarTab] = useState('manage-scores');

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} />

            <main className="flex-1 ml-64 h-full overflow-y-auto p-8">
                <AdminScoreManagement />
            </main>
        </div>
    );
}
