'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchoolSearchInput } from '@/components/ui/SchoolSearchInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, User, Users, GraduationCap, Calendar, Lock, Key, Cpu, Wifi, BarChart3, Cat, Globe, Box, Terminal, Gamepad2, BookOpen, Settings, Edit2, Trash2, X, Plus, Save, School, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const EDUCATION_LEVELS = [
    { value: 'k1', label: 'อนุบาล 1' },
    { value: 'k2', label: 'อนุบาล 2' },
    { value: 'k3', label: 'อนุบาล 3' },
    { value: 'p1', label: 'ประถมศึกษาปีที่ 1' },
    { value: 'p2', label: 'ประถมศึกษาปีที่ 2' },
    { value: 'p3', label: 'ประถมศึกษาปีที่ 3' },
    { value: 'p4', label: 'ประถมศึกษาปีที่ 4' },
    { value: 'p5', label: 'ประถมศึกษาปีที่ 5' },
    { value: 'p6', label: 'ประถมศึกษาปีที่ 6' },
    { value: 'm1', label: 'มัธยมศึกษาปีที่ 1' },
    { value: 'm2', label: 'มัธยมศึกษาปีที่ 2' },
    { value: 'm3', label: 'มัธยมศึกษาปีที่ 3' },
    { value: 'm4', label: 'มัธยมศึกษาปีที่ 4' },
    { value: 'm5', label: 'มัธยมศึกษาปีที่ 5' },
    { value: 'm6', label: 'มัธยมศึกษาปีที่ 6' },
    { value: 'vc1', label: 'ปวช.1' },
    { value: 'vc2', label: 'ปวช.2' },
    { value: 'vc3', label: 'ปวช.3' },
    { value: 'bachelor', label: 'ปริญญาตรี' },
    { value: 'master', label: 'ปริญญาโท' },
    { value: 'doctorate', label: 'ปริญญาเอก' },
    { value: 'general', label: 'บุคคลทั่วไป' },
    { value: 'other', label: 'อื่นๆ' },
];

const STUDY_TIMES = [
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '15:30 - 17:30',
    '16:00 - 18:00',
    '16:30 - 18:30',
    '17:00 - 19:00',
    '17:30 - 19:30',
    '18:00 - 20:00',
    '20:00 - 22:00',
    'อื่นๆ (ระบุเวลาเอง)'
];

const DAYS = [
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์',
    'อาทิตย์'
];

interface RegisteredCourse {
    name: string;
    teacherId: string;
    teacherName: string;
    day: string;
    time: string;
    startDate: string; // YYYY-MM-DD
    endDate: string | null; // YYYY-MM-DD (Optional/Deprecated)
    totalSessions: number;
    level: string; // [NEW] basic, intermediate, advanced
}

interface Subject {
    _id: string;
    name: string;
}

