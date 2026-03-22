import { Button } from "@/components/ui/button";
import { Users, FileText, Settings, ShieldCheck, UserCog, LogOut, CalendarCheck, Bell, Award, UserPlus, GraduationCap, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
    const { t, setLanguage, language } = useLanguage();
    const { logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const handleTabClick = (id: string) => {
        if (id === 'accounting') {
            router.push('/dashboard/admin/accounting');
        } else if (id === 'registry') {
            router.push('/dashboard/admin/registry');
        } else {
            // If we are NOT on the main dashboard, navigate there with the tab param
            if (pathname !== '/dashboard/admin') {
                router.push(`/dashboard/admin?tab=${id}`);
            } else {
                onTabChange(id);
            }
        }
    };

    const menuGroups = [
        {
            title: 'ระบบนักเรียน/ผู้ใช้',
            items: [
                { id: 'create-user', label: 'ระบบสร้างบัญชีนักเรียนใหม่', icon: UserPlus },
                { id: 'manage-users', label: 'ระบบจัดการข้อมูลผู้ใช้', icon: Users },
            ]
        },
        {
            title: 'ระบบครู',
            items: [
                { id: 'users', label: 'ระบบสร้างบัญชีครู', icon: GraduationCap },
                { id: 'manage-teachers', label: 'ระบบจัดการครู', icon: Users },
                { id: 'permissions', label: 'กำหนดสิทธิ์ครู', icon: ShieldCheck },
            ]
        },
        {
            title: 'ระบบบัญชี',
            items: [
                { id: 'accounting', label: 'จัดการบัญชี', icon: FileText },
            ]
        },
        {
            title: 'ระบบอื่นๆ',
            items: [
                { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
                { id: 'send-files', label: 'ระบบส่งเกียรติบัตร', icon: Award },
                { id: 'attendance', label: 'ระบบเช็คชื่อ', icon: CalendarCheck },
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
                    <div className="h-10 w-10 bg-primary rounded-none flex items-center justify-center text-white font-bold text-xl shadow-sm">
                        EQ
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg leading-tight">EQ SCIENCE</h1>
                        <p className="text-xs text-slate-500">ระบบจัดการผู้ดูแล</p>
                    </div>
                </div>

                {/* Admin Profile */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-none border border-slate-200">
                    <Avatar className="h-10 w-10 border border-slate-200 rounded-none">
                        <AvatarImage src={user?.photoURL || ''} className="rounded-none" />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-none">AD</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'Admin'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ผู้ดูแลระบบ</p>
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
                                    className={`w-full justify-start gap-3 h-10 rounded-none text-slate-600 hover:text-primary hover:bg-slate-50 transition-all border border-transparent
                                        ${activeTab === item.id ? 'bg-white text-primary font-semibold border-slate-200 shadow-sm' : ''}
                                    `}
                                >
                                    <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-primary' : 'text-slate-400'}`} />
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
