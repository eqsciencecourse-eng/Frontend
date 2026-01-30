'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, Eye, UserCheck, GraduationCap, School, ShieldAlert, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface User {
    _id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: 'student' | 'teacher' | 'admin';
    isApproved: boolean;
    createdAt: string;
    studentClass?: string;
    studentName?: string;
    parentName?: string;
    educationLevel?: string;
    studyTimes?: string[];
    enrolledSubjects?: string[];
    school?: string;
    registeredClasses?: { className: string; classTime: string; }[];
    authorizedSubjects?: string[];
}

const EDUCATION_LEVEL_MAP: Record<string, string> = {
    'k1': 'อนุบาล 1', 'k2': 'อนุบาล 2', 'k3': 'อนุบาล 3',
    'p1': 'ประถมศึกษาปีที่ 1', 'p2': 'ประถมศึกษาปีที่ 2', 'p3': 'ประถมศึกษาปีที่ 3',
    'p4': 'ประถมศึกษาปีที่ 4', 'p5': 'ประถมศึกษาปีที่ 5', 'p6': 'ประถมศึกษาปีที่ 6',
    'm1': 'มัธยมศึกษาปีที่ 1', 'm2': 'มัธยมศึกษาปีที่ 2', 'm3': 'มัธยมศึกษาปีที่ 3',
    'm4': 'มัธยมศึกษาปีที่ 4', 'm5': 'มัธยมศึกษาปีที่ 5', 'm6': 'มัธยมศึกษาปีที่ 6',
    'vc1': 'ปวช.1', 'vc2': 'ปวช.2', 'vc3': 'ปวช.3',
    'bachelor': 'ปริญญาตรี', 'master': 'ปริญญาโท', 'doctorate': 'ปริญญาเอก',
    'general': 'บุคคลทั่วไป', 'other': 'อื่นๆ'
};