export default function CreateUser() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        parentName: '',
        parentRelation: '', // [NEW]
        parentPhone: '', // [NEW]
        parentAddress: '', // [NEW]
        studentIdMap: '', // [NEW]
        prefix: '', // [NEW]
        firstName: '', // [NEW]
        lastName: '', // [NEW]
        studentName: '',
        nickname: '',
        birthDate: '', // [NEW]
        age: '', // [NEW]
        gender: '', // [NEW]
        ethnicity: '', // [NEW]
        religion: '', // [NEW]
        studentPhone: '', // [NEW]
        address: '', // [NEW]
        school: '',
        educationLevel: '',
    });

    // Subject & Time State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);

    // Dialog State for Course Selection
    const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<string | null>(null);
    const [tempDay, setTempDay] = useState('');
    const [tempTime, setTempTime] = useState('');
    const [tempCustomTime, setTempCustomTime] = useState('');
    const [tempTeacherId, setTempTeacherId] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState(''); // Deprecated logic, keeping state to avoid breaks if backend requires it, or just set null
    const [tempTotalSessions, setTempTotalSessions] = useState(4);
    const [tempLevel, setTempLevel] = useState('Basic'); // [NEW] Level State
    const [isCustomCourseQuota, setIsCustomCourseQuota] = useState(false); // [NEW] Explicit state

    const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    // [NEW] Confirmation Dialog State
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    // [NEW] Manual School Input State
    const [isManualSchoolInput, setIsManualSchoolInput] = useState(false);


    const [teachers, setTeachers] = useState<{ _id: string, displayName: string, email: string }[]>([]);

    const fetchTeachers = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const teacherList = data.filter((u: any) => u.role === 'teacher' && u.isApproved);
                setTeachers(teacherList);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
            toast.error('โหลดรายชื่อครูไม่สำเร็จ');
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects`);
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('โหลดรายวิชาไม่สำเร็จ');
        }
    };

    useEffect(() => {
        fetchSubjects();
        if (user) fetchTeachers();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubjectClick = (subjectName: string) => {
        const isSelected = registeredCourses.some(s => s.name === subjectName);

        if (isSelected) {
            setRegisteredCourses(prev => prev.filter(s => s.name !== subjectName));
        } else {
            setCurrentSubject(subjectName);
            setTempDay('');
            setTempTime('');
            setTempCustomTime('');
            setTempTeacherId('');
            setTempStartDate('');
            setTempEndDate('');
            setTempTotalSessions(4);
            setTempLevel('Basic');
            setIsCustomCourseQuota(false);
            setIsCourseDialogOpen(true);
        }
    };

    const confirmCourseSelection = () => {
        if (!tempTeacherId) {
            toast.error('กรุณาเลือกครูผู้สอน');
            return;
        }
        if (!tempStartDate) {
            toast.error('กรุณาระบุวันเริ่มเรียน');
            return;
        }
        if (!tempEndDate) {
            toast.error('กรุณาระบุวันสิ้นสุด');
            return;
        }
        if (!tempDay) {
            toast.error('กรุณาเลือกวันที่เรียน');
            return;
        }
        if (!tempTime) {
            toast.error('กรุณาเลือกเวลาเรียน');
            return;
        }
        if (tempTime === 'อื่นๆ (ระบุเวลาเอง)' && !tempCustomTime) {
            toast.error('กรุณาระบุเวลาที่สะดวก');
            return;
        }

        if (currentSubject) {
            let finalTime: string;

            if (tempTime === 'อื่นๆ (ระบุเวลาเอง)') {
                finalTime = `${tempCustomTime}`;
            } else {
                finalTime = tempTime;
            }

            const teacherObj = teachers.find(t => t._id === tempTeacherId);

            setRegisteredCourses(prev => [
                ...prev,
                {
                    name: currentSubject,
                    teacherId: tempTeacherId,
                    teacherName: teacherObj?.displayName || 'Unknown',
                    day: tempDay,
                    time: finalTime,
                    startDate: tempStartDate,
                    endDate: tempEndDate,
                    totalSessions: tempTotalSessions,
                    level: tempLevel // Include Level
                }
            ]);
            setIsCourseDialogOpen(false);
            setCurrentSubject(null);
        }
    };

    const handlePreSubmit = () => {
        // 1. Strict Validation (Blocking)
        if (!formData.username || !formData.password || !formData.school) {
            toast.error('กรุณากรอก Username, Password และเลือกโรงเรียน');
            return;
        }
        if (registeredCourses.length === 0) {
            toast.error('กรุณาเลือกวิชาที่เรียนอย่างน้อย 1 วิชา');
            return;
        }

        // 2. Soft Validation (Warning Dialog)
        const missing = [];
        if (!formData.studentName) missing.push('ชื่อนักเรียน');
        if (!formData.educationLevel) missing.push('ระดับการศึกษา');
        if (!formData.parentName) missing.push('ชื่อผู้ปกครอง');
        if (!formData.parentRelation) missing.push('ความสัมพันธ์ผู้ปกครอง');
        if (!formData.parentPhone) missing.push('เบอร์ผู้ปกครอง');
        if (!formData.studentPhone) missing.push('เบอร์นักเรียน');
        if (!formData.address) missing.push('ที่อยู่');
        if (!formData.birthDate) missing.push('วันเกิด');

        if (missing.length > 0) {
            setMissingFields(missing);
            setIsConfirmDialogOpen(true);
        } else {
            submitUser();
        }
    };

    const submitUser = async () => {
        // [Existing Logic Refactored]

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/users`;

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    passwordHash: formData.password,
                    parentName: formData.parentName,
                    parentRelation: formData.parentRelation,
                    parentPhone: formData.parentPhone,
                    parentAddress: formData.parentAddress,
                    studentName: `${formData.prefix} ${formData.firstName} ${formData.lastName}`.trim(), // Combine for legacy
                    prefix: formData.prefix,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    studentIdMap: formData.studentIdMap,
                    nickname: formData.nickname,
                    birthDate: formData.birthDate,
                    age: Number(formData.age),
                    gender: formData.gender,
                    ethnicity: formData.ethnicity,
                    religion: formData.religion,
                    studentPhone: formData.studentPhone,
                    address: formData.address,
                    school: formData.school,
                    educationLevel: formData.educationLevel,
                    registeredCourses: registeredCourses.map(c => ({
                        subject: c.name,
                        teacherId: c.teacherId,
                        teacherName: c.teacherName,
                        day: c.day,
                        time: c.time,
                        startDate: new Date(c.startDate),
                        endDate: new Date(c.endDate!),
                        totalSessions: c.totalSessions,
                        level: c.level
                    })),
                    // Legacy compatibility
                    role: 'student',
                    enrolledSubjects: registeredCourses.map(c => c.name),
                    studyTimes: registeredCourses.map(c => `${c.day} ${c.time}`),
                    assignedTeacherId: registeredCourses[0]?.teacherId,
                    startDate: registeredCourses[0] ? new Date(registeredCourses[0].startDate) : undefined,
                })
            });

            if (res.ok) {
                setSuccess(true);
                toast.success('สร้างผู้ใช้สำเร็จ');
                // Reset form after 2 seconds
                setTimeout(() => {
                    setSuccess(false);
                    setFormData({
                        username: '',
                        password: '',
                        parentName: '',
                        parentRelation: '',
                        parentPhone: '',
                        parentAddress: '',
                        studentIdMap: '',
                        prefix: '',
                        firstName: '',
                        lastName: '',
                        studentName: '',
                        nickname: '',
                        birthDate: '',
                        age: '',
                        gender: '',
                        ethnicity: '',
                        religion: '',
                        studentPhone: '',
                        address: '',
                        school: '',
                        educationLevel: '',
                    });
                    setRegisteredCourses([]);
                }, 2000);
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

        } catch (error: any) {
            console.error('Create user error:', error);
            if (error.message.includes('USERNAME_ALREADY_EXISTS')) {
                toast.error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
            } else {
                toast.error('เกิดข้อผิดพลาดในการสร้างผู้ใช้');
            }
        } finally {
            setLoading(false);
        }
    };

    // Subject Management Logic
    const [isManageSubjectsDialogOpen, setIsManageSubjectsDialogOpen] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    const handleStartEditSubject = (subject: Subject) => {
        setEditingSubjectId(subject._id);
        setEditSubjectName(subject.name);
    };

    const handleCancelEditSubject = () => {
        setEditingSubjectId(null);
        setEditSubjectName('');
    };

    const handleUpdateSubject = async (id: string) => {
        if (!editSubjectName.trim()) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: editSubjectName })
            });

            if (res.ok) {
                toast.success('อัปเดตชื่อวิชาสำเร็จ');
                setEditingSubjectId(null);
                fetchSubjects(); // Refresh list
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            toast.error('ไม่สามารถอัปเดตชื่อวิชาได้');
        }
    };

    const handleDeleteSubject = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?`)) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast.success('ลบวิชาสำเร็จ');
                fetchSubjects(); // Refresh list
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('ไม่สามารถลบวิชาได้');
        }
    };

    const handleAddSubject = async () => {
        if (!newSubjectName.trim()) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newSubjectName })
            });

            if (res.ok) {
                toast.success('เพิ่มรายวิชาสำเร็จ');
                setNewSubjectName('');
                setIsAddSubjectDialogOpen(false);
                fetchSubjects();
            } else {
                throw new Error('Failed to add subject');
            }
        } catch (error) {
            toast.error('ไม่สามารถเพิ่มรายวิชาได้');
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 h-full bg-white rounded-none border border-slate-200 shadow-sm">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    <div className="h-32 w-32 rounded-none bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-20 w-20 text-emerald-600" />
                    </div>
                </motion.div>
                <div className="text-center">
                    <h3 className="text-3xl font-bold text-emerald-700 font-itim">สร้างผู้ใช้สำเร็จ!</h3>
                    <p className="text-gray-500 mt-2 text-lg">ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว</p>
                </div>
                <Button onClick={() => setSuccess(false)} className="mt-4 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">
                    สร้างผู้ใช้เพิ่ม
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-none flex items-center justify-center text-indigo-600 border border-indigo-100">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">สร้างผู้ใช้งานใหม่</h2>
                            <p className="text-sm text-slate-500">กรอกข้อมูลเพื่อสร้างบัญชีนักเรียน</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsManageSubjectsDialogOpen(true)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-none"
                            title="จัดการรายวิชา (แก้ไข/ลบ)"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            จัดการรายวิชา
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddSubjectDialogOpen(true)}
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-none"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            เพิ่มรายวิชา
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="font-semibold text-gray-700">Username</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="username"
                                name="username"
                                placeholder="ตั้งชื่อผู้ใช้"
                                value={formData.username}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="password"
                                name="password"
                                type="text"
                                placeholder="ตั้งรหัสผ่าน"
                                value={formData.password}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Personal Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 col-span-1 md:col-span-2 bg-slate-50 p-4 border border-slate-100 rounded-none">
                        <div className="col-span-3">
                            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" />
                                ข้อมูลส่วนตัว
                            </h3>
                        </div>


                        {/* Prefix */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">คำนำหน้า</Label>
                            <Select value={formData.prefix} onValueChange={(val) => handleSelectChange('prefix', val)}>
                                <SelectTrigger className="h-11 rounded-none border-slate-200">
                                    <SelectValue placeholder="เลือกคำนำหน้า" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="เด็กชาย">เด็กชาย</SelectItem>
                                    <SelectItem value="เด็กหญิง">เด็กหญิง</SelectItem>
                                    <SelectItem value="นาย">นาย</SelectItem>
                                    <SelectItem value="นางสาว">นางสาว</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* First Name */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ชื่อจริง</Label>
                            <Input name="firstName" placeholder="ชื่อจริง" value={formData.firstName} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Last Name */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">นามสกุล</Label>
                            <Input name="lastName" placeholder="นามสกุล" value={formData.lastName} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Nickname */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ชื่อเล่น</Label>
                            <Input name="nickname" placeholder="ชื่อเล่น" value={formData.nickname} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* BirthDate */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">วันเกิด (DD/MM/YYYY)</Label>
                            <Input name="birthDate" placeholder="เช่น 15/04/2550" value={formData.birthDate} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Age */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">อายุ</Label>
                            <Input name="age" type="number" placeholder="อายุ" value={formData.age} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">เพศ</Label>
                            <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)}>
                                <SelectTrigger className="h-11 rounded-none border-slate-200">
                                    <SelectValue placeholder="เลือกเพศ" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="ชาย">ชาย</SelectItem>
                                    <SelectItem value="หญิง">หญิง</SelectItem>
                                    <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ethnicity */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">เชื้อชาติ</Label>
                            <Input name="ethnicity" placeholder="เช่น ไทย" value={formData.ethnicity} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Religion */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ศาสนา</Label>
                            <Input name="religion" placeholder="เช่น พุทธ, คริสต์, อิสลาม" value={formData.religion} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">เบอร์โทรศัพท์นักเรียน</Label>
                            <Input name="studentPhone" placeholder="0xxxxxxxxx" value={formData.studentPhone} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Address */}
                        <div className="col-span-1 md:col-span-3 space-y-2">
                            <Label className="font-semibold text-gray-700">ที่อยู่ปัจจุบัน</Label>
                            <Input name="address" placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด..." value={formData.address} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>
                    </div>

                    {/* Parent Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 md:col-span-2 bg-blue-50/50 p-4 border border-blue-100 rounded-none">
                        <div className="col-span-2">
                            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                ข้อมูลผู้ปกครอง
                            </h3>
                        </div>

                        {/* Parent Name */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ชื่อ-นามสกุล ผู้ปกครอง</Label>
                            <Input name="parentName" placeholder="ระบุชื่อผู้ปกครอง" value={formData.parentName} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Relation */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ความสัมพันธ์</Label>
                            <Input name="parentRelation" placeholder="เช่น บิดา, มารดา" value={formData.parentRelation} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Parent Phone */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">เบอร์โทรศัพท์ผู้ปกครอง</Label>
                            <Input name="parentPhone" placeholder="0xxxxxxxxx" value={formData.parentPhone} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>

                        {/* Parent Address */}
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label className="font-semibold text-gray-700">ที่อยู่ผู้ปกครอง (หากไม่เหมือนนักเรียน)</Label>
                            <Input name="parentAddress" placeholder="ระบุที่อยู่" value={formData.parentAddress} onChange={handleChange} className="h-11 rounded-none border-slate-200" />
                        </div>
                    </div>

                    {/* School */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="font-semibold text-gray-700">โรงเรียน</Label>
                        <div className="flex gap-3 items-start">
                            {isManualSchoolInput ? (
                                <div className="flex-1 relative animate-in fade-in slide-in-from-left-2 duration-300">
                                    <School className="absolute left-3 top-3 h-5 w-5 text-pink-500 z-10" />
                                    <Input
                                        placeholder="ระบุชื่อโรงเรียนเอง..."
                                        value={formData.school === 'อื่นๆ' ? '' : formData.school}
                                        onChange={(e) => handleSelectChange('school', e.target.value)}
                                        className="pl-10 h-11 rounded-none border-pink-500 ring-1 ring-pink-500/20 bg-pink-50 text-pink-700 font-medium placeholder:text-pink-300"
                                        autoFocus
                                    />
                                    <p className="text-xs text-pink-500 mt-1 flex items-center gap-1">
                                        * กำลังระบุชื่อโรงเรียนด้วยตนเอง
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <SchoolSearchInput
                                        value={formData.school}
                                        onSelect={(val) => handleSelectChange('school', val)}
                                    />
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (isManualSchoolInput) {
                                        setIsManualSchoolInput(false);
                                        handleSelectChange('school', ''); // Clear when going back to search
                                    } else {
                                        setIsManualSchoolInput(true);
                                        handleSelectChange('school', ''); // Clear start
                                    }
                                }}
                                className={`h-11 px-6 rounded-none border transition-all min-w-[120px] ${isManualSchoolInput
                                    ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                                    : 'border-slate-200 hover:border-pink-500 hover:text-pink-500 bg-white'
                                    }`}
                            >
                                {isManualSchoolInput ? (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        ค้นหา
                                    </>
                                ) : (
                                    'อื่นๆ'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Education Level */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="font-semibold text-gray-700">ระดับการศึกษา</Label>
                        <div className="relative">
                            <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-purple-500 z-10" />
                            <Select
                                value={formData.educationLevel}
                                onValueChange={(val) => handleSelectChange('educationLevel', val)}
                            >
                                <SelectTrigger className="pl-10 h-11 rounded-none border-slate-200 border-l-4 border-l-purple-500">
                                    <SelectValue placeholder="เลือกระดับ" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {EDUCATION_LEVELS.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                            {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Subjects Grid */}
                    <div className="space-y-3 mt-6">
                        <Label className="font-semibold text-gray-700">วิชาที่เรียน</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {subjects.map((subject) => {
                                const isSelected = registeredCourses.some(s => s.name === subject.name);
                                const selectedData = registeredCourses.find(s => s.name === subject.name);

                                // Dynamic Icon Logic
                                const getSubjectIcon = (name: string) => {
                                    const lower = name.toLowerCase();
                                    if (lower.includes('arduino')) return <Cpu className={`w-8 h-8 ${isSelected ? 'text-cyan-200' : 'text-cyan-500'}`} />;
                                    if (lower.includes('iot') || lower.includes('internet')) return <Wifi className={`w-8 h-8 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />;
                                    if (lower.includes('data') || lower.includes('science')) return <BarChart3 className={`w-8 h-8 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`} />;
                                    if (lower.includes('scratch')) return <Cat className={`w-8 h-8 ${isSelected ? 'text-orange-200' : 'text-orange-500'}`} />;
                                    if (lower.includes('web') || lower.includes('html')) return <Globe className={`w-8 h-8 ${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`} />;
                                    if (lower.includes('roblox')) return <Box className={`w-8 h-8 ${isSelected ? 'text-red-200' : 'text-red-500'}`} />;
                                    if (lower.includes('code') || lower.includes('python')) return <Terminal className={`w-8 h-8 ${isSelected ? 'text-yellow-200' : 'text-yellow-500'}`} />;
                                    if (lower.includes('microbit')) return <Cpu className={`w-8 h-8 ${isSelected ? 'text-green-200' : 'text-green-500'}`} />;
                                    if (lower.includes('game')) return <Gamepad2 className={`w-8 h-8 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />;
                                    return <BookOpen className={`w-8 h-8 ${isSelected ? 'text-slate-200' : 'text-slate-400'}`} />;
                                };

                                return (
                                    <div
                                        key={subject._id}
                                        className={`flex flex-col items-center justify-center p-4 rounded-none cursor-pointer border transition-all h-full min-h-[120px] relative gap-3 ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 shadow-md transform scale-[1.02]'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                            }`}
                                        onClick={() => handleSubjectClick(subject.name)}
                                    >
                                        <div className={`p-3 rounded-none ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                                            {getSubjectIcon(subject.name)}
                                        </div>

                                        <span className={`text-sm font-bold text-center ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                            {subject.name}
                                        </span>

                                        {isSelected && <div className="absolute top-2 right-2">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        </div>}

                                        {isSelected && selectedData && (
                                            <div className="mt-1 text-xs text-indigo-100 bg-white/10 px-2 py-1 rounded-none text-center max-w-full truncate w-full border border-white/20">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="truncate">{selectedData.day} {selectedData.time}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button
                            type="button"
                            className="w-full h-12 text-lg rounded-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            onClick={handlePreSubmit}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {loading ? 'กำลังบันทึก...' : 'สร้างบัญชีผู้ใช้'}
                        </Button>
                    </div>
                </div>

                {/* Missing Info Confirmation Dialog */}
                <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-none border-t-4 border-t-yellow-500">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-yellow-600">
                                <span className="text-xl">⚠️</span> ข้อมูลไม่ครบถ้วน
                            </DialogTitle>
                            <DialogDescription>
                                คุณยังไม่ได้กรอกข้อมูลต่อไปนี้:
                                <ul className="list-disc pl-5 mt-2 mb-2 text-slate-600">
                                    {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                                ต้องการยืนยันการสร้างบัญชีหรือไม่?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} className="rounded-none w-full">
                                กลับไปแก้ไข
                            </Button>
                            <Button
                                onClick={() => { setIsConfirmDialogOpen(false); submitUser(); }}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-none w-full"
                            >
                                ยืนยันสมัครบัญชี
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Course Selection Dialog */}
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                    <DialogContent className="sm:max-w-2xl rounded-none border-slate-200 p-0 overflow-hidden">
                        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
                            <DialogTitle className="text-xl font-bold font-itim flex items-center gap-2">
                                <span>ตั้งค่าการเรียนสำหรับวิชา:</span>
                                <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-none border border-indigo-100">{currentSubject}</span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">ครูผู้สอน <span className="text-red-500">*</span></Label>
                                    <Select value={tempTeacherId} onValueChange={setTempTeacherId}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกครู" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none max-h-[200px]">
                                            {teachers.map((t) => (
                                                <SelectItem key={t._id} value={t._id}>{t.displayName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">เริ่มเรียน <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="h-11 rounded-none border-slate-200"
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">สิ้นสุด <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="h-11 rounded-none border-slate-200"
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">วันที่เรียน <span className="text-red-500">*</span></Label>
                                    <Select value={tempDay} onValueChange={setTempDay}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกวัน" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {DAYS.map((day) => (
                                                <SelectItem key={day} value={day}>{day}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">เวลาเรียน <span className="text-red-500">*</span></Label>
                                    <Select value={tempTime} onValueChange={setTempTime}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกเวลา" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {STUDY_TIMES.map((time) => (
                                                <SelectItem key={time} value={time}>{time}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {tempTime === 'อื่นๆ (ระบุเวลาเอง)' && (
                                <div className="space-y-2 bg-yellow-50 p-4 border border-yellow-100 rounded-none">
                                    <Label className="font-semibold text-yellow-800">ระบุเวลาเอง</Label>
                                    <Input
                                        placeholder="เช่น 10:00 - 12:00"
                                        value={tempCustomTime}
                                        onChange={(e) => setTempCustomTime(e.target.value)}
                                        className="h-11 rounded-none border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200"
                                    />
                                </div>
                            )}

                            <div className="h-px bg-slate-100 w-full" />

                            <div className="p-4 bg-slate-50 border border-slate-200">
                                <Label className="text-indigo-700 font-bold mb-3 block text-sm">โควตาจำนวนครั้งที่เรียน (Course Quota)</Label>
                                <div className="flex items-center gap-4">
                                    <Select
                                        value={isCustomCourseQuota ? "0" : ([4, 12, 24, 48].includes(tempTotalSessions) ? tempTotalSessions.toString() : "0")}
                                        onValueChange={(val) => {
                                            const intVal = parseInt(val);
                                            if (intVal === 0) {
                                                setIsCustomCourseQuota(true);
                                                setTempTotalSessions(0);
                                            } else {
                                                setIsCustomCourseQuota(false);
                                                setTempTotalSessions(intVal);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-11 rounded-none border-slate-200 bg-white flex-1 text-sm">
                                            <SelectValue placeholder="เลือกจำนวนครั้ง" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="4">4 ครั้ง (คอร์ส 1 เดือน)</SelectItem>
                                            <SelectItem value="12">12 ครั้ง (คอร์ส 3 เดือน)</SelectItem>
                                            <SelectItem value="24">24 ครั้ง (คอร์ส 6 เดือน)</SelectItem>
                                            <SelectItem value="48">48 ครั้ง (คอร์ส 1 ปี)</SelectItem>
                                            <SelectItem value="0">กำหนดเอง (Custom)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isCustomCourseQuota && (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="100"
                                                placeholder="ระบุ 1-100"
                                                className="h-11 rounded-none bg-white border-slate-200"
                                                value={tempTotalSessions || ''}
                                                onChange={(e) => setTempTotalSessions(parseInt(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-slate-500">ครั้ง</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * ระดับเริ่มต้นจะเป็น Basic เสมอ (Starting Level: Basic)
                            </p>

                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * ระบบจะหักจำนวนครั้งอัตโนมัติเมื่อครูเช็คชื่อมาเรียน
                            </p>
                        </div>
                        <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
                            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)} className="mr-2 h-11 rounded-none border-slate-200 bg-white">ยกเลิก</Button>
                            <Button onClick={confirmCourseSelection} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-none px-8 font-semibold shadow-sm">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                ยืนยันข้อมูล
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manage Subjects Dialog */}
                <Dialog open={isManageSubjectsDialogOpen} onOpenChange={setIsManageSubjectsDialogOpen}>
                    <DialogContent className="sm:max-w-[500px] rounded-none border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold font-itim flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                จัดการรายวิชา
                            </DialogTitle>
                            <DialogDescription>
                                แก้ไขชื่อวิชาหรือลบรายวิชาที่ไม่ต้องการ
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {subjects.map((subject) => (
                                        <div
                                            key={subject._id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-none border border-slate-100 group hover:border-indigo-100 hover:bg-white transition-colors"
                                        >
                                            {editingSubjectId === subject._id ? (
                                                <div className="flex-1 flex gap-2 items-center">
                                                    <Input
                                                        value={editSubjectName}
                                                        onChange={(e) => setEditSubjectName(e.target.value)}
                                                        className="h-9 text-sm"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleUpdateSubject(subject._id)}
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                        onClick={handleCancelEditSubject}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-slate-700 font-medium text-sm flex-1 truncate pr-4">
                                                        {subject.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={() => handleStartEditSubject(subject)}
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteSubject(subject._id, subject.name)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setIsManageSubjectsDialogOpen(false)} variant="outline" className="h-10 rounded-none">
                                ปิดหน้าต่าง
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Subject Dialog */}
                <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-none border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold font-itim">เพิ่มรายวิชาใหม่</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">ชื่อวิชา</Label>
                                <Input
                                    placeholder="เช่น Microbit:IOT"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    className="h-11 rounded-none border-slate-200"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddSubjectDialogOpen(false)} className="mr-2 h-11 rounded-none border-slate-200">ยกเลิก</Button>
                            <Button onClick={handleAddSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-none px-8">บันทึก</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
