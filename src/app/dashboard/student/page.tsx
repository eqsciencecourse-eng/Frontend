'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

import { BookOpen, Trophy, Settings, User, Clock, ChevronRight, Zap, Sparkles, Star, Download, Award, Home, FileText, BarChart3, History, Menu, X as XIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import EditProfileForm from '@/components/dashboard/student/EditProfileForm';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import PDFReportView from '@/components/dashboard/student/PDFReportView';
import { API_ENDPOINTS } from '@/lib/api-config';
import AttendanceHistoryTable from '@/components/dashboard/student/AttendanceHistoryTable';
import StudentEvaluationChart from '@/components/dashboard/student/StudentEvaluationChart';

const OfficialReportDownloadModal = dynamic(() => import('@/components/dashboard/student/OfficialReportDownloadModal'), {
    loading: () => null,
    ssr: false
});

const CertificatePreviewModal = dynamic(() => import('@/components/dashboard/student/CertificatePreviewModal'), {
    loading: () => null,
    ssr: false
});

const TAB_CONFIG = [
    { key: 'overview', label: 'คอร์สเรียน', icon: Home },
    { key: 'files', label: 'เกียรติบัตร', icon: Award },
    { key: 'evaluation', label: 'ประเมินผล', icon: BarChart3 },
    { key: 'history', label: 'ประวัติ', icon: History },
    { key: 'settings', label: 'ตั้งค่า', icon: Settings },
];

export default function StudentDashboard() {
    const { user, loading } = useAuth();
    const [grades, setGrades] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const [isOfficialReportOpen, setIsOfficialReportOpen] = useState(false);
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [selectedGradeForCert, setSelectedGradeForCert] = useState<any>(null);
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [pdfData, setPdfData] = useState<any>(null);

    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const fetchData = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [gradesRes, filesRes, profileRes, attendanceRes] = await Promise.all([
                fetch(API_ENDPOINTS.GRADES.MY_GRADES, { headers }),
                fetch(API_ENDPOINTS.FILES.USER(user.uid), { headers }),
                fetch(API_ENDPOINTS.USERS.PROFILE, { headers }),
                fetch(API_ENDPOINTS.ATTENDANCE.MY_HISTORY, { headers })
            ]);

            if (isMounted.current) {
                let gradesData: any[] = [];
                if (gradesRes.ok) {
                    gradesData = await gradesRes.json();
                    setGrades(gradesData);
                }

                if (filesRes.ok) setFiles(await filesRes.json());
                if (attendanceRes.ok) setAttendanceHistory(await attendanceRes.json());

                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    setUserProfile(profile);
                    const gradeSubjects = Array.from(new Set(gradesData.map((g: any) => g.subjectName || g.subject || g.className).filter(Boolean)));
                    const subjectSources = [
                        gradeSubjects,
                        profile?.enrolledSubjects || [],
                        profile?.registeredClasses?.map((c: any) => c.className) || [],
                        profile?.registeredCourses?.map((c: any) => c.subject) || []
                    ];
                    setAvailableSubjects(Array.from(new Set(subjectSources.flat().filter(Boolean))) as string[]);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => { if (user) fetchData(); }, [user]);

    const attendedCount = useMemo(() => {
        if (!attendanceHistory || !userProfile || !user) return 0;
        const targetId = userProfile?.mongoId || userProfile?._id?.toString() || user.uid;
        return attendanceHistory.reduce((count, record) => {
            const myRecord = record.students?.find((s: any) =>
                (s.studentId && (s.studentId.toString() === targetId || s.studentId === user.uid))
            );
            if (myRecord) {
                const status = (myRecord.status || '').toLowerCase();
                if (status === 'present' || status === 'late' || status === 'มาเรียน' || status === 'มาสาย') {
                    return count + 1;
                }
            }
            return count;
        }, 0);
    }, [attendanceHistory, userProfile, user]);

    const unifiedCourses = useMemo(() => {
        const regCourses = userProfile?.registeredCourses || [];
        const regClasses = userProfile?.registeredClasses || [];
        const studyTimes = userProfile?.studyTimes || [];
        const normalizeSubject = (name: string) => name.replace(/\s*\(Term\s*\d+\)\s*$/i, '').trim();
        const courseGroups = new Map();

        regCourses.forEach((c: any) => {
            if (c.subject) {
                const baseName = normalizeSubject(c.subject);
                const existing = courseGroups.get(baseName);
                const courseData = {
                    subject: baseName,
                    originalSubject: c.subject,
                    day: c.day || '-',
                    time: c.time || '-',
                    startDate: c.startDate,
                    endDate: c.endDate,
                    totalSessions: c.totalSessions,
                    usedSessions: c.usedSessions,
                    teacherName: c.teacherName || '-',
                    isExpired: c.endDate && new Date(c.endDate) < new Date(),
                    source: 'registered_course'
                };
                if (!existing || (!courseData.isExpired && existing.isExpired)) {
                    courseGroups.set(baseName, courseData);
                }
            }
        });

        [...regClasses, ...studyTimes].forEach((c: any) => {
            const name = c.className || c.subjectName;
            if (name) {
                const baseName = normalizeSubject(name);
                if (!courseGroups.has(baseName)) {
                    courseGroups.set(baseName, {
                        subject: baseName,
                        day: c.day || '-',
                        time: c.classTime || (c.startTime ? `${c.startTime}-${c.endTime}` : '-'),
                        teacherName: '-',
                        source: 'legacy'
                    });
                }
            }
        });

        availableSubjects.forEach((sub: string) => {
            const baseName = normalizeSubject(sub);
            if (!courseGroups.has(baseName)) {
                courseGroups.set(baseName, { subject: baseName, day: '-', time: '-', teacherName: '-', source: 'simple_list' });
            }
        });

        return Array.from(courseGroups.values());
    }, [userProfile, availableSubjects]);

    const displayName = useMemo(() => {
        if (userProfile?.displayName && userProfile.displayName.trim() !== '') return userProfile.displayName;
        if (userProfile?.firstName && userProfile?.lastName) return `${userProfile.firstName} ${userProfile.lastName}`;
        if (user?.displayName && user.displayName.trim() !== '') return user.displayName;
        if (userProfile?.username) return userProfile.username;
        return 'นักเรียน';
    }, [user, userProfile]);

    const displaySubtext = useMemo(() => {
        const parts = [];
        if (userProfile?.studentId) parts.push(`ID: ${userProfile.studentId}`);
        if (userProfile?.nickname) parts.push(`ชื่อเล่น: ${userProfile.nickname}`);
        return parts.length > 0 ? parts.join(' • ') : 'Student';
    }, [userProfile]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-b-indigo-300 animate-spin" style={{ animationDuration: '0.8s' }} />
                </div>
            </div>
        );
    }

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
    const itemVariants = {
        hidden: { y: 24, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: { type: 'spring', stiffness: 260, damping: 22 } as any
        }
    };

    const pageVariants = {
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
        exit: { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.2 } }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 font-sans pb-24 md:pb-8 selection:bg-indigo-200 selection:text-indigo-900">
            <DashboardNavbar role="student" />

            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/20 to-purple-300/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-sky-200/20 to-blue-300/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
            </div>

            <motion.main
                className="relative container mx-auto px-3 sm:px-4 md:px-6 pt-4 md:pt-8 max-w-lg md:max-w-5xl z-10"
                initial="hidden" animate="visible" variants={containerVariants}
            >
                {/* Header Profile */}
                <motion.div variants={itemVariants} className="flex items-center gap-3 md:gap-5 mb-6 md:mb-10 bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl p-3 md:p-6 border border-white/50 shadow-sm">
                    <motion.div
                        whileHover={{ scale: 1.08, rotate: 3 }}
                        className="h-14 w-14 md:h-20 md:w-20 rounded-2xl md:rounded-full bg-white shadow-lg p-0.5 md:p-1 overflow-hidden border-2 border-white ring-4 ring-indigo-50 shrink-0"
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} className="w-full h-full object-cover rounded-2xl md:rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center rounded-2xl md:rounded-full">
                                <User className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
                            </div>
                        )}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                        <motion.h1
                            className="text-xl md:text-3xl font-extrabold text-slate-800 tracking-tight truncate"
                            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                        >
                            {displayName}
                        </motion.h1>
                        <motion.div
                            className="inline-flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2 px-2 md:px-3 py-0.5 md:py-1 bg-white/70 backdrop-blur-md rounded-full border border-white/60 shadow-sm"
                            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                        >
                            <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] md:text-sm font-semibold text-slate-600 truncate">{displaySubtext}</span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Tab Content */}
                <div className="pb-20 md:pb-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            variants={pageVariants}
                            initial="initial" animate="animate" exit="exit"
                        >
                            {activeTab === 'overview' && (
                                <div className="space-y-3 md:space-y-4">
                                    {unifiedCourses.map((course: any, idx) => {
                                        const percentage = course.totalSessions > 0 ? Math.min(100, (course.usedSessions / course.totalSessions) * 100) : 0;
                                        const isActive = !course.isExpired;
                                        return (
                                            <motion.div
                                                key={idx}
                                                variants={itemVariants}
                                                initial="hidden" animate="visible"
                                                transition={{ delay: idx * 0.05 }}
                                                whileHover={{ y: -2 }}
                                                className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                                            >
                                                <div className={`absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-gradient-to-b from-indigo-500 to-purple-500' : 'bg-slate-300'}`} />
                                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-base md:text-lg text-slate-800 group-hover:text-indigo-600 transition-colors truncate pr-2">{course.subject}</h3>
                                                        <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5 md:mt-1 font-medium">
                                                            <User className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 shrink-0" />
                                                            <span className="truncate">{course.teacherName !== '-' ? course.teacherName : 'ไม่ระบุครู'}</span>
                                                        </p>
                                                    </div>
                                                    {isActive ? (
                                                        <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-none shadow-sm px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs shrink-0">กำลังเรียน</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-slate-500 bg-slate-100 text-[10px] md:text-xs shrink-0">จบแล้ว</Badge>
                                                    )}
                                                </div>

                                                {course.totalSessions > 0 ? (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                            <span>Progress</span>
                                                            <span>{Math.round(percentage)}%</span>
                                                        </div>
                                                        <div className="h-2 md:h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                whileInView={{ width: `${percentage}%` }}
                                                                viewport={{ once: true }}
                                                                transition={{ duration: 1.2, ease: "circOut" }}
                                                                className={`h-full rounded-full ${isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-400'}`}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
                                                            <div className="flex items-center gap-1.5 text-slate-600 text-[10px] md:text-xs font-semibold bg-indigo-50/80 text-indigo-600 px-2 py-1 rounded-lg w-fit">
                                                                <Clock className="w-3 h-3 md:w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">{course.day !== '-' || course.time !== '-' ? `${course.day} ${course.time}` : 'ยังไม่ระบุเวลา'}</span>
                                                            </div>
                                                            <p className="text-right text-[10px] md:text-xs text-slate-400 font-medium">{course.usedSessions}/{course.totalSessions} ครั้ง</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-50/80 rounded-xl p-2.5 md:p-3 flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600">
                                                        <Clock className="w-4 h-4 md:w-5 h-5 text-indigo-400 shrink-0" />
                                                        <span className="font-medium truncate">{course.day !== '-' || course.time !== '-' ? `${course.day} • ${course.time}` : 'ยังไม่ระบุเวลา'}</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                    {unifiedCourses.length === 0 && (
                                        <motion.div variants={itemVariants} className="text-center py-16 md:py-24 opacity-40">
                                            <BookOpen className="w-16 h-16 md:w-20 h-20 mx-auto mb-3 md:mb-4 text-slate-300" />
                                            <p className="text-base md:text-lg font-bold text-slate-400">ยังไม่มีคอร์สเรียน</p>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-5 md:space-y-6">
                                    {grades.filter((g: any) => g.isComplete).length > 0 && (
                                        <div className="space-y-3 md:space-y-4">
                                            <h4 className="text-[11px] md:text-sm font-bold text-slate-400 uppercase tracking-widest pl-1 md:pl-2">เกียรติบัตรวิชาการ</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                                                {grades.filter(g => g.isComplete).map((grade, idx) => (
                                                    <motion.div
                                                        key={`cert-${idx}`}
                                                        variants={itemVariants}
                                                        initial="hidden" animate="visible"
                                                        transition={{ delay: idx * 0.06 }}
                                                        whileHover={{ y: -3, boxShadow: '0 12px 28px -8px rgba(0, 0, 0, 0.15)' }}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={() => {
                                                            setSelectedGradeForCert(grade);
                                                            setIsCertificateModalOpen(true);
                                                        }}
                                                        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-md cursor-pointer group relative overflow-hidden"
                                                    >
                                                        <div className="absolute -right-4 -bottom-4 w-20 h-20 md:w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
                                                        <div className="absolute top-3 right-3 md:top-4 md:right-4">
                                                            <Sparkles className="w-4 h-4 md:w-5 h-5 text-indigo-200 animate-pulse" />
                                                        </div>

                                                        <div className="flex items-center gap-3 md:gap-4 relative z-10 text-white">
                                                            <div className="h-10 w-10 md:h-14 md:w-14 bg-white/20 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                                                <Award className="w-5 h-5 md:w-8 h-8 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-bold text-white text-xs md:text-sm truncate">{grade.subjectName}</h5>
                                                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                                                                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-transparent text-[8px] md:text-[10px] px-1.5 md:px-2">Grade: {grade.finalGrade}</Badge>
                                                                    <span className="text-[9px] md:text-xs text-indigo-100">{grade.certificateIssuedAt ? new Date(grade.certificateIssuedAt).toLocaleDateString() : '-'}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                                                    {grade.level && (
                                                                        <Badge className="bg-indigo-500/30 text-indigo-200 text-[8px] md:text-[10px] px-1.5 md:px-2 border border-indigo-400/30">
                                                                            {grade.level} {grade.subLevel || ''}
                                                                        </Badge>
                                                                    )}
                                                                    {grade.certificateURL && (
                                                                        <Badge className="bg-emerald-400/30 text-emerald-200 text-[8px] md:text-[10px] px-1.5 md:px-2 border border-emerald-400/30">
                                                                            ออกใบประกาศแล้ว
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shrink-0">
                                                                <Download className="w-3.5 h-3.5 md:w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 md:space-y-4">
                                        <h4 className="text-[11px] md:text-sm font-bold text-slate-400 uppercase tracking-widest pl-1 md:pl-2">ไฟล์เอกสารอื่นๆ</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                                            {files.length === 0 && grades.filter(g => g.isComplete).length === 0 && (
                                                <div className="col-span-full py-12 md:py-20 text-center opacity-30">
                                                    <BookOpen className="w-12 h-12 md:w-16 h-16 mx-auto mb-2 md:mb-3" />
                                                    <p className="text-sm md:text-base">ยังไม่มีเอกสาร</p>
                                                </div>
                                            )}
                                            {files.map((file, idx) => (
                                                <motion.div
                                                    key={file._id}
                                                    variants={itemVariants}
                                                    initial="hidden" animate="visible"
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/files/download/${file.filename}`)}
                                                    className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-sm cursor-pointer group relative overflow-hidden"
                                                >
                                                    <div className="absolute -right-6 -top-6 w-20 h-20 md:w-24 h-24 bg-yellow-400/10 rounded-full group-hover:bg-yellow-400/20 transition-colors" />

                                                    <div className="flex items-center gap-3 md:gap-4 relative z-10">
                                                        <div className="h-10 w-10 md:h-14 md:w-14 bg-gradient-to-br from-yellow-100 to-orange-100 text-yellow-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                                            <Trophy className="w-5 h-5 md:w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-bold text-slate-800 text-xs md:text-sm truncate">{file.originalName}</h5>
                                                            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                                                                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 text-[8px] md:text-[10px] px-1.5 md:px-2">Document</Badge>
                                                                <span className="text-[9px] md:text-xs text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                                            <ChevronRight className="w-3.5 h-3.5 md:w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'evaluation' && (
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/50 shadow-sm">
                                    <StudentEvaluationChart studentId={user?.uid} />
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/50 shadow-sm overflow-hidden">
                                    <AttendanceHistoryTable history={attendanceHistory} studentId={user?.uid || user?.id || ''} studentName={user?.displayName || ''} />
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 md:p-8 border border-white/50 shadow-sm">
                                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 pb-3 md:pb-4 border-b border-slate-100">
                                        <div className="p-1.5 md:p-2.5 bg-indigo-100 text-indigo-600 rounded-lg md:rounded-xl">
                                            <Settings className="w-4 h-4 md:w-6 h-6" />
                                        </div>
                                        <h2 className="text-lg md:text-xl font-bold text-slate-800">แก้ไขข้อมูลส่วนตัว</h2>
                                    </div>
                                    <EditProfileForm />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-xl border-t border-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom">
                <div className="flex items-center justify-around px-1 py-1">
                    {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 min-w-0 flex-1
                                    ${isActive
                                        ? 'text-indigo-600 scale-100'
                                        : 'text-slate-400 hover:text-slate-600 scale-95'
                                    }`}
                            >
                                <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-50 shadow-sm' : ''}`}>
                                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                                </div>
                                <span className={`text-[9px] font-bold mt-0.5 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Tab Bar - Floating Pill */}
            <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg rounded-2xl px-2 py-1.5 flex items-center gap-1">
                    {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md scale-100'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 scale-95'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-xs font-bold whitespace-nowrap">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <OfficialReportDownloadModal
                isOpen={isOfficialReportOpen}
                onClose={() => setIsOfficialReportOpen(false)}
                grades={grades}
                studentName={user?.displayName || 'Student'}
            />

            <CertificatePreviewModal
                isOpen={isCertificateModalOpen}
                onClose={() => setIsCertificateModalOpen(false)}
                grade={selectedGradeForCert}
                studentName={displayName}
            />

            {pdfData && (
                <div className="fixed left-[-9999px] top-0">
                    <PDFReportView user={pdfData.user} data={pdfData.data} stats={pdfData.stats} subjectName={pdfData.subject} />
                </div>
            )}
        </div>
    );
}
