'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, GraduationCap, X, Info } from 'lucide-react';
import SendFileTab from '@/components/dashboard/admin/SendFileTab';
import UserManagement from '@/components/dashboard/admin/UserManagement';
import AllUsersManagement from '@/components/dashboard/admin/AllUsersManagement';
import CreateTeacherForm from '@/components/dashboard/admin/CreateTeacherForm';
import TeacherPermissionManagement from '@/components/dashboard/admin/TeacherPermissionManagement';
import AdminAttendanceView from '@/components/dashboard/admin/AdminAttendanceView';
import { isAdmin } from '@/lib/admin';
import { API_ENDPOINTS } from '@/lib/api-config';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';
import SystemNotifications from '@/components/dashboard/admin/SystemNotifications';
import ManageUsers from '@/components/dashboard/admin/ManageUsers';
import CreateUser from '@/components/dashboard/admin/CreateUser';


import { useSearchParams } from 'next/navigation';

function AdminDashboardContent() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const { notifications } = useRealtime();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState(tabParam || 'users');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showUpdatePopup, setShowUpdatePopup] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [showTeaching, setShowTeaching] = useState(false);

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    useEffect(() => {
        const optout = localStorage.getItem('admin-popup-optout');
        if (optout) return;
        const seen = localStorage.getItem('admin-update-v230-popup');
        if (!seen) {
            setShowUpdatePopup(true);
        }
    }, []);

    const handleClosePopup = () => {
        setShowUpdatePopup(false);
        localStorage.setItem('admin-update-v230-popup', 'true');
        if (dontShowAgain) {
            localStorage.setItem('admin-popup-optout', 'true');
        }
        setShowTeaching(true);
    };

    useEffect(() => {
        if (showTeaching) {
            const timer = setTimeout(() => setShowTeaching(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [showTeaching]);

    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            const usersRes = await fetch(API_ENDPOINTS.ADMIN.USERS, { headers });
            if (usersRes.ok) {
                const data = await usersRes.json();
                if (Array.isArray(data)) setUsers(data);
            }

            const pendingRes = await fetch(API_ENDPOINTS.ADMIN.PENDING_TEACHERS, { headers });
            if (pendingRes.ok) setPendingTeachers(await pendingRes.json());

            const subjectsRes = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (subjectsRes.ok) setSubjects(await subjectsRes.json());

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (!loading && (!user || !isAdmin(user))) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => { fetchData(); }, [user]);
    useEffect(() => { if (notifications.length > 0) fetchData(); }, [notifications]);

    const handleApproveTeacher = async (teacher: any) => {
        if (!user || !teacher.approvalToken) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.APPROVE_TEACHER(teacher.approvalToken), {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                toast.success(`อนุมัติครู ${teacher.displayName} สำเร็จ`);
                fetchData();
            }
        } catch (error) {
            console.error('Approve error:', error);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`ยืนยันการลบผู้ใช้ ${userName}?`)) return;
        try {
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.DELETE_USER(userId), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                toast.success(`ลบผู้ใช้ ${userName} สำเร็จ`);
                fetchData();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    const navbarActions = null; // Removed as sidebar handles settings

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex theme-square">
            {/* Sidebar Navigation */}
            <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => { setIsSidebarOpen(prev => !prev); setShowTeaching(false); }} teachingHighlight={showTeaching} />

            {/* Main Content Area */}
            <main className={`flex-1 ${isSidebarOpen ? 'ml-[320px]' : 'ml-16'} p-8 transition-all duration-300 ease-in-out`} style={{ zoom: '80%', transformOrigin: 'top left' }}>
                {/* Header for current section */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                            {activeTab === 'users' && 'ระบบสร้างบัญชีครู'}
                            {activeTab === 'all-users' && 'ผู้ใช้ทั้งหมด'}
                            {activeTab === 'send-files' && 'ระบบส่งเกียรติบัตร'}
                            {activeTab === 'permissions' && 'กำหนดสิทธิ์ครู'}
                            {activeTab === 'manage-teachers' && 'จัดการข้อมูลครู'}
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {activeTab === 'users' && 'จัดการคำขอสมัครครูและรายชื่อครูทั้งหมด'}
                            {activeTab === 'all-users' && 'ดูรายชื่อและจัดการผู้ใช้งานในระบบ'}
                            {activeTab === 'send-files' && 'ส่งเกียรติบัตรให้นักเรียนรายบุคคลหรือทั้งห้อง'}
                            {activeTab === 'permissions' && 'กำหนดวิชาที่ครูรับผิดชอบ'}
                            {activeTab === 'manage-teachers' && 'ดูรายชื่อและจัดการข้อมูลครู'}
                        </p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-sm p-6 border border-slate-200 min-h-[calc(100vh-12rem)]"
                    >
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                {/* pending Teachers */}
                                {pendingTeachers.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                        <h3 className="text-yellow-800 font-bold flex items-center gap-2 mb-4">
                                            <AlertTriangle className="h-5 w-5" />
                                            คำขอสมัครครูที่รออนุมัติ ({pendingTeachers.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {pendingTeachers.map((teacher) => (
                                                <div key={teacher._id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-yellow-100 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                                            <GraduationCap className="h-5 w-5 text-yellow-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{teacher.displayName}</p>
                                                            <p className="text-sm text-slate-500">{teacher.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => handleApproveTeacher(teacher)} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                                            อนุมัติ
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                                                            ปฏิเสธ
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <CreateTeacherForm />
                            </div>
                        )}

                        {activeTab === 'manage-teachers' && (
                            <div className="space-y-6">
                                <UserManagement
                                    users={users.filter(u => u.role === 'teacher')}
                                    onDeleteUser={handleDeleteUser}
                                    onUpdateUser={fetchData} // Allow refreshing after assignment
                                    allSubjects={subjects}
                                />
                            </div>
                        )}

                        {activeTab === 'all-users' && (
                            <div className="space-y-6">
                                <ManageUsers mode="registry" />
                            </div>
                        )}

                        {activeTab === 'manage-users' && (
                            <div className="space-y-6">
                                <ManageUsers mode="manual" />
                            </div>
                        )}

                        {activeTab === 'send-files' && (
                            <div className="space-y-6">
                                <SendFileTab
                                    users={users}
                                    onUpdateUser={fetchData}
                                    onDeleteUser={handleDeleteUser}
                                    currentUser={user}
                                />
                            </div>
                        )}

                        {activeTab === 'permissions' && (
                            <div className="space-y-6">
                                <TeacherPermissionManagement
                                    users={users}
                                    onUpdateUser={fetchData}
                                />
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="space-y-6">
                                <AdminAttendanceView />
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <SystemNotifications />
                            </div>
                        )}

                        {activeTab === 'create-user' && (
                            <div className="space-y-6">
                                <CreateUser />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Update Popup */}
            <Dialog open={showUpdatePopup} onOpenChange={setShowUpdatePopup}>
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-none border border-slate-200 shadow-xl" hideCloseButton>
                    <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <Info className="h-4 w-4 text-white" />
                                </div>
                                <DialogTitle className="text-xl font-bold text-slate-800 m-0">อัปเดตระบบ V.2.3.0</DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="px-6 py-6 space-y-5 text-sm text-slate-700">
                            <div className="animate-slide-reveal">
                                <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 p-5">
                                    <div className="relative">
                                    <p className="font-bold text-indigo-900 text-base mb-2">เพิ่มระบบกราฟแสดงผลพัฒนาการนักเรียน</p>
                                    <p className="text-indigo-700 leading-relaxed">
                                        ในขั้นตอนที่ 3 ของระบบออกเกรด (Student Evaluation Wizard) เพิ่มกราฟเส้นแสดงพัฒนาการของนักเรียนในแต่ละทักษะ (
                                        <span className="font-semibold text-indigo-800">สมาธิ, การคิด, EQ, MQ, IQ, AQ</span>
                                        ) พร้อมเส้นค่าเฉลี่ย แสดงผลเป็นเปอรเซ็นต์ในทุกคาบเรียน
                                    </p>
                                    <ul className="mt-3 space-y-1.5">
                                        <li className="flex items-start gap-2 text-indigo-600">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span>แสดงข้อมูลตั้งแต่วันแรกถึงปัจจุบันตามวันที่ในระบบ</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-indigo-600">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span>ระบบ Hover แสดงคะแนนรายครั้งแบบละเอียด</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-indigo-600">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span>ปุ่มบันทึก PDF รายงานผลพัฒนาการภาษาไทย</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="animate-slide-reveal delay-100 flex items-center gap-3 bg-slate-50 border border-slate-200 p-3">
                            <input
                                type="checkbox"
                                id="dontShowAgain"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="h-4 w-4 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="dontShowAgain" className="text-xs text-slate-500 cursor-pointer select-none">
                                ไมต้องการเห็นข้อความนี้อีก
                            </label>
                        </div>
                    </div>
                    <div className="px-6 pb-6">
                        <Button onClick={handleClosePopup} className="w-full rounded-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                            รับทราบ
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}
