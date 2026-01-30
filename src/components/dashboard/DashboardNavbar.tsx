import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, GraduationCap, ShieldCheck, Menu, X, ChevronDown, LayoutDashboard, Settings, Bell } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import ClassRequestsList from './admin/ClassRequestsList';

interface DashboardNavbarProps {
    title?: string;
    role?: 'student' | 'teacher' | 'admin';
    rightContent?: React.ReactNode;
}

import Link from 'next/link';
import Image from 'next/image';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function DashboardNavbar({ title, role = 'student', rightContent }: DashboardNavbarProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Request Notifications for Admin
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        if (role === 'admin' && user) {
            const fetchCount = async () => {
                try {
                    const token = await user.getIdToken();
                    const res = await fetch(API_ENDPOINTS.CLASSES.PENDING_REQUESTS, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setRequestCount(data.length);
                    }
                } catch (error) {
                    console.error('Error fetching request count:', error);
                }
            };
            fetchCount();

            // Optional: Poll every 30 seconds
            const interval = setInterval(fetchCount, 30000);
            return () => clearInterval(interval);
        }
    }, [role, user]);

    const getRoleIcon = () => {
        switch (role) {
            case 'admin': return <ShieldCheck className="h-5 w-5 text-white" />;
            case 'teacher': return <GraduationCap className="h-5 w-5 text-white" />;
            default: return <User className="h-5 w-5 text-white" />;
        }
    };

    const getRoleColor = () => {
        switch (role) {
            case 'admin': return 'bg-red-600';
            case 'teacher': return 'bg-primary'; // Placeholder to avoid error, I will not do replace yet.t
            default: return 'bg-secondary'; // Cyan/Sky
        }
    };

    return (
        <>
            {/* Top Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-orange-500 sticky top-0 z-[51]" />

            <nav className="sticky top-1.5 z-50 h-20 w-full transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-indigo-100 dark:border-slate-800 shadow-sm">
                <div className="container mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
                    {/* LEFT: School Brand */}
                    <Link href="/dashboard/student" className="flex items-center gap-3 group">
                        <div className="relative h-12 w-12 transition-transform group-hover:scale-105">
                            <Image
                                src="/logo.png"
                                alt="EQ.Science Logo"
                                fill
                                sizes="48px"
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-bold text-lg text-indigo-900 dark:text-white leading-tight">
                                EQ SCIENCE
                            </h1>
                            <span className="text-xs font-medium text-orange-500 tracking-wide">
                                ระบบจัดการผลสัมฤทธิ์นักเรียน
                            </span>
                        </div>
                    </Link>

                    {/* RIGHT: User Info & Actions */}
                    <div className="flex items-center gap-6">

                        {/* User Profile Section (Hidden on mobile, pushed to menu) */}
                        <div className="hidden md:flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700">
                            <div className="text-right hidden lg:block">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">
                                    {user?.displayName || 'ผู้ใช้งาน'}
                                </p>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${role === 'student' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {role}
                                </span>
                            </div>
                            <div className={`h-10 w-10 rounded-full ${getRoleColor()} p-0.5 ring-2 ring-white shadow-md cursor-pointer hover:scale-105 transition-transform`}>
                                <div className="h-full w-full rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        getRoleIcon()
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-2">
                            {/* Admin Notification Bell */}
                            {role === 'admin' && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-indigo-50 text-slate-500 hover:text-indigo-600">
                                            <Bell className="h-5 w-5" />
                                            {requestCount > 0 && (
                                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 mr-4 mt-2 shadow-xl border-slate-100" align="end">
                                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                            <h4 className="font-semibold text-sm text-slate-800">คำขอลงทะเบียนเรียน</h4>
                                        </div>
                                        <ClassRequestsList user={user} onRequestsUpdate={setRequestCount} />
                                    </PopoverContent>
                                </Popover>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="rounded-full hover:bg-slate-100 text-slate-500 gap-2">
                                        <span className="text-sm">เมนู</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 glass-card p-2 animate-in fade-in-up duration-200">
                                    <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">บัญชีผู้ใช้</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-slate-200/50" />
                                    <DropdownMenuItem className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50" onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        {t('logout')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden flex items-center gap-2">
                            {rightContent}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="bg-white/50 backdrop-blur-sm"
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl animate-in fade-in pt-24 px-6 md:hidden">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                            <div className={`h-12 w-12 rounded-2xl ${getRoleColor()} flex items-center justify-center shadow-lg`}>
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover rounded-2xl" />
                                ) : (
                                    getRoleIcon()
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.displayName || 'User'}</h2>
                                <p className="text-sm text-slate-500 capitalize">{role}</p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Button variant="outline" className="justify-start h-12 text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                                <LayoutDashboard className="mr-3 h-5 w-5" />
                                Dashboard
                            </Button>
                            <Button variant="outline" className="justify-start h-12 text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                                <Settings className="mr-3 h-5 w-5" />
                                Student Profile
                            </Button>
                        </div>

                        <Button
                            variant="destructive"
                            className="w-full h-12 text-lg font-medium shadow-lg shadow-red-500/20"
                            onClick={logout}
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            {t('logout')}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
