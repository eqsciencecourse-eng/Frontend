import { Button } from "@/components/ui/button";
import { Users, FileText, Settings, ShieldCheck, UserCog, LogOut, CalendarCheck, Bell, Award, UserPlus, GraduationCap, FileSpreadsheet, BarChart3, Info, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { canAccessAccounting } from "@/lib/admin";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    teachingHighlight?: boolean;
}

export default function AdminSidebar({ activeTab, onTabChange, isSidebarOpen, onToggleSidebar, teachingHighlight }: AdminSidebarProps) {
    const { t, setLanguage, language } = useLanguage();
    const { logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showChangelog, setShowChangelog] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                onToggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggleSidebar]);

    const handleTabClick = (id: string) => {
        if (id === 'accounting') {
            if (!canAccessAccounting(user)) return;
            router.push('/dashboard/admin/accounting');
        } else if (id === 'registry') {
            router.push('/dashboard/admin/registry');
        } else if (id === 'manage-scores') {
            router.push('/dashboard/admin/manage-scores');
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
                { id: 'create-user', label: 'สร้างบัญชีผู้เรียน', icon: UserPlus },
                { id: 'manage-users', label: 'จัดการข้อมูลผู้เรียน', icon: Users },
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
            title: 'ระบบจัดการคะแนน',
            items: [
                { id: 'manage-scores', label: 'จัดการผลคะแนน', icon: BarChart3, newBadge: true },
            ]
        },
        {
            title: 'ระบบบัญชี',
            items: canAccessAccounting(user) ? [
                { id: 'accounting', label: 'จัดการบัญชี', icon: FileText, neonBlue: true },
            ] : [
                { id: 'accounting', label: 'จัดการบัญชี', icon: FileText, disabled: true, neonBlue: true },
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
        <div className={`${isSidebarOpen ? 'w-64' : 'w-12'} bg-white border-r h-screen overflow-y-auto fixed left-0 top-0 flex flex-col shadow-sm z-50 transition-all duration-300`}>
            {/* Toggle Button */}
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} h-12 bg-slate-100 border-b border-slate-200 ${teachingHighlight ? 'bg-blue-50' : ''}`}>
                {isSidebarOpen && (
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เมนู</span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className={`${isSidebarOpen ? 'h-8 w-8' : 'h-10 w-10'} rounded-none text-slate-600 hover:text-primary hover:bg-slate-200 transition-all ${teachingHighlight ? 'animate-pulse ring-2 ring-blue-400 ring-offset-2 bg-blue-100 text-blue-700' : ''}`}
                    title={isSidebarOpen ? 'ปิดแท็บเมนู' : 'เปิดแท็บเมนู'}
                >
                    {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
            </div>

            {isSidebarOpen && (<>
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
                        {user?.photoURL ? (
                            <AvatarImage src={user.photoURL} className="rounded-none" />
                        ) : null}
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
                            {group.items.map((item: any) => {
                                const isNew = item.newBadge;
                                const isNeon = item.neonBlue;
                                const goldBorder = isNew ? 'border-2 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.6)]' : 'border border-transparent';
                                const goldBg = isNew ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50' : '';
                                const neonBorder = isNeon ? 'border-2 border-sky-400 animate-neon-blue' : '';
                                const neonBg = isNeon ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50' : '';
                                return (
                                <Button
                                    key={item.id}
                                    variant="ghost"
                                    onClick={() => handleTabClick(item.id)}
                                    disabled={item.disabled}
                                    className={`w-full justify-start gap-3 h-10 rounded-none transition-all relative overflow-hidden
                                        ${goldBorder} ${goldBg} ${neonBorder} ${neonBg}
                                        ${item.disabled
                                            ? 'text-slate-300 cursor-not-allowed opacity-50'
                                            : activeTab === item.id
                                                ? 'bg-white text-primary font-semibold border-slate-200 shadow-sm'
                                                : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                                        }`}
                                    title={item.disabled ? 'ไม่สามารถเข้าใช้งานระบบนี้ได้' : item.label}
                                >
                                    {isNew && (<>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent animate-shimmer-gold" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-gold" style={{ animationDirection: 'reverse', animationDuration: '2.4s' }} />
                                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-200/10 via-transparent to-yellow-200/10" />
                                        <div className="absolute inset-0 animate-gold-pulse" />
                                        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-yellow-300 rounded-full animate-sparkle" style={{ animationDelay: '0.2s' }} />
                                        <div className="absolute top-1/4 -left-0.5 h-1.5 w-1.5 bg-yellow-200 rounded-full animate-sparkle" style={{ animationDelay: '0.8s' }} />
                                        <div className="absolute bottom-1/3 right-1 h-1.5 w-1.5 bg-yellow-100 rounded-full animate-sparkle" style={{ animationDelay: '1.6s' }} />
                                        <div className="absolute top-1/3 left-1/4 h-1 w-1 bg-amber-300 rounded-full animate-sparkle" style={{ animationDelay: '2.4s' }} />
                                    </>)}
                                    {isNeon && (<>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-300/30 to-transparent animate-neon-sweep" />
                                        <div className="absolute -inset-1 bg-sky-400/10 blur-sm animate-neon-pulse rounded-none" />
                                    </>)}
                                    <item.icon className={`h-5 w-5 ${item.disabled ? 'text-slate-300' : activeTab === item.id ? 'text-primary' : 'text-slate-400'}`} />
                                    {item.label}
                                    {isNew && (
                                        <span className="ml-auto bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-none shadow-sm tracking-wide">
                                            NEW!
                                        </span>
                                    )}
                                </Button>
                            )})}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ตั้งค่าระบบ</p>

                <Button
                    variant="ghost"
                    onClick={() => setShowChangelog(true)}
                    className="w-full justify-start gap-3 h-9 rounded-none text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800 text-xs"
                >
                    <Info className="h-4 w-4" />
                    เวอร์ชั่น V.2.3.0
                </Button>

                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-3 h-10 rounded-none text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                </Button>
            </div>
            </>)}

            {/* Changelog Dialog */}
            <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
                <DialogContent className="max-w-lg p-0 overflow-hidden" hideCloseButton>
                    <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <Info className="h-4 w-4 text-white" />
                                </div>
                                <DialogTitle className="text-xl font-bold text-slate-800 m-0">อัปเดต V.2.3.0</DialogTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowChangelog(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="px-6 py-6 space-y-5 text-sm text-slate-700">
                        <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 p-5">
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

                        <div className="bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
                            <p>วันที่อัปเดต: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="mt-1">© EQ Science Learning Center — สงวนลิขสิทธิ์</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
