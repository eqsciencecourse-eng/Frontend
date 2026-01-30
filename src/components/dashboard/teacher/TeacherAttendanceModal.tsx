
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Clock, AlertCircle, Save, Loader2, Calendar, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';
import QRCode from "react-qr-code";

interface TeacherAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: any;
}

const SKILL_STRUCTURE = [
    {
        category: 'ด้านองค์ความรู้ (Knowledge)',
        items: [
            { id: 'k_exercise', label: 'แบบฝึกหัด', max: 5 }
        ]
    },
    {
        category: 'ด้านการปฏิบัติ (Action/Skill)',
        items: [
            { id: 's_creative', label: 'ความคิดสร้างสรรค์', max: 5 },
            { id: 's_planning', label: 'วางแผน/เวลา', max: 5 },
            { id: 's_problem_solving', label: 'การแก้ปัญหา', max: 5 },
            { id: 's_design_improve', label: 'การออกแบบ/ปรับปรุง', max: 5 },
            { id: 's_programming', label: 'เขียนโปรแกรม', max: 5 },
            { id: 's_present', label: 'นำเสนอ', max: 5 },
            { id: 's_emotional', label: 'อารมณ์/สมาธิ', max: 5 }
        ]
    }
];

export default function TeacherAttendanceModal({ isOpen, onClose, teacher }: TeacherAttendanceModalProps) {
    const [step, setStep] = useState(1);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>(''); // New Text/Input for Time
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, { status: string, comment: string, time?: string }>>({});
    const [evaluations, setEvaluations] = useState<Record<string, Record<string, number>>>({}); // studentId -> { k_exercise: 5, ... }
    const [studentPeriods, setStudentPeriods] = useState<Record<string, number>>({}); // studentId -> nextPeriod
    const [evaluationMode, setEvaluationMode] = useState(false);

    // QR Code State
    const [checkInMode, setCheckInMode] = useState<'manual' | 'qr'>('manual');
    const [qrToken, setQrToken] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState('');
    const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Subjects on Open & Filter by Authorization
    useEffect(() => {
        if (isOpen) {
            fetchSubjects();
            setStep(1);
            fetchSubjects();
            setStep(1);
            setAttendanceData({});
            setEvaluations({});
            setStudentPeriods({});
            setEvaluationMode(false);
            setSelectedTime('');
            setStudents([]); // Reset students
        }
    }, [isOpen]);

    // Fetch students when Subject changes to populate Times
    useEffect(() => {
        if (selectedSubject) {
            fetchStudentsAndTimes();
        } else {
            setStudents([]);
            setAvailableTimes([]);
            setSelectedTime('');
        }
    }, [selectedSubject]);

    const [availableTimes, setAvailableTimes] = useState<string[]>([]);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (res.ok) {
                const data = await res.json();

                // Filter subjects based on teacher's authorization
                // If teacher has authorizedSubjects, only show those.
                // Assuming authorizedSubjects contains subject names or IDs. 
                // Let's check against both to be safe, defaulting to all if authorizedSubjects is empty (admin case or unset).
                let filtered = data;
                if (teacher.authorizedSubjects && teacher.authorizedSubjects.length > 0) {
                    filtered = data.filter((s: any) =>
                        teacher.authorizedSubjects.includes(s.name) ||
                        teacher.authorizedSubjects.includes(s._id)
                    );
                }
                setSubjects(filtered);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStudentsAndTimes = async () => {
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(API_ENDPOINTS.USERS.STUDENTS, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const allStudents = await res.json();
                const subjObj = subjects.find(s => s._id === selectedSubject);
                const subjName = subjObj ? subjObj.name : '';

                // 1. Filter students enrolled in this subject
                const enrolled = allStudents.filter((s: any) =>
                    s.enrolledSubjects?.includes(subjName) ||
                    s.enrolledSubjects?.includes(selectedSubject)
                );

                setStudents(enrolled); // Keep all enrolled students in state for now

                // 2. Extract unique times from these students
                // Check 'registeredClasses' structure: { className, classTime }
                const timesSet = new Set<string>();
                enrolled.forEach((s: any) => {
                    if (s.registeredClasses && s.registeredClasses.length > 0) {
                        const regClass = s.registeredClasses.find((rc: any) => {
                            // Robust matching: Check if one includes the other (case-insensitive)
                            const rcName = rc.className.toLowerCase().trim();
                            const sName = subjName.toLowerCase().trim();
                            const sId = selectedSubject.toLowerCase().trim();
                            return rcName.includes(sName) || sName.includes(rcName) || rcName === sId;
                        });

                        if (regClass && regClass.classTime) {
                            timesSet.add(regClass.classTime);
                        }
                    } else if (s.studyTimes && s.studyTimes.length > 0) {
                        // Fallback: If registeredClasses is empty, try studyTimes
                        // But studyTimes doesn't specify subject. We might just add them all 
                        // or user has to strictly rely on new system.
                        // Let's safe guard: Add them.
                        s.studyTimes.forEach((t: string) => timesSet.add(t));
                    }
                });

                // Convert to array and sort
                const sortedTimes = Array.from(timesSet).sort();
                console.log('Extracted Times:', sortedTimes);
                setAvailableTimes(sortedTimes);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.error('ไม่สามารถดึงข้อมูลนักเรียนได้');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async (mode: 'manual' | 'qr' = 'manual') => {
        if (!selectedSubject || !selectedDate || !selectedTime) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (วิชา, วันที่, เวลา)');
            return;
        }

        setCheckInMode(mode);

        // Filter students by selected Time
        const subjObj = subjects.find(s => s._id === selectedSubject);
        const subjName = subjObj ? subjObj.name : '';

        const studentsInTimeSlot = students.filter((s: any) => {
            // Robust match for filtering as well
            if (s.registeredClasses && s.registeredClasses.length > 0) {
                const regClass = s.registeredClasses.find((rc: any) => {
                    const rcName = rc.className.toLowerCase().trim();
                    const sName = subjName.toLowerCase().trim();
                    const sId = selectedSubject.toLowerCase().trim();
                    return (rcName.includes(sName) || sName.includes(rcName) || rcName === sId);
                });
                return regClass && regClass.classTime === selectedTime;
            }

            // Fallback for studyTimes
            if (s.studyTimes && s.studyTimes.length > 0) {
                return s.studyTimes.includes(selectedTime);
            }

            return false;
        });

        // Update the displayed students list to only this batch
        // [FIX] Relaxed Filtering: If strict time match yields 0 students, fallback to ALL students in subject
        if (studentsInTimeSlot.length === 0) {
            // Check if there are ANY students for this subject at all
            if (students.length > 0) {
                toast.info(`ไม่พบนักเรียนในรอบเวลา ${selectedTime} ระบบจะแสดงนักเรียนทั้งหมดในวิชานี้`, {
                    duration: 5000,
                });
                // Fallback: Use all students currently in state (which are already filtered by Subject)
                // We do NOT return here, we proceed with 'students' (all)
            } else {
                toast.error(`ไม่พบนักเรียนลงทะเบียนในวิชานี้เลย`);
                return;
            }
        } else {
            // Use the strictly filtered list
            setStudents(studentsInTimeSlot);
        }

        // Initialize default attendance
        const initialData: any = {};
        studentsInTimeSlot.forEach((s: any) => {
            initialData[s._id] = { status: 'Present', comment: '' };
        });
        setAttendanceData(initialData);

        if (mode === 'qr') {
            handleGenerateQR(subjName || 'Subject');
        } else {
            setStep(2);
        }
    };

    // Auto-refresh for QR Mode
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (checkInMode === 'qr' && step === 2 && qrToken) {
            handleRefreshQRStats(); // Initial call
            interval = setInterval(handleRefreshQRStats, 3000); // Poll every 3 seconds
        }
        return () => clearInterval(interval);
    }, [checkInMode, step, qrToken, selectedSubject]);

    const handleGenerateQR = async (subjectName: string) => {
        try {
            setLoading(true);
            // 1. Generate Token
            const res = await fetch(API_ENDPOINTS.ATTENDANCE.GENERATE_QR, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, // Assume token exists
                body: JSON.stringify({
                    subjectId: selectedSubject,
                    subjectName: subjectName,
                    date: selectedDate,
                    time: selectedTime
                })
            });

            if (res.ok) {
                const data = await res.json();
                const url = `${window.location.origin}/attendance/check-in?token=${data.token}`;
                setQrToken(data.token);
                setQrUrl(url);
                setQrExpiresAt(data.expiresAt);
                setStep(2);

                // Also fetch current attendance state in case some already checked in?
                // Or initialize list with empty/absent
            } else {
                toast.error('ไม่สามารถสร้าง QR Code ได้');
            }
        } catch (error) {
            console.error(error);
            toast.error('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshQRStats = async () => {
        // Re-fetch attendance data to see who scanned
        try {
            const res = await fetch(API_ENDPOINTS.ATTENDANCE.CHECK(selectedSubject, selectedDate), {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Map existing records to local state
                if (data && data.students) {
                    const newAttendance = { ...attendanceData };

                    data.students.forEach((s: any) => {
                        newAttendance[s.studentId] = {
                            status: s.status,
                            comment: s.comment,
                            time: s.time
                        };
                    });
                    setAttendanceData(newAttendance);
                    toast.success('อัปเดตข้อมูลการเช็คชื่อแล้ว');
                }
            }
        } catch (e) { console.error(e); }
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleCommentChange = (studentId: string, comment: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], comment }
        }));
    };



    // --- EVALUATION LOGIC ---

    // Initial Scoring Logic: Default to Max Score
    const initializeEvaluations = (studentList: any[]) => {
        const initial: Record<string, Record<string, number>> = {};
        studentList.forEach(s => {
            if (attendanceData[s._id]?.status === 'Present' || attendanceData[s._id]?.status === 'Late') {
                const scores: Record<string, number> = {};
                SKILL_STRUCTURE.forEach(cat => {
                    cat.items.forEach(item => {
                        scores[item.id] = item.max; // Default to Max
                    });
                });
                initial[s._id] = scores;
            }
        });
        setEvaluations(initial);
    };

    const fetchStudentPeriods = async (studentList: any[]) => {
        // Fetch current grade/quota usage for each student to guess the next period
        // For simplicity, we'll fetch the registered course info from the student object we already have
        // or default to 1 if not found.
        const periods: Record<string, number> = {};

        studentList.forEach(s => {
            // Find registered course for this subject
            const course = s.registeredCourses?.find((c: any) => c.subject === subjects.find(sub => sub._id === selectedSubject)?.name);
            // Estimate period: usedSessions + 1
            // Note: 'usedSessions' is updated by attendance. Since we JUST submitted attendance, it might be updated or not.
            // If we rely on frontend state, we might need to assume.
            // Let's rely on `usedSessions` from the student object we fetched at Start of modal.
            // But wait, we fetched students at Step 1.
            // Attendance submission (Step 2) updates backend but we didn't re-fetch students.
            // So `course.usedSessions` is OLD value.
            // New Period = Old Used + 1. (Because we just marked them present).
            let nextPeriod = (course?.usedSessions || 0) + 1;
            if (nextPeriod > (course?.totalSessions || 12)) nextPeriod = course?.totalSessions || 12; // Cap at max
            periods[s._id] = nextPeriod;
        });
        setStudentPeriods(periods);
    };

    const handleEvaluationScoreChange = (studentId: string, itemId: string, val: number) => {
        setEvaluations(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [itemId]: val
            }
        }));
    };

    const handleEvaluationPeriodChange = (studentId: string, val: number) => {
        setStudentPeriods(prev => ({
            ...prev,
            [studentId]: val
        }));
    };

    const handleSubmitEvaluations = async () => {
        setSaving(true);
        try {
            const token = await teacher.getIdToken();
            const subjObj = subjects.find(s => s._id === selectedSubject);

            const promises = students
                .filter(s => evaluations[s._id]) // Only those with evaluations (Present/Late)
                .map(s => {
                    const period = studentPeriods[s._id] || 1;
                    return fetch(API_ENDPOINTS.GRADES.UPDATE_EVALUATION, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            studentId: s._id,
                            subjectId: selectedSubject,
                            subjectName: subjObj?.name || 'Unknown',
                            period: period,
                            scores: evaluations[s._id],
                            comment: attendanceData[s._id]?.comment || '' // Re-use attendance comment? Or allow new one? For now reuse to keep it simple.
                        })
                    });
                });

            await Promise.all(promises);
            toast.success('บันทึกผลการประเมินเรียบร้อย');
            onClose();

        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกผลการประเมิน');
        } finally {
            setSaving(false);
        }
    };


    const handleSubmit = async (shouldEvaluate: boolean) => {
        setSaving(true);
        try {
            const token = await teacher.getIdToken();
            const subjObj = subjects.find(s => s._id === selectedSubject);

            const payload = {
                subjectId: selectedSubject,
                subjectName: subjObj?.name || 'Unknown',
                date: new Date(selectedDate).toISOString(),
                students: students.map(s => ({
                    studentId: s._id,
                    firstName: s.firstName || s.studentName?.split(' ')[0] || '-',
                    lastName: s.lastName || (s.studentName?.includes(' ') ? s.studentName.split(' ')[1] : '-'),
                    nickname: s.nickname || '',
                    status: attendanceData[s._id]?.status || 'Present',
                    comment: attendanceData[s._id]?.comment || '',
                    time: selectedTime
                }))
            };

            const res = await fetch(API_ENDPOINTS.ATTENDANCE.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
                if (shouldEvaluate) {
                    setEvaluationMode(true);
                    initializeEvaluations(students);
                    await fetchStudentPeriods(students);
                    setStep(3); // Go to Evaluation
                } else {
                    onClose();
                }
            } else {
                const err = await res.json();
                console.error(err);
                toast.error('เกิดข้อผิดพลาด: ' + (err.message || 'Unknown'));
            }

        } catch (error) {
            console.error('Submit error:', error);
            toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summary
    const summary = students.reduce((acc, s) => {
        const st = attendanceData[s._id]?.status || 'Present';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="p-6 bg-indigo-600 text-white shadow-md z-10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Check className="h-6 w-6" />
                        ระบบเช็คชื่อ (Check Attendance)
                    </DialogTitle>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">

                    {step === 1 && (
                        <div className="max-w-md mx-auto space-y-6 pt-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">วันที่ (Date)</label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="h-12 text-lg bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">วิชา (Subject)</label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger className="h-12 text-lg bg-white">
                                        <SelectValue placeholder="เลือกวิชา..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">เวลา (Time)</label>
                                <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedSubject || loading}>
                                    <SelectTrigger className="h-12 text-lg bg-white">
                                        <SelectValue placeholder={loading ? "กำลังโหลด..." : "เลือกเวลาเรียน..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTimes.length > 0 ? (
                                            availableTimes.map((time, idx) => (
                                                <SelectItem key={idx} value={time}>{time} น.</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-slate-400 text-center">ไม่พบเวลาเรียนสำหรับวิชานี้</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <Button
                                    onClick={() => handleNext('manual')}
                                    variant="outline"
                                    className="h-16 text-lg border-2 hover:bg-slate-50 relative group"
                                    disabled={loading || !selectedTime}
                                >
                                    <span className="flex flex-col items-center">
                                        <Check className="h-5 w-5 mb-1 group-hover:text-indigo-600 transition-colors" />
                                        <span className="text-sm">เช็คชื่อปกติ</span>
                                        <span className="text-xs text-slate-400">Manual Check</span>
                                    </span>
                                </Button>
                                <Button
                                    onClick={() => handleNext('qr')}
                                    className="h-16 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                    disabled={loading || !selectedTime}
                                >
                                    <span className="flex flex-col items-center">
                                        {loading ? <Loader2 className="animate-spin h-5 w-5 mb-1" /> : <QrCode className="h-5 w-5 mb-1" />}
                                        <span className="text-sm">สร้าง QR Code</span>
                                        <span className="text-xs text-indigo-200">Generate QR</span>
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <Check className="h-4 w-4" /> มา: {summary['Present'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-yellow-600 font-bold bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                        <Clock className="h-4 w-4" /> สาย: {summary['Late'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                        <AlertCircle className="h-4 w-4" /> ลา: {summary['Leave'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                        <X className="h-4 w-4" /> ขาด: {summary['Absent'] || 0}
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                    <div className="font-semibold">{subjects.find(s => s._id === selectedSubject)?.name}</div>
                                    <div>{new Date(selectedDate).toLocaleDateString('th-TH')} | {selectedTime} น.</div>
                                </div>
                            </div>

                            {/* QR Code Display Section */}
                            {checkInMode === 'qr' && (
                                <div className="bg-white border rounded-xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-8 items-center justify-center">
                                    <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-slate-100 flex flex-col items-center">
                                        {qrUrl && <QRCode value={qrUrl} size={200} />}
                                        <div className="mt-4 text-center">
                                            <p className="text-sm font-bold text-slate-800">สแกนเพื่อเข้าเรียน</p>
                                            <p className="text-xs text-slate-500 mt-1">หมดอายุใน 10 นาที</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4 text-center md:text-left">
                                        <div>
                                            <h3 className="font-bold text-xl text-indigo-700">QR Code Check-in</h3>
                                            <p className="text-slate-500 text-sm">ให้นักเรียนสแกนเพื่อลงเวลาเรียนอัตโนมัติ</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" onClick={handleRefreshQRStats} className="gap-2">
                                                <Loader2 className="h-4 w-4" /> อัปเดตข้อมูล
                                            </Button>
                                            <Button variant="secondary" onClick={() => window.open(qrUrl, '_blank')} className="gap-2">
                                                เปิดลิงก์สำหรับทดสอบ
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Large Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center font-bold text-slate-700">#</TableHead>
                                            <TableHead className="w-[200px] font-bold text-slate-700">นักเรียน</TableHead>
                                            {checkInMode === 'qr' && <TableHead className="text-center font-bold text-slate-700">เวลา (Time)</TableHead>}
                                            <TableHead className="text-center font-bold text-slate-700">สถานะ (Status)</TableHead>
                                            <TableHead className="w-[300px] font-bold text-slate-700">หมายเหตุ (Comment)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student, idx) => {
                                            const status = attendanceData[student._id]?.status || 'Present';
                                            return (
                                                <TableRow key={student._id} className="hover:bg-slate-50 h-[70px]">
                                                    <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-lg text-slate-800">
                                                            {student.studentName || student.displayName}
                                                        </div>
                                                        {student.studentClass && <div className="text-xs text-slate-400">{student.studentClass}</div>}
                                                    </TableCell>
                                                    {checkInMode === 'qr' && (
                                                        <TableCell className="text-center text-slate-600 font-mono text-sm">
                                                            {attendanceData[student._id]?.time || '-'}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        {checkInMode === 'qr' && status !== 'Present' ? (
                                                            <div className="text-center text-slate-400 text-sm italic">รอสแกน...</div>
                                                        ) : (
                                                            <div className="flex justify-center gap-2">
                                                                {[
                                                                    { val: 'Present', icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
                                                                    { val: 'Late', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                                                                    { val: 'Leave', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
                                                                    { val: 'Absent', icon: X, color: 'text-red-600', bg: 'bg-red-100' }
                                                                ].map((opt) => (
                                                                    <button
                                                                        key={opt.val}
                                                                        onClick={() => handleStatusChange(student._id, opt.val)}
                                                                        className={`
                                                                        w-10 h-10 rounded-full flex items-center justify-center transition-all border-2
                                                                        ${status === opt.val
                                                                                ? `${opt.bg} ${opt.color} border-current scale-110 shadow-sm`
                                                                                : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300'
                                                                            }
                                                                    `}
                                                                        title={opt.val}
                                                                    >
                                                                        <opt.icon className="w-5 h-5" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            placeholder={status === 'Present' ? '-' : 'ระบุเหตุผล...'}
                                                            className={`h-10 ${status === 'Present' ? 'bg-slate-50 text-slate-300' : 'bg-white'}`}
                                                            disabled={status === 'Present'}
                                                            value={attendanceData[student._id]?.comment || ''}
                                                            onChange={e => handleCommentChange(student._id, e.target.value)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 z-20">
                                <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6">
                                    ย้อนกลับ
                                </Button>
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-lg shadow-lg"
                                    disabled={saving}
                                >
                                    {saving && !evaluationMode ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                                    บันทึกเท่านั้น (Only Attendance)
                                </Button>
                                <Button
                                    onClick={() => handleSubmit(true)}
                                    className="bg-green-600 hover:bg-green-700 h-12 px-8 text-lg shadow-lg"
                                    disabled={saving}
                                >
                                    {saving && evaluationMode ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                                    บันทึกและประเมินผล (Submit & Eval)
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="h-full flex flex-col">
                            {/* Step 3: Evaluation Header */}
                            <div className="p-4 bg-yellow-50 border-b border-yellow-100 mb-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                        <Save className="h-5 w-5" />
                                        ประเมินผลการเรียน (Evaluation)
                                    </h3>
                                    <p className="text-xs text-yellow-700">ให้คะแนนทักษะสำหรับนักเรียนที่มาเรียนวันนี้</p>
                                </div>
                                <div className="text-sm font-bold text-slate-500">
                                    {students.filter(s => evaluations[s._id]).length} คน
                                </div>
                            </div>

                            {/* Evaluation Form List */}
                            <div className="space-y-4 px-4 pb-20">
                                {students.map((student, idx) => {
                                    // Only show if Present or Late
                                    const status = attendanceData[student._id]?.status;
                                    if (status !== 'Present' && status !== 'Late') return null;

                                    return (
                                        <div key={student._id} className="bg-white border rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-4 border-b pb-2">
                                                <div>
                                                    <div className="font-bold text-lg">{idx + 1}. {student.studentName || student.displayName}</div>
                                                    <div className="text-xs text-slate-500">{student.studentClass}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-slate-500">ครั้งที่ (Period):</label>
                                                    <Input
                                                        type="number"
                                                        className="w-16 h-8 text-center"
                                                        value={studentPeriods[student._id] || 1}
                                                        onChange={(e) => handleEvaluationPeriodChange(student._id, parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                {SKILL_STRUCTURE.map((cat, catIdx) => (
                                                    <div key={catIdx} className="space-y-3">
                                                        <h4 className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{cat.category}</h4>
                                                        {cat.items.map(item => (
                                                            <div key={item.id} className="flex items-center justify-between gap-4">
                                                                <label className="text-xs text-slate-700 w-1/2">{item.label}</label>
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max={item.max}
                                                                        step="1"
                                                                        value={evaluations[student._id]?.[item.id] || 0}
                                                                        onChange={(e) => handleEvaluationScoreChange(student._id, item.id, parseInt(e.target.value))}
                                                                        className="flex-1"
                                                                    />
                                                                    <span className="text-sm font-bold w-6 text-center">{evaluations[student._id]?.[item.id] || 0}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-200 flex justify-end gap-3 z-30 shadow-lg" style={{ width: '100%' }}>
                                <Button variant="outline" onClick={() => onClose()} className="h-12 px-6">
                                    เสร็จสิ้น (Skip Evaluation)
                                </Button>
                                <Button
                                    onClick={handleSubmitEvaluations}
                                    className="bg-green-600 hover:bg-green-700 h-12 px-8 text-lg"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 h-5 w-5" />}
                                    ยืนยันผลการประเมิน
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}
