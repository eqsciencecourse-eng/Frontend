'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Trophy, Settings, User, Clock, ChevronRight, Zap, Sparkles, Star, Download, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

export default function StudentDashboard() {
    const { user, loading } = useAuth();

    // Data State
    const [grades, setGrades] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Modal States
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

                    // Determine Subjects
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

    // --- Statistics Logic ---
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

    // Name Resolution Logic
    const displayName = useMemo(() => {
        if (userProfile?.displayName && userProfile.displayName.trim() !== '') return userProfile.displayName;
        if (userProfile?.firstName && userProfile?.lastName) return `${userProfile.firstName} ${userProfile.lastName}`;
        if (user?.displayName && user.displayName.trim() !== '') return user.displayName;
        if (userProfile?.username) return userProfile.username;
        return 'นักเรียน'; // Fallback
    }, [user, userProfile]);

    const displaySubtext = useMemo(() => {
        const parts = [];
        if (userProfile?.studentId) parts.push(`ID: ${userProfile.studentId}`);
        if (userProfile?.nickname) parts.push(`ชื่อเล่น: ${userProfile.nickname}`);
        return parts.length > 0 ? parts.join(' • ') : 'Student';
    }, [userProfile]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Animation Variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 300, damping: 24 } as any
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans pb-24 selection:bg-indigo-200 selection:text-indigo-900">
            <DashboardNavbar role="student" />

            {/* Subtle Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[80px] mix-blend-multiply animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] mix-blend-multiply animate-pulse delay-1000" />
            </div>

            <motion.main
                className="relative container mx-auto px-4 pt-8 max-w-lg md:max-w-5xl z-10"
                initial="hidden" animate="visible" variants={containerVariants}
            >
                {/* Header Profile */}
                <motion.div variants={itemVariants} className="flex items-center gap-5 mb-10">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        className="h-20 w-20 rounded-full bg-white shadow-lg p-1 overflow-hidden border-2 border-white ring-4 ring-indigo-50"
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <User className="w-8 h-8 text-slate-300" />
                            </div>
                        )}
                    </motion.div>
                    <div>
                        <motion.h1
                            className="text-3xl font-extrabold text-slate-800 tracking-tight"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        >
                            {displayName}
                        </motion.h1>
                        <motion.div
                            className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-sm"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                        >
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-semibold text-slate-600">{displaySubtext}</span>
                        </motion.div>
                    </div>
                </motion.div>


                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm w-full flex justify-between gap-1 sticky top-20 z-30">
                        {['overview', 'files', 'evaluation', 'history'].map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md text-slate-500 py-3 font-semibold transition-all duration-300 capitalize"
                            >
                                {tab === 'overview' ? 'คอร์สเรียน' : tab === 'files' ? 'เกียรติบัตร' : tab === 'evaluation' ? 'การประเมิน' : 'ประวัติ'}
                            </TabsTrigger>
                        ))}
                        <TabsTrigger
                            value="settings"
                            className="w-12 h-12 p-0 flex items-center justify-center rounded-xl text-slate-400 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all duration-300"
                        >
                            <Settings className="w-5 h-5" />
                        </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="min-h-[300px]"
                        >
                            <TabsContent value="overview" className="space-y-4 pt-2">
                                {unifiedCourses.map((course: any, idx) => {
                                    const percentage = course.totalSessions > 0 ? Math.min(100, (course.usedSessions / course.totalSessions) * 100) : 0;
                                    const isActive = !course.isExpired;

                                    return (
                                        <Card key={idx} className="border-none shadow-md bg-white rounded-3xl p-6 hover:shadow-xl transition-shadow duration-300 group cursor-default relative overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{course.subject}</h3>
                                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                                        <User className="w-4 h-4 text-indigo-400" />
                                                        {course.teacherName !== '-' ? course.teacherName : 'ไม่ระบุครู'}
                                                    </p>
                                                </div>
                                                {isActive ? (
                                                    <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-none shadow-sm px-3 py-1">กำลังเรียน</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-slate-500 bg-slate-100">จบแล้ว</Badge>
                                                )}
                                            </div>

                                            {course.totalSessions > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                        <span>Progress</span>
                                                        <span>{Math.round(percentage)}%</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            whileInView={{ width: `${percentage}%` }}
                                                            viewport={{ once: true }}
                                                            transition={{ duration: 1.2, ease: "circOut" }}
                                                            className={`h-full rounded-full ${isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-400'}`}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {course.day !== '-' || course.time !== '-' ? `${course.day} ${course.time}` : 'ยังไม่ระบุเวลา'}
                                                        </div>
                                                        <p className="text-right text-xs text-slate-400 font-medium">{course.usedSessions}/{course.totalSessions} ครั้ง</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 text-sm text-slate-600">
                                                    <Clock className="w-5 h-5 text-indigo-400" />
                                                    <span className="font-medium">{course.day !== '-' || course.time !== '-' ? `${course.day} • ${course.time}` : 'ยังไม่ระบุเวลา'}</span>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                                {unifiedCourses.length === 0 && (
                                    <div className="text-center py-24 opacity-40">
                                        <BookOpen className="w-20 h-20 mx-auto mb-4 text-slate-300" />
                                        <p className="text-lg font-bold text-slate-400">ยังไม่มีคอร์สเรียน</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="files" className="pt-2">
                                <div className="space-y-6">
                                    {/* Academic Certificates Section */}
                                    {grades.filter((g: any) => g.isComplete).length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">เกียรติบัตรวิชาการ (Academic Certificates)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {grades.filter(g => g.isComplete).map((grade, idx) => (
                                                    <motion.div
                                                        key={`cert-${idx}`}
                                                        whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => {
                                                            setSelectedGradeForCert(grade);
                                                            setIsCertificateModalOpen(true);
                                                        }}
                                                        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 shadow-lg cursor-pointer group relative overflow-hidden"
                                                    >
                                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
                                                        <div className="absolute top-4 right-4">
                                                            <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                                                        </div>

                                                        <div className="flex items-center gap-4 relative z-10 text-white">
                                                            <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                                                                <Award className="w-8 h-8 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-bold text-white text-sm truncate">{grade.subjectName}</h5>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-transparent text-[10px] px-2">Grade: {grade.finalGrade}</Badge>
                                                                    <span className="text-xs text-indigo-100">{grade.certificateIssuedAt ? new Date(grade.certificateIssuedAt).toLocaleDateString() : '-'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                                                <Download className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Uploaded Files Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">ไฟล์เอกสารอื่นๆ (Other Documents)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {files.length === 0 && grades.filter(g => g.isComplete).length === 0 && (
                                                <div className="col-span-full py-20 text-center opacity-30">
                                                    <BookOpen className="w-16 h-16 mx-auto mb-3" />
                                                    <p>ยังไม่มีเอกสาร</p>
                                                </div>
                                            )}
                                            {files.map((file) => (
                                                <motion.div
                                                    key={file._id}
                                                    whileHover={{ y: -4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/files/download/${file.filename}`)}
                                                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 cursor-pointer group relative overflow-hidden"
                                                >
                                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-400/10 rounded-full group-hover:bg-yellow-400/20 transition-colors" />

                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className="h-14 w-14 bg-gradient-to-br from-yellow-100 to-orange-100 text-yellow-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                            <Trophy className="w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-bold text-slate-800 text-sm truncate">{file.originalName}</h5>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 text-[10px] px-2">Document</Badge>
                                                                <span className="text-xs text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="evaluation" className="pt-2">
                                <StudentEvaluationChart studentId={user?.uid} />
                            </TabsContent>

                            <TabsContent value="history" className="pt-2">
                                <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
                                    <AttendanceHistoryTable history={attendanceHistory} studentId={user?.uid || user?.id || ''} studentName={user?.displayName || ''} />
                                </Card>
                            </TabsContent>

                            <TabsContent value="settings" className="pt-2">
                                <Card className="border-none shadow-md bg-white rounded-3xl p-8">
                                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                            <Settings className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">แก้ไขข้อมูลส่วนตัว</h2>
                                    </div>
                                    <EditProfileForm />
                                </Card>
                            </TabsContent>

                        </motion.div>
                    </AnimatePresence>

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
                </Tabs>
            </motion.main>
        </div>
    );
}
