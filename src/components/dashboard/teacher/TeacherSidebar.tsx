import { Button } from "@/components/ui/button";
import { Users, FileText, Settings, ShieldCheck, UserCog, LogOut, CalendarCheck, Bell, Award, UserPlus, BookOpen, List } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeacherSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function TeacherSidebar({ activeTab, onTabChange }: TeacherSidebarProps) {
    const { t } = useLanguage();
    const { logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const handleTabClick = (id: string) => {
        if (id === 'attendance') {
            router.push('/dashboard/teacher/attendance');
        } else if (pathname !== '/dashboard/teacher') {
            router.push(`/dashboard/teacher?tab=${id}`);
        } else {
            onTabChange(id);
        }
    };

    const menuGroups = [
        {
            title: 'จัดการการสอน',
            items: [
                { id: 'my-courses', label: 'รายวิชาที่สอน', icon: BookOpen },
            ]
        },
        {
            title: 'แสดงรายชื่อนักเรียน',
            items: [
                { id: 'schedule', label: 'รายชื่อนักเรียน', icon: List },
            ]
        }
    ];

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="w-64 bg-white border-r h-screen overflow-y-auto fixed left-0 top-0 flex flex-col shadow-sm z-50">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
                        EQ
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg leading-tight">EQ SCIENCE</h1>
                        <p className="text-xs text-slate-500">ระบบจัดการครูผู้สอน</p>
                    </div>
                </div>

                {/* Teacher Profile */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm rounded-none">
                        {user?.photoURL ? (
                            <AvatarImage src={user.photoURL} className="rounded-none object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-indigo-600 text-white rounded-none font-bold">TC</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'Teacher'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Teacher Account</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 space-y-6">
                {menuGroups.map((group, index) => (
                    <div key={index}>
                        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.title}</p>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <Button
                                    key={item.id}
                                    variant="ghost"
                                    onClick={() => handleTabClick(item.id)}
                                    className={`w-full justify-start gap-4 h-12 rounded-none text-slate-600 hover:text-indigo-700 hover:bg-slate-50 transition-all border border-transparent
                                        ${activeTab === item.id || (item.id === 'attendance' && pathname === '/dashboard/teacher/attendance')
                                            ? 'bg-white text-indigo-700 font-bold border-slate-200 shadow-sm border-l-4 border-l-indigo-600'
                                            : ''}
                                    `}
                                >
                                    <item.icon className={`h-5 w-5 ${activeTab === item.id || (item.id === 'attendance' && pathname === '/dashboard/teacher/attendance') ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ตั้งค่าระบบ</p>

                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-3 h-10 rounded-none text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                </Button>
            </div>
        </div>
    );
}