export default function AllUsersManagement() {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'admin'>('student');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const fetchAllUsers = async () => {
        if (!currentUser) return;

        try {
            const token = await currentUser.getIdToken();

            const response = await fetch(API_ENDPOINTS.ADMIN.USERS, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data);

            // Extract subjects for filter
            const subjects = new Set<string>();
            data.forEach((u: User) => {
                u.enrolledSubjects?.forEach(s => subjects.add(s));
                u.registeredClasses?.forEach(c => subjects.add(c.className));
            });
            setAvailableSubjects(Array.from(subjects));

        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    useEffect(() => {
        let filtered = users;

        // 1. Filter by Active Tab (Role)
        filtered = filtered.filter(u => u.role === activeTab);

        // 2. Filter out pending teachers if viewing teachers (they are in another menu)
        if (activeTab === 'teacher') {
            filtered = filtered.filter(u => u.isApproved);
        }

        // 3. Subject Filter (Only for Students)
        if (activeTab === 'student' && subjectFilter !== 'all') {
            filtered = filtered.filter(user =>
                user.enrolledSubjects?.includes(subjectFilter) ||
                user.registeredClasses?.some(c => c.className === subjectFilter)
            );
        }

        // 4. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.displayName?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.studentName?.toLowerCase().includes(query) ||
                user.studentClass?.toLowerCase().includes(query)
            );
        }

        setFilteredUsers(filtered);
    }, [searchQuery, activeTab, subjectFilter, users]);

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setShowDetails(true);
    };

    const getStats = () => {
        const totalStudents = users.filter(u => u.role === 'student').length;
        const totalTeachers = users.filter(u => u.role === 'teacher' && u.isApproved).length;
        const totalAdmins = users.filter(u => u.role === 'admin').length;

        return { totalStudents, totalTeachers, totalAdmins };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8">
                {/* Header / Role Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => { setActiveTab('student'); setSubjectFilter('all'); }}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-none border transition-all duration-200",
                            activeTab === 'student'
                                ? "bg-white border-indigo-600 shadow-sm"
                                : "bg-white border-slate-200 hover:border-indigo-300"
                        )}
                    >
                        <div className={cn("p-3 rounded-none mb-3 border", activeTab === 'student' ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-100 text-slate-500")}>
                            <GraduationCap className="h-8 w-8" />
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{stats.totalStudents}</span>
                        <span className="text-sm font-medium text-slate-500 mt-1">นักเรียนทั้งหมด</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-none border transition-all duration-200",
                            activeTab === 'teacher'
                                ? "bg-white border-orange-500 shadow-sm"
                                : "bg-white border-slate-200 hover:border-orange-300"
                        )}
                    >
                        <div className={cn("p-3 rounded-none mb-3 border", activeTab === 'teacher' ? "bg-orange-50 border-orange-100 text-orange-600" : "bg-slate-50 border-slate-100 text-slate-500")}>
                            <School className="h-8 w-8" />
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{stats.totalTeachers}</span>
                        <span className="text-sm font-medium text-slate-500 mt-1">ครูทั้งหมด</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('admin')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-none border transition-all duration-200",
                            activeTab === 'admin'
                                ? "bg-white border-red-600 shadow-sm"
                                : "bg-white border-slate-200 hover:border-red-300"
                        )}
                    >
                        <div className={cn("p-3 rounded-none mb-3 border", activeTab === 'admin' ? "bg-red-50 border-red-100 text-red-600" : "bg-slate-50 border-slate-100 text-slate-500")}>
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{stats.totalAdmins}</span>
                        <span className="text-sm font-medium text-slate-500 mt-1">ผู้ดูแลระบบ</span>
                    </button>
                </div>

                {/* Main Content Area */}
                <Card className="shadow-sm border-slate-200 bg-white rounded-none">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {activeTab === 'student' && <><GraduationCap className="h-6 w-6 text-indigo-600" /> รายชื่อนักเรียน</>}
                                    {activeTab === 'teacher' && <><School className="h-6 w-6 text-orange-600" /> รายชื่อครู</>}
                                    {activeTab === 'admin' && <><ShieldAlert className="h-6 w-6 text-red-600" /> รายชื่อผู้ดูแลระบบ</>}
                                </CardTitle>
                                <CardDescription>
                                    แสดงรายชื่อ{activeTab === 'student' ? 'นักเรียน' : activeTab === 'teacher' ? 'ครู' : 'ผู้ดูแลระบบ'}ทั้งหมดในระบบ
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-none border border-slate-200">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={`ค้นหาชื่อ${activeTab === 'student' ? ', ชั้นเรียน' : ''}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 bg-white border-slate-200 focus:border-indigo-500 rounded-none"
                                />
                            </div>

                            {/* Subject Filter - Only for Students */}
                            {activeTab === 'student' && (
                                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                    <SelectTrigger className="w-full md:w-[250px] h-10 bg-white border-slate-200 rounded-none">
                                        <BookOpen className="h-4 w-4 mr-2 text-slate-500" />
                                        <SelectValue placeholder="กรองตามวิชาเรียน" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="all">ทุกวิชา</SelectItem>
                                        {availableSubjects.map(subj => (
                                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Table */}
                        <div className="rounded-none border border-slate-200 overflow-hidden bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">ชื่อ - นามสกุล</th>
                                        {activeTab === 'student' && <th className="px-6 py-4">ระดับชั้น</th>}
                                        {activeTab === 'teacher' && <th className="px-6 py-4">วิชาที่สอน</th>}
                                        <th className="px-6 py-4 text-right">รายละเอียด</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-8 w-8 opacity-20" />
                                                    <span>ไม่พบข้อมูลผู้ใช้</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-10 w-10 border border-slate-200 rounded-none">
                                                            <AvatarImage src={user.photoURL} />
                                                            <AvatarFallback className={cn(
                                                                "font-bold text-sm rounded-none",
                                                                activeTab === 'student' ? "bg-indigo-50 text-indigo-600" :
                                                                    activeTab === 'teacher' ? "bg-orange-50 text-orange-600" :
                                                                        "bg-red-50 text-red-600"
                                                            )}>
                                                                {user.displayName?.[0] || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-slate-900">
                                                                {user.studentName || user.displayName || 'ไม่มีชื่อ'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {activeTab === 'student' && (
                                                    <td className="px-6 py-4">
                                                        {user.educationLevel ? (
                                                            <Badge variant="outline" className="font-normal bg-white text-slate-600 border-slate-200 rounded-none">
                                                                {EDUCATION_LEVEL_MAP[user.educationLevel] || user.educationLevel}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {activeTab === 'teacher' && (
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.authorizedSubjects && user.authorizedSubjects.length > 0 ? (
                                                                user.authorizedSubjects.map((subj, i) => (
                                                                    <Badge key={i} variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100 rounded-none">
                                                                        {subj}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-none"
                                                        onClick={() => handleViewDetails(user)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* User Details Dialog (Read Only) */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border border-slate-200 rounded-none shadow-lg" aria-describedby="user-details-description">
                    <DialogTitle className="sr-only">รายละเอียดผู้ใช้งาน</DialogTitle>
                    <DialogDescription id="user-details-description" className="sr-only">
                        แสดงข้อมูลรายละเอียดของผู้ใช้งานที่เลือก
                    </DialogDescription>
                    {selectedUser && (
                        <div>
                            {/* Header */}
                            <div className={cn(
                                "p-8 pb-6 text-center relative border-b border-slate-100",
                                "bg-white"
                            )}>
                                <div className="relative z-10 flex flex-col items-center">
                                    <Avatar className="h-24 w-24 border-4 border-slate-50 shadow-sm mb-4 rounded-none">
                                        <AvatarImage src={selectedUser.photoURL} />
                                        <AvatarFallback className="text-3xl bg-slate-100 text-slate-500 rounded-none">
                                            {selectedUser.displayName?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                                        {selectedUser.studentName || selectedUser.displayName || 'ไม่มีชื่อ'}
                                    </h2>
                                    <p className="text-slate-500 text-sm font-medium">{selectedUser.email}</p>
                                    <div className="mt-4">
                                        <Badge className={cn(
                                            "border rounded-none px-4 py-1.5 text-sm font-normal",
                                            selectedUser.role === 'student' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                                selectedUser.role === 'teacher' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                    "bg-slate-100 text-slate-700 border-slate-200"
                                        )}>
                                            {selectedUser.role === 'student' ? 'นักเรียน' : selectedUser.role === 'teacher' ? 'ครูผู้สอน' : 'ผู้ดูแลระบบ'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6 bg-white">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-none border border-slate-200">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">วันที่สมัคร</span>
                                        <span className="text-slate-700 font-medium text-sm">
                                            {new Date(selectedUser.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-none border border-slate-200">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">สถานะ</span>
                                        <span className="text-emerald-600 font-medium text-sm flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" /> อนุมัติแล้ว
                                        </span>
                                    </div>
                                </div>

                                {/* Detailed Info List */}
                                <div className="space-y-4">
                                    {selectedUser.role === 'student' && (
                                        <>
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-slate-500 text-sm">โรงเรียน</span>
                                                <span className="font-medium text-slate-800 text-sm">{selectedUser.school || '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-slate-500 text-sm">ระดับชั้น</span>
                                                <span className="font-medium text-slate-800 text-sm">
                                                    {selectedUser.educationLevel ? (EDUCATION_LEVEL_MAP[selectedUser.educationLevel] || selectedUser.educationLevel) : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-slate-500 text-sm">ผู้ปกครอง</span>
                                                <span className="font-medium text-slate-800 text-sm">{selectedUser.parentName || '-'}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Subjects List */}
                                    <div className="pt-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                                            {selectedUser.role === 'teacher' ? 'วิชาที่สอน' : 'วิชาที่ลงทะเบียน'}
                                        </span>
                                        <div className="space-y-2">
                                            {(() => {
                                                if (selectedUser.role === 'teacher') {
                                                    return selectedUser.authorizedSubjects?.map((subj, i) => (
                                                        <div key={i} className="flex items-center gap-2 p-3 bg-orange-50 rounded-none border border-orange-100">
                                                            <div className="w-2 h-2 rounded-none bg-orange-400"></div>
                                                            <span className="text-sm font-medium text-slate-700">{subj}</span>
                                                        </div>
                                                    ));
                                                }

                                                // Student Subjects
                                                let displayClasses: { className: string; classTime: string; }[] = [];
                                                if (selectedUser.registeredClasses && selectedUser.registeredClasses.length > 0) {
                                                    displayClasses = selectedUser.registeredClasses;
                                                } else if (selectedUser.enrolledSubjects && selectedUser.enrolledSubjects.length > 0) {
                                                    displayClasses = selectedUser.enrolledSubjects.map((subj, idx) => ({
                                                        className: subj,
                                                        classTime: selectedUser.studyTimes?.[idx] || 'ไม่ระบุเวลา'
                                                    }));
                                                }

                                                if (displayClasses.length === 0) {
                                                    return <div className="text-slate-400 text-sm italic text-center py-2">ไม่มีข้อมูล</div>;
                                                }

                                                return displayClasses.map((cls, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 bg-indigo-50 rounded-none border border-indigo-100">
                                                        <span className="text-sm font-medium text-slate-700">{cls.className}</span>
                                                        <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded-none border border-indigo-100">{cls.classTime}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Note */}
                                <div className="pt-4 text-center">
                                    <p className="text-xs text-slate-400">
                                        *แก้ไขข้อมูลได้ที่เมนู "จัดการผู้ใช้"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
