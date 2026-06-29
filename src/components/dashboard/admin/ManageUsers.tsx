import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, Filter, Eye, Trash2, UserCheck, Shield, Key, Copy, Edit2, Save, X, BookOpen, RefreshCw, Cpu, Wifi, BarChart3, Database, Globe, Cat, Box, Terminal, Gamepad2, Code2, Puzzle, Layout, Clock, User as UserIcon, CheckCircle, XCircle, MoreVertical, Calendar, LogOut, ChevronRight, FileText, Plus, History as HistoryIcon, Upload, FileSpreadsheet, Settings } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Label } from '@/components/ui/label';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface User {
    _id: string;
    displayName: string;
    email: string;
    username?: string;
    photoURL?: string;
    role: 'student' | 'teacher' | 'admin';
    isApproved: boolean;
    createdAt: string;
    nickname?: string; // [NEW]
    citizenId?: string; // [NEW] เลขบัตรประชาชน
    studentClass?: string;
    studentName?: string;
    parentName?: string;
    educationLevel?: string;
    studyTimes?: string[];
    enrolledSubjects?: string[];
    school?: string;
    registeredClasses?: { className: string; classTime: string; }[];
    authorizedSubjects?: string[]; // For teachers
    status?: 'studying' | 'drop' | 'resigned' | 'graduated';
    passwordHash?: string; // For update only
    plainPassword?: string; // Unencrypted password
    statusNote?: string; // [NEW]
    registeredCourses?: {
        subject: string;
        teacherId: string;
        teacherName: string;
        day: string;
        time: string;
        startDate: string;
        endDate: string;
        totalSessions?: number;
        usedSessions?: number;
        extensionHistory?: {
            extendedAt: string;
            previousEndDate: string;
            newEndDate: string;
            sessionsAdded: number;
            note: string;
        }[];
        level?: string; // [NEW] basic, intermediate, advanced
        status?: string; // [NEW] active, drop, graduated, resigned
    }[];
    isRegistry?: boolean; // [NEW]
    studentId?: string; // [NEW] Auto-generated 1/69
    studentIdMap?: string; // [Legacy]
    birthDate?: string; // [NEW]
    studentPhone?: string; // [NEW]
    address?: string; // [NEW]
    parentRelation?: string; // [NEW]
    parentPhone?: string; // [NEW]
    parentAddress?: string; // [NEW]
    prefix?: string; // [NEW]
    firstName?: string; // [NEW]
    lastName?: string; // [NEW]
    age?: number; // [NEW]
    gender?: string; // [NEW]
    ethnicity?: string; // [NEW]
    nationality?: string; // [NEW]
    religion?: string; // [NEW]
    enrollmentType?: string; // [NEW]
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    'studying': { label: 'กำลังเรียน', color: 'bg-green-100 text-green-700' },
    'drop': { label: 'ดรอป', color: 'bg-orange-100 text-orange-700' },
    'resigned': { label: 'ลาออก', color: 'bg-red-100 text-red-700' },
    'graduated': { label: 'จบการศึกษา', color: 'bg-indigo-100 text-indigo-700' },
};

// Helper to identify legacy registry users (numeric usernames from Excel)
const isLegacyRegistry = (u: User) => {
    // If explicitly flagged
    if (u.isRegistry) return true;
    // Heuristic: Username is all digits (e.g. "01", "105") OR matches studentIdMap pattern if we had it
    // For now, strict digit check on username is a good proxy for the Excel imports shown in screenshot
    return u.username && /^\d+$/.test(u.username);
};

export default function ManageUsers({ mode = 'manual' }: { mode?: 'manual' | 'registry' }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    // const [roleFilter, setRoleFilter] = useState<string>('student'); // Removed: Always student
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all'); // [NEW]
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [allSubjects, setAllSubjects] = useState<{ _id: string, name: string }[]>([]); // [NEW] Real Subjects from DB

    // ... (State for details/edit remains the same) ...
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // [NEW] Import State
    const [isSanitizing, setIsSanitizing] = useState(false);

    // [REMOVED] handleSanitizeSystem

    const handleExportPDF = async () => {
        if (users.length === 0) {
            toast.error('ไม่พบข้อมูลผู้ใช้');
            return;
        }

        const toastId = toast.loading('กำลังเตรียมข้อมูล PDF...');

        try {
            // 1. Prepare Data
            let subjectsToExport: string[] = [];
            if (exportSubject === 'all') {
                subjectsToExport = availableSubjects;
            } else {
                subjectsToExport = [exportSubject];
            }

            const doc = new jsPDF();

            // 2. Load Thai Fonts (Regular & Bold)
            const loadFonts = async () => {
                try {
                    const [regRes, boldRes] = await Promise.all([
                        fetch('https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Regular.ttf'),
                        fetch('https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Bold.ttf')
                    ]);

                    if (!regRes.ok || !boldRes.ok) throw new Error('Font fetch failed');

                    const [regBlob, boldBlob] = await Promise.all([
                        regRes.blob(),
                        boldRes.blob()
                    ]);

                    const loadFontFile = (blob: Blob, filename: string, fontName: string, fontStyle: string) => {
                        return new Promise<void>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const fontBase64 = reader.result?.toString().split(',')[1];
                                if (fontBase64) {
                                    doc.addFileToVFS(filename, fontBase64);
                                    doc.addFont(filename, fontName, fontStyle);
                                }
                                resolve();
                            };
                            reader.readAsDataURL(blob);
                        });
                    };

                    await Promise.all([
                        loadFontFile(regBlob, 'Sarabun-Regular.ttf', 'Sarabun', 'normal'),
                        loadFontFile(boldBlob, 'Sarabun-Bold.ttf', 'Sarabun', 'bold')
                    ]);

                    doc.setFont('Sarabun', 'normal'); // Set default

                } catch (e) {
                    console.warn('Failed to load Thai fonts', e);
                }
            };

            await loadFonts();

            // 3. Generate Content
            let connectionY = 20; // Start Y position

            // Header
            doc.setFontSize(18);
            doc.text('รายชื่อนักเรียน (Student List)', 14, 15);
            doc.setFontSize(10);
            doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);
            connectionY += 10;

            let grandTotal = 0;

            for (const subject of subjectsToExport) {
                const subjectUsers = users.filter(u =>
                    u.role === 'student' &&
                    (u.enrolledSubjects?.includes(subject) || u.registeredClasses?.some(c => c.className === subject) || u.registeredCourses?.some(rc => rc.subject === subject))
                );

                if (subjectUsers.length === 0) continue;

                // Subject Header
                doc.setFontSize(14);
                // doc.setTextColor(0, 0, 0);
                doc.text(`วิชา: ${subject} (${subjectUsers.length} คน)`, 14, connectionY + 10);
                connectionY += 15;

                // Table Rows
                const tableData = subjectUsers.map((user, index) => [
                    index + 1,
                    user.studentId || user.studentIdMap || '-',
                    user.displayName || user.studentName || '-',
                    user.nickname || '-',
                    user.studentPhone || '-',
                    user.parentName || '-',
                    user.parentPhone || '-',
                    STATUS_MAP[user.status || 'studying']?.label || 'กำลังเรียน'
                ]);

                autoTable(doc, {
                    startY: connectionY,
                    head: [['#', 'ID', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์โทร', 'ผู้ปกครอง', 'เบอร์ผู้ปกครอง', 'สถานะ']],
                    body: tableData,
                    styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
                    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' }, // Indigo-700
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 20 },
                        2: { cellWidth: 40 },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 30 },
                        6: { cellWidth: 25 },
                        7: { cellWidth: 20 }
                    },
                    margin: { top: 20 },
                    didDrawPage: (data) => {
                        // Header on new pages?
                    }
                });

                // Update Y for next table
                // @ts-ignore
                connectionY = doc.lastAutoTable.finalY + 10;
                grandTotal += subjectUsers.length;
            }

            // Footer Summary
            doc.setFontSize(12);
            doc.text(`รวมทั้งหมด: ${grandTotal} คน`, 14, connectionY + 10);

            doc.save(`Student_List_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.dismiss(toastId);
            toast.success('ดาวน์โหลด PDF สำเร็จ');

        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.dismiss(toastId);
            toast.error('เกิดข้อผิดพลาดในการสร้าง PDF');
        }
    };

    // Excel Import Logic
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('ไม่พบข้อมูลในไฟล์ Excel');
                    setIsImporting(false);
                    return;
                }

                // Map Excel columns to DTO
                const mappedData = data.map((row: any) => ({
                    studentIdMap: row['ID'] ? String(row['ID']) : undefined,
                    prefix: row['คำนำหน้า'],
                    firstName: row['ชื่อ'],
                    lastName: row['นามสกุล'],
                    nickname: row['ชื่อเล่น'],
                    birthDate: row['วัน/เดือน/ปี เกิด'],
                    age: row['อายุ'] ? Number(row['อายุ']) : undefined,
                    gender: row['เพศ'],
                    ethnicity: row['เชื้อชาติ'],
                    nationality: row['สัญชาติ'],
                    religion: row['ศาสนา'],
                    school: row['โรงเรียน'],
                    studentClass: row['ระดับชั้น'],
                    address: row['ที่อยู่นักเรียน'],
                    studentPhone: row['เบอร์นักเรียน'],
                    parentName: row['ผู้ปกครอง'],
                    parentRelation: row['ความสัมพันธ์'],
                    parentAddress: row['ที่อยู่ผู้ปกครอง'],
                    parentPhone: row['เบอร์ผู้ปกครอง'],
                    enrollmentType: row['สมัครเรียนหลักสูตร'],
                    status: row['สถานะ'] === 'drop' ? 'drop' : 'studying',
                    role: 'student',
                    email: row['อีเมลล์'] !== '-' ? row['อีเมลล์'] : undefined,
                    isRegistry: true // Mark as Registry Import
                }));

                const token = await currentUser?.getIdToken();
                const res = await fetch(API_ENDPOINTS.ADMIN.IMPORT_REGISTRY, { // Use simplified endpoint or check exist
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(mappedData)
                });

                if (!res.ok) throw new Error('Failed to import');

                const result = await res.json();
                toast.success(`นำเข้าข้อมูลสำเร็จ: ${result.count} รายการ`);
                fetchAllUsers(); // Refresh

            } catch (error) {
                console.error('Import Error:', error);
                toast.error('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
            } finally {
                setIsImporting(false);
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    // Password Reset State
    const [newPassword, setNewPassword] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);

    const [teachers, setTeachers] = useState<{ _id: string, displayName: string }[]>([]); // [NEW]

    // Optimized: Teachers are derived from all users, no separate fetch needed.
    // However, if we want to ensure we have the latest list when opening dialogs,
    // we can filter the 'users' state.
    const getTeachers = () => {
        return users.filter(u => u.role === 'teacher' && u.isApproved);
    };

    const fetchAllUsers = async () => {
        // ... (Fetch logic remains same) ...
        if (!currentUser) return;
        // fetchTeachers(); // REMOVED: Derived within main fetch


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

            setUsers(data);

            // Populate teachers list
            const teacherList = data.filter((u: any) => u.role === 'teacher' && u.isApproved);
            setTeachers(teacherList);

            // Extract subjects
            const subjects = new Set<string>();
            data.forEach((u: User) => {
                u.enrolledSubjects?.forEach(s => subjects.add(s));
                u.registeredClasses?.forEach(c => subjects.add(c.className));
                u.registeredCourses?.forEach(c => subjects.add(c.subject));
            });
            setAvailableSubjects(Array.from(subjects));

        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (!res.ok) throw new Error('Failed to fetch subjects');
            const data = await res.json();
            setAllSubjects(data);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
            // Fallback: keep using availableSubjects derived from users if API fails?
        }
    };

    useEffect(() => {
        fetchAllUsers();
        fetchSubjects();
    }, []);

    useEffect(() => {
        let filtered = users;

        // Force filter to only show students AND filter by Mode
        filtered = filtered.filter(u => {
            if (u.role !== 'student') return false;

            const isReg = isLegacyRegistry(u);
            if (mode === 'manual') {
                // Show ONLY non-registry users
                return !isReg;
            } else {
                // Show ONLY registry users
                return isReg;
            }
        });

        // Filter by subject
        if (subjectFilter !== 'all') {
            filtered = filtered.filter(user =>
                user.enrolledSubjects?.includes(subjectFilter) ||
                user.registeredClasses?.some(c => c.className === subjectFilter)
            );
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.displayName?.toLowerCase().includes(query) ||
                user.studentName?.toLowerCase().includes(query) ||
                user.firstName?.toLowerCase().includes(query) ||
                user.lastName?.toLowerCase().includes(query) ||
                user.nickname?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.username?.toLowerCase().includes(query) ||
                user.studentClass?.toLowerCase().includes(query) ||
                user.citizenId?.toLowerCase().includes(query) ||
                user.studentId?.toLowerCase().includes(query) ||
                user.studentIdMap?.toLowerCase().includes(query) ||
                user.studentPhone?.toLowerCase().includes(query) ||
                user.parentName?.toLowerCase().includes(query) ||
                user.parentPhone?.toLowerCase().includes(query) ||
                user.school?.toLowerCase().includes(query) ||
                user.address?.toLowerCase().includes(query)
            );
        }

        // Filter by Status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(user => (user.status || 'studying') === statusFilter);
        }

        setFilteredUsers(filtered);
    }, [searchQuery, subjectFilter, statusFilter, users]); // Added statusFilter dependency

    // ... (Handlers remain mostly the same) ...
    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setEditForm(user);
        setIsEditing(false);
        setNewPassword('');
        setShowDetails(true);
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel edit
            setIsEditing(false);
            setEditForm(selectedUser || {});
        } else {
            // Start edit
            setIsEditing(true);
            setEditForm(selectedUser || {});
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedUser || !currentUser) return;

        setActionLoading(true);
        try {
            const token = await currentUser.getIdToken();

            // Prepare payload: remove _id and immutable fields
            const { _id, createdAt, role, isApproved, ...updatePayload } = editForm;

            // If password was reset, include it
            if (newPassword) {
                updatePayload.passwordHash = newPassword; // Backend will hash it
            }

            // Ensure status is included if it was edited
            if (editForm.status) {
                updatePayload.status = editForm.status;
            }
            if (editForm.statusNote !== undefined) {
                // Even if empty string, we might want to clear it, so send it.
                // But typically if it's visible, we send it.
                updatePayload.statusNote = editForm.statusNote;
            }

            // Use /api/users/:id with PATCH method
            const response = await fetch(`${API_ENDPOINTS.USERS.LIST}/${selectedUser._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) throw new Error('Failed to update');

            const updatedUser = await response.json();

            // Update local state
            setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
            setSelectedUser(updatedUser);
            setIsEditing(false);
            setNewPassword('');
            toast.success('บันทึกข้อมูลสำเร็จ');
        } catch (error) {
            console.error(error);
            toast.error('บันทึกข้อมูลล้มเหลว');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            return;
        }

        if (!currentUser) {
            toast.error('กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        setActionLoading(true);
        try {
            const token = await currentUser.getIdToken();

            const response = await fetch(API_ENDPOINTS.ADMIN.DELETE_USER(userId), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            toast.success('ลบผู้ใช้สำเร็จ');
            setShowDetails(false);
            fetchAllUsers();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้');
        } finally {
            setActionLoading(false);
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let pass = '';
        for (let i = 0; i < 8; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(pass);
        toast.success('สร้างรหัสผ่านใหม่แล้ว (อย่าลืมกดบันทึก)');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`คัดลอก ${label} แล้ว`);
    };

    const exportSingleUserWord = async (userToExport: User) => {
        if (!userToExport) return;
        try {
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: [
                            new Paragraph({
                                text: `ประวัตินักเรียน: ${userToExport.studentName || userToExport.displayName || '-'}`,
                                heading: HeadingLevel.HEADING_1,
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({ text: ` ` }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "ข้อมูลส่วนตัว", bold: true, size: 28 }),
                                ],
                            }),
                            new Paragraph({ text: `รหัสนักเรียน: ${userToExport.studentId || userToExport.studentIdMap || '-'}` }),
                            new Paragraph({ text: `เลขบัตรประชาชน: ${userToExport.citizenId || '-'}` }),
                            new Paragraph({ text: `ชื่อเล่น: ${userToExport.nickname || '-'}` }),
                            new Paragraph({ text: `ระดับการศึกษา: ${userToExport.educationLevel ? EDUCATION_LEVEL_MAP[userToExport.educationLevel] || userToExport.educationLevel : '-'}` }),
                            new Paragraph({ text: `โรงเรียน: ${userToExport.school || '-'}` }),
                            new Paragraph({ text: `วันเกิด: ${userToExport.birthDate || '-'}` }),
                            new Paragraph({ text: `อายุ: ${userToExport.age || '-'}` }),
                            new Paragraph({ text: `เพศ: ${userToExport.gender || '-'}` }),
                            new Paragraph({ text: `เบอร์โทรศัพท์(นักเรียน): ${userToExport.studentPhone || '-'}` }),
                            new Paragraph({ text: `ที่อยู่: ${userToExport.address || '-'}` }),
                            new Paragraph({ text: ` ` }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "ข้อมูลผู้ปกครอง", bold: true, size: 28 }),
                                ],
                            }),
                            new Paragraph({ text: `ชื่อผู้ปกครอง: ${userToExport.parentName || '-'}` }),
                            new Paragraph({ text: `ความสัมพันธ์: ${userToExport.parentRelation || '-'}` }),
                            new Paragraph({ text: `เบอร์โทรศัพท์(ผู้ปกครอง): ${userToExport.parentPhone || '-'}` }),
                            new Paragraph({ text: `ที่อยู่ผู้ปกครอง: ${userToExport.parentAddress || '-'}` }),
                            new Paragraph({ text: ` ` }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "สถานะการเรียน", bold: true, size: 28 }),
                                ],
                            }),
                            new Paragraph({ text: `สถานะ: ${STATUS_MAP[userToExport.status || 'studying']?.label || 'กำลังเรียน'}` }),
                        ],
                    },
                ],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Student_Profile_${userToExport.studentId || userToExport.username || 'Export'}.docx`);
            toast.success('ส่งออกไฟล์ Word สำเร็จ');
        } catch (error) {
            console.error('Export Word Error:', error);
            toast.error('เกิดข้อผิดพลาดในการสร้างไฟล์ Word');
        }
    };

    const exportSingleUserPDF = async (userToExport: User) => {
        if (!userToExport) return;
        const toastId = toast.loading('กำลังเตรียมข้อมูล PDF...');
        try {
            const doc = new jsPDF();
            
            const [regRes, boldRes] = await Promise.all([
                fetch('https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Regular.ttf'),
                fetch('https://raw.githubusercontent.com/cadsondemak/Sarabun/master/fonts/Sarabun-Bold.ttf')
            ]);
            const [regBlob, boldBlob] = await Promise.all([regRes.blob(), boldRes.blob()]);

            const loadFontFile = (blob: Blob, filename: string, fontName: string, fontStyle: string) => {
                return new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const fontBase64 = reader.result?.toString().split(',')[1];
                        if (fontBase64) {
                            doc.addFileToVFS(filename, fontBase64);
                            doc.addFont(filename, fontName, fontStyle);
                        }
                        resolve();
                    };
                    reader.readAsDataURL(blob);
                });
            };

            await Promise.all([
                loadFontFile(regBlob, 'Sarabun-Regular.ttf', 'Sarabun', 'normal'),
                loadFontFile(boldBlob, 'Sarabun-Bold.ttf', 'Sarabun', 'bold')
            ]);

            doc.setFont('Sarabun', 'normal');
            
            doc.setFontSize(20);
            doc.setFont('Sarabun', 'bold');
            doc.text(`ประวัตินักเรียน: ${userToExport.studentName || userToExport.displayName || '-'}`, 14, 20);
            
            doc.setFontSize(14);
            doc.text('ข้อมูลส่วนตัว', 14, 35);
            
            doc.setFontSize(12);
            doc.setFont('Sarabun', 'normal');
            doc.text(`รหัสนักเรียน: ${userToExport.studentId || userToExport.studentIdMap || '-'}`, 14, 45);
            doc.text(`เลขบัตรประชาชน: ${userToExport.citizenId || '-'}`, 100, 45);
            
            doc.text(`ชื่อเล่น: ${userToExport.nickname || '-'}`, 14, 55);
            doc.text(`ระดับการศึกษา: ${userToExport.educationLevel ? EDUCATION_LEVEL_MAP[userToExport.educationLevel] || userToExport.educationLevel : '-'}`, 100, 55);
            
            doc.text(`โรงเรียน: ${userToExport.school || '-'}`, 14, 65);
            doc.text(`วันเกิด: ${userToExport.birthDate || '-'}`, 100, 65);
            
            doc.text(`อายุ: ${userToExport.age || '-'}`, 14, 75);
            doc.text(`เพศ: ${userToExport.gender || '-'}`, 100, 75);
            
            doc.text(`เบอร์โทรศัพท์(นักเรียน): ${userToExport.studentPhone || '-'}`, 14, 85);
            doc.text(`ที่อยู่: ${userToExport.address || '-'}`, 14, 95);
            
            doc.setFontSize(14);
            doc.setFont('Sarabun', 'bold');
            doc.text('ข้อมูลผู้ปกครอง', 14, 115);
            
            doc.setFontSize(12);
            doc.setFont('Sarabun', 'normal');
            doc.text(`ชื่อผู้ปกครอง: ${userToExport.parentName || '-'}`, 14, 125);
            doc.text(`ความสัมพันธ์: ${userToExport.parentRelation || '-'}`, 100, 125);
            
            doc.text(`เบอร์โทรศัพท์(ผู้ปกครอง): ${userToExport.parentPhone || '-'}`, 14, 135);
            doc.text(`ที่อยู่ผู้ปกครอง: ${userToExport.parentAddress || '-'}`, 14, 145);
            
            doc.setFontSize(14);
            doc.setFont('Sarabun', 'bold');
            doc.text('สถานะการเรียน', 14, 165);
            
            doc.setFontSize(12);
            doc.setFont('Sarabun', 'normal');
            doc.text(`สถานะ: ${STATUS_MAP[userToExport.status || 'studying']?.label || 'กำลังเรียน'}`, 14, 175);
            
            doc.save(`Student_Profile_${userToExport.studentId || userToExport.username || 'Export'}.pdf`);
            toast.dismiss(toastId);
            toast.success('ดาวน์โหลด PDF สำเร็จ');
        } catch (error) {
            toast.dismiss(toastId);
            console.error('PDF Export Error:', error);
            toast.error('เกิดข้อผิดพลาดในการสร้าง PDF');
        }
    };

    const getRoleBadge = (role: string, isApproved: boolean) => {
        // ... (Same function) ...
        if (role === 'admin') {
            return <Badge variant="destructive" className="rounded-none px-3">แอดมิน</Badge>;
        }
        if (role === 'teacher') {
            return isApproved ? (
                <Badge variant="default" className="rounded-none px-3 bg-blue-500 hover:bg-blue-600">ครู</Badge>
            ) : (
                <Badge variant="secondary" className="rounded-none px-3">ครู (รออนุมัติ)</Badge>
            );
        }
        return <Badge variant="outline" className="rounded-none px-3 border-slate-300 text-slate-700">นักเรียน</Badge>;
    };

    // Helper to render subjects with icons
    const renderSubjectWithIcon = (subjectName: string) => {
        const lowerSubject = subjectName.toLowerCase();
        let icon = <BookOpen className="w-4 h-4 text-slate-500" />;
        let colorClass = "bg-slate-50 text-slate-700 border-slate-200";

        if (lowerSubject.includes('arduino')) {
            icon = <Cpu className="w-4 h-4 text-cyan-600" />;
            colorClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
        } else if (lowerSubject.includes('iot') || lowerSubject.includes('internet') || lowerSubject.includes('wifi')) {
            icon = <Wifi className="w-4 h-4 text-blue-600" />;
            colorClass = "bg-blue-50 text-blue-700 border-blue-200";
        } else if (lowerSubject.includes('data') || lowerSubject.includes('science')) {
            icon = <BarChart3 className="w-4 h-4 text-emerald-600" />;
            colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        } else if (lowerSubject.includes('scratch')) {
            icon = <Cat className="w-4 h-4 text-orange-500" />;
            colorClass = "bg-orange-50 text-orange-700 border-orange-200";
        } else if (lowerSubject.includes('web') || lowerSubject.includes('html') || lowerSubject.includes('site')) {
            icon = <Globe className="w-4 h-4 text-indigo-500" />;
            colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
        } else if (lowerSubject.includes('roblox')) {
            icon = <Box className="w-4 h-4 text-red-500" />;
            colorClass = "bg-red-50 text-red-700 border-red-200";
        } else if (lowerSubject.includes('python') || lowerSubject.includes('java') || lowerSubject.includes('code')) {
            icon = <Terminal className="w-4 h-4 text-yellow-600" />;
            colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
        } else if (lowerSubject.includes('microbit')) {
            icon = <Cpu className="w-4 h-4 text-green-600" />;
            colorClass = "bg-green-50 text-green-700 border-green-200";
        } else if (lowerSubject.includes('game') || lowerSubject.includes('esport')) {
            icon = <Gamepad2 className="w-4 h-4 text-purple-600" />;
            colorClass = "bg-purple-50 text-purple-700 border-purple-200";
        }

        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-none border ${colorClass} w-full min-w-[100px]`}>
                {icon}
                <span className="truncate font-medium text-xs font-itim">{subjectName}</span>
            </div>
        );
    };


    // ... (Export Dialog state remains) ...
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportSubject, setExportSubject] = useState<string>('all');

    // Extension Dialog State
    const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
    const [extensionDate, setExtensionDate] = useState<string>('');
    const [extensionSessions, setExtensionSessions] = useState<number>(0);
    const [extensionPreset, setExtensionPreset] = useState<string>('4');
    const [extensionNote, setExtensionNote] = useState<string>('');
    const [extensionCourseIndex, setExtensionCourseIndex] = useState<number | null>(null);

    // Add Course Dialog State [NEW]
    const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false);
    const [isAddCourseCustomQuota, setIsAddCourseCustomQuota] = useState(false); // [NEW] Explicit state
    const [newCourse, setNewCourse] = useState({
        subject: '',
        teacherId: '',
        day: '',
        time: '',
        startDate: '',
        endDate: '',
        customTime: '', // For "Other" time
        totalSessions: 4, // Changed default to 4 for consistency
        level: 'Basic' // [NEW]
    });

    // Edit Course Schedule State
    const [isEditScheduleDialogOpen, setIsEditScheduleDialogOpen] = useState(false);
    const [editScheduleIdx, setEditScheduleIdx] = useState<number | null>(null);
    const [editScheduleData, setEditScheduleData] = useState({
        day: '',
        time: '',
        customTime: '',
        status: 'active',
        startDate: '',
        endDate: '',
        totalSessions: 0,
        subject: '', // Display Only
        teacherName: '' // Display Only
    });

    const handleOpenEditSchedule = (idx: number, course: any) => {
        if (course.isLegacy) {
            toast.error('รายวิชาจากระบบเก่าไม่สามารถแก้ไขเวลาได้ (ต้องลบและเพิ่มใหม่)');
            return;
        }
        setEditScheduleIdx(idx);
        const timeOptions = [
            '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00', '15:30 - 17:30',
            '16:00 - 18:00', '16:30 - 18:30', '17:00 - 19:00', '17:30 - 19:30',
            '18:00 - 20:00', '20:00 - 22:00'
        ];
        const isCustom = !timeOptions.includes(course.time);
        setEditScheduleData({
            day: course.day || '',
            time: isCustom ? 'อื่นๆ (ระบุเวลาเอง)' : (course.time || ''),
            customTime: isCustom ? (course.time || '') : '',
            status: course.status || 'active',
            startDate: course.startDate || '',
            endDate: course.endDate || '',
            totalSessions: course.totalSessions || 0,
            subject: course.subject || '-',
            teacherName: course.teacherName || '-'
        });
        setIsEditScheduleDialogOpen(true);
    };

    const handleSaveEditSchedule = () => {
        if (editScheduleIdx === null) return;

        const finalTime = (editScheduleData.time === 'อื่นๆ (ระบุเวลาเอง)') ? editScheduleData.customTime : editScheduleData.time;
        if (!finalTime) { toast.error('กรุณาระบุเวลา'); return; }

        const currentCourses = [...(editForm.registeredCourses || [])];
        if (currentCourses[editScheduleIdx]) {
            currentCourses[editScheduleIdx] = {
                ...currentCourses[editScheduleIdx],
                day: editScheduleData.day,
                time: finalTime,
                status: editScheduleData.status,
                startDate: editScheduleData.startDate,
                endDate: editScheduleData.endDate,
                totalSessions: editScheduleData.totalSessions
            };
            setEditForm({ ...editForm, registeredCourses: currentCourses });
            toast.success('อัปเดตเวลาเรียนในแบบร่างแล้ว (กดบันทึกเพื่อยืนยัน)');
            setIsEditScheduleDialogOpen(false);
        }
    };

    const handleOpenAddCourse = () => {
        setNewCourse({
            subject: '',
            teacherId: '',
            day: '',
            time: '',
            startDate: '',
            endDate: '',
            customTime: '',
            totalSessions: 4,
            level: 'Basic'
        });
        setIsAddCourseCustomQuota(false); // Default to standard
        setIsAddCourseDialogOpen(true);
    };

    const handleConfirmAddCourse = () => {
        if (!newCourse.subject || !newCourse.teacherId || !newCourse.startDate || !newCourse.endDate) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        let finalTime = newCourse.time;
        if (newCourse.time === 'อื่นๆ (ระบุเวลาเอง)') {
            if (!newCourse.customTime) {
                toast.error('กรุณาระบุเวลาเรียน');
                return;
            }
            finalTime = newCourse.customTime;
        }

        const teacherCtx = teachers.find(t => t._id === newCourse.teacherId);
        const subjectCtx = allSubjects.find(s => s.name === newCourse.subject);

        const coursePayload = {
            subject: newCourse.subject,
            subjectId: subjectCtx?._id, // [NEW] Inject ID for robust linking
            teacherId: newCourse.teacherId,
            teacherName: teacherCtx?.displayName || 'Unknown',
            day: newCourse.day,
            time: finalTime, startDate: newCourse.startDate,
            endDate: newCourse.endDate,
            totalSessions: Number(newCourse.totalSessions) || 0,
            usedSessions: 0,
            extensionHistory: [],
            level: newCourse.level // [NEW]
        };



        // In handleConfirmAddCourse:
        const currentCourses = editForm.registeredCourses || selectedUser?.registeredCourses || [];
        const currentEnrolled = editForm.enrolledSubjects || selectedUser?.enrolledSubjects || [];

        let newEnrolled = [...currentEnrolled];
        if (!newEnrolled.includes(newCourse.subject)) {
            newEnrolled.push(newCourse.subject);
        }

        setEditForm({
            ...editForm,
            registeredCourses: [...currentCourses, coursePayload as any],
            enrolledSubjects: newEnrolled
        });
        toast.success('เพิ่มคอร์สเรียนสำเร็จ (กดบันทึกเพื่อยืนยัน)');
    };

    const openExtensionDialog = (index: number, currentEndDate: string) => {
        setExtensionCourseIndex(index);
        setExtensionDate(currentEndDate ? currentEndDate.split('T')[0] : '');
        setExtensionSessions(4);
        setExtensionPreset('4');
        setExtensionNote('');
        setIsExtensionDialogOpen(true);
    };

    const confirmExtension = async () => {
        if (extensionCourseIndex === null || !selectedUser || !selectedUser.registeredCourses) return;

        const newDate = new Date(extensionDate);
        if (isNaN(newDate.getTime())) {
            toast.error('วันที่ไม่ถูกต้อง');
            return;
        }

        // Logic: specific frontend update, effectively queuing the update for "Save"
        // But since we want to record history, we manually construct the updated array for 'editForm'
        // Ideally we should allow saving immediately or part of the form.
        // Let's make it part of the 'editForm' state so 'Save Changes' commits it.

        const updatedCourses = [...(editForm.registeredCourses || selectedUser.registeredCourses)];
        const targetCourse = { ...updatedCourses[extensionCourseIndex] };

        // Record history
        const historyEntry = {
            extendedAt: new Date().toISOString(),
            previousEndDate: targetCourse.endDate,
            newEndDate: extensionDate,
            sessionsAdded: extensionSessions,
            note: extensionNote
        };

        targetCourse.extensionHistory = [
            ...(targetCourse.extensionHistory || []),
            historyEntry
        ];
        targetCourse.endDate = extensionDate;
        targetCourse.totalSessions = (Number(targetCourse.totalSessions) || 0) + (Number(extensionSessions) || 0);

        updatedCourses[extensionCourseIndex] = targetCourse;

        // Update Edit Form
        setEditForm({ ...editForm, registeredCourses: updatedCourses });

        // Also update the selectedUser locally to reflect "Pending Save" visual state if needed, 
        // but 'editForm' is what is shown during edit mode mostly. 
        // Actually, our UI maps 'selectedUser' for display. We should probably update that for visual feedback if we are in edit mode?
        // Wait, 'isEditing' uses 'editForm'? 
        // Looking at the render: "isEditing ? ( ... inputs ... ) : ( ... text ... )"
        // But the course table uses 'selectedUser.registeredCourses.map'.
        // We need to switch the map source to 'editForm.registeredCourses' if isEditing!

        // This is a bug in my previous refactor: The table reads 'selectedUser' even when editing.
        // It SHOULD read 'editForm' when editing, or we update 'selectedUser' immediately?
        // No, 'editForm' is standard pattern.
        // User has to click "Save Changes" to persist.

        setIsExtensionDialogOpen(false);
        toast.success(`ต่ออายุเรียบร้อย (กด "บันทึกการเปลี่ยนแปลง" เพื่อยืนยัน)`);
    };

    const handleExportExcel = async () => {
        if (users.length === 0) {
            toast.error('ไม่พบข้อมูลผู้ใช้');
            return;
        }

        try {
            const ExcelJS = (await import('exceljs')).default;
            const fileSaverModule = await import('file-saver');
            const saveAs = fileSaverModule.saveAs || fileSaverModule.default;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('รายชื่อนักเรียนละเอียด');

            // 1. Define Detailed Columns
            worksheet.columns = [
                { header: 'ลำดับ', key: 'index', width: 8 },
                { header: 'รหัส (ID)', key: 'studentId', width: 12 },
                { header: 'Username', key: 'username', width: 15 },
                { header: 'คำนำหน้า', key: 'prefix', width: 10 },
                { header: 'ชื่อจริง', key: 'firstName', width: 20 },
                { header: 'นามสกุล', key: 'lastName', width: 20 },
                { header: 'ชื่อเล่น', key: 'nickname', width: 10 },
                { header: 'ห้อง/ระดับชั้น', key: 'level', width: 15 },
                { header: 'โรงเรียน', key: 'school', width: 25 },
                { header: 'วันเกิด', key: 'birthDate', width: 15 },
                { header: 'อายุ', key: 'age', width: 8 },
                { header: 'เบอร์โทรศัพท์', key: 'phone', width: 15 },
                { header: 'ที่อยู่ปัจจุบัน', key: 'address', width: 40 },
                { header: 'ผู้ปกครอง', key: 'parentName', width: 20 },
                { header: 'ความสัมพันธ์', key: 'parentRelation', width: 12 },
                { header: 'เบอร์ผู้ปกครอง', key: 'parentPhone', width: 15 },
                { header: 'วิชาที่ลง', key: 'subjects', width: 30 },
                { header: 'สถานะ', key: 'status', width: 12 },
                { header: 'วันที่สมัคร', key: 'registeredAt', width: 15 },
            ];

            // 2. Beautiful Header Styling
            const headerRow = worksheet.getRow(1);
            headerRow.height = 35;
            headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Sarabun' };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4338CA' } // Indigo-700
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // Set borders for header
            headerRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'thin' },
                    bottom: { style: 'medium' },
                    right: { style: 'thin' }
                };
            });

            // 3. Process Data
            let subjectsToExport: string[] = [];
            if (exportSubject === 'all') {
                subjectsToExport = ['All Students']; // Strategy: One simplified list if "All", or grouped?
                // User asked for "Separate clearly".
                // Let's iterate all subjects if specific subject selected, 
                // BUT if 'all' is selected, maybe listing everyone once is better than duplicates?
                // However, user said "Separate clearly". Grouping by Subject is clearer for class lists.
                // Let's stick to Grouping by Subject if 'all' is strictly "By Subject" or just dump all unique users?
                // Use existing logic: Iterate Subjects.
                subjectsToExport = availableSubjects;
            } else {
                subjectsToExport = [exportSubject];
            }

            let currentRowIndex = 2;
            let grandTotal = 0;

            for (const subject of subjectsToExport) {
                // Filter users for this subject
                const subjectUsers = users.filter(u =>
                    u.role === 'student' &&
                    (u.enrolledSubjects?.includes(subject) || u.registeredClasses?.some(c => c.className === subject) || u.registeredCourses?.some(rc => rc.subject === subject))
                );

                if (subjectUsers.length === 0) continue;

                // Subject Group Header
                const subjectRow = worksheet.getRow(currentRowIndex);
                subjectRow.values = [`วิชา: ${subject} (จำนวน ${subjectUsers.length} คน)`];
                subjectRow.font = { bold: true, size: 14, color: { argb: 'FF1F2937' }, name: 'Sarabun' };
                subjectRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDBEAFE' } // Blue-100
                };
                worksheet.mergeCells(`A${currentRowIndex}:S${currentRowIndex}`); // Merge across all columns
                subjectRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                subjectRow.height = 30;
                // Add top border
                subjectRow.outlineLevel = 0;

                currentRowIndex++;

                // Data Rows
                subjectUsers.forEach((user, index) => {
                    const row = worksheet.getRow(currentRowIndex);

                    // Prepare Subject List String
                    const userSubjects = [
                        ...(user.enrolledSubjects || []),
                        ...(user.registeredClasses?.map(c => c.className) || []),
                        ...(user.registeredCourses?.map(c => c.subject) || [])
                    ].filter((v, i, a) => a.indexOf(v) === i).join(', ');

                    row.values = {
                        index: index + 1,
                        studentId: user.studentId || user.studentIdMap || '-',
                        username: user.username || '-',
                        prefix: user.prefix || '-',
                        firstName: user.firstName || user.studentName?.split(' ')[0] || user.displayName?.split(' ')[0] || '-',
                        lastName: user.lastName || user.studentName?.split(' ').slice(1).join(' ') || '-',
                        nickname: user.nickname || '-',
                        level: user.educationLevel ? (EDUCATION_LEVEL_MAP[user.educationLevel] || user.educationLevel) : '-',
                        school: user.school || '-',
                        birthDate: user.birthDate || '-',
                        age: user.age || '-',
                        phone: user.studentPhone || '-',
                        address: user.address || '-',
                        parentName: user.parentName || '-',
                        parentRelation: user.parentRelation || '-',
                        parentPhone: user.parentPhone || '-',
                        subjects: userSubjects,
                        status: STATUS_MAP[user.status || 'studying']?.label || 'กำลังเรียน',
                        registeredAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'
                    };

                    // Validate borders
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                        };
                        cell.alignment = { vertical: 'middle', wrapText: true };
                        cell.font = { name: 'Sarabun', size: 10 };
                    });

                    // Alternate Row Color
                    if (index % 2 === 1) {
                        row.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF8FAFC' } // Slate-50
                        };
                    }

                    // Status Colors
                    const statusCell = row.getCell('status');
                    if (user.status === 'drop') statusCell.font = { color: { argb: 'D97706' } }; // Amber
                    else if (user.status === 'resigned') statusCell.font = { color: { argb: 'DC2626' } }; // Red
                    else if (user.status === 'graduated') statusCell.font = { color: { argb: '4F46E5' } }; // Indigo
                    else statusCell.font = { color: { argb: '16A34A' } }; // Green

                    currentRowIndex++;
                });

                grandTotal += subjectUsers.length;
                currentRowIndex++; // Spacer
            }

            // Summary Footer
            const totalRow = worksheet.getRow(currentRowIndex);
            totalRow.values = [`รวมทั้งหมด: ${grandTotal} คน`];
            worksheet.mergeCells(`A${currentRowIndex}:S${currentRowIndex}`);
            totalRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' }, name: 'Sarabun' };
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF059669' } // Emerald-600
            };
            totalRow.alignment = { vertical: 'middle', horizontal: 'center' };
            totalRow.height = 40;

            // Generate File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Student_List_Detailed_${new Date().toISOString().split('T')[0]}.xlsx`);

            setIsExportDialogOpen(false);
            toast.success('ดาวน์โหลดไฟล์ Excel รายละเอียดครบถ้วนแล้ว');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('เกิดข้อผิดพลาดในการดาวน์โหลด');
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <Card className="shadow-sm border border-slate-200 rounded-none">
                    <CardHeader className="bg-white border-b border-slate-100 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
                                    {mode === 'manual' ? (
                                        <>
                                            <Shield className="h-5 w-5 text-indigo-600" />
                                            จัดการข้อมูลผู้ใช้ (User Management)
                                        </>
                                    ) : (
                                        <>
                                            <Database className="h-5 w-5 text-emerald-600" />
                                            ทะเบียนนักเรียน (Student Registry)
                                        </>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    {mode === 'manual'
                                        ? "จัดการข้อมูลนักเรียนที่สมัครใหม่หรือสร้างโดยแอดมิน"
                                        : "จัดการข้อมูลรายชื่อจากระบบทะเบียน (Excel Import)"
                                    }
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Sanitize removed */}
                                <Button
                                    variant="outline"
                                    className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-none h-9 text-sm mr-2"
                                    onClick={handleExportPDF}
                                >
                                    <FileText className="h-4 w-4 text-red-600" />
                                    Export PDF
                                </Button>

                                <Button
                                    variant="outline"
                                    className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-none h-9 text-sm"
                                    onClick={() => setIsExportDialogOpen(true)}
                                >
                                    <Copy className="h-4 w-4" />
                                    ส่งออก Excel
                                </Button>

                                {mode === 'registry' && (
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="excel-upload-manage-users"
                                            disabled={isImporting}
                                        />
                                        <label
                                            htmlFor="excel-upload-manage-users"
                                            className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-none cursor-pointer h-9 transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {isImporting ? 'กำลังนำเข้า...' : 'Import from Excel'}
                                        </label>
                                    </div>
                                )}

                                {mode === 'manual' && (
                                    <Button
                                        onClick={() => window.location.href = '/dashboard/admin?tab=create-user'}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none shadow-sm gap-2 h-9"
                                    >
                                        <Plus className="h-4 w-4" />
                                        สร้างผู้ใช้ใหม่
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="ค้นหาชื่อ, Username, หรือข้อมูลอื่นๆ..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 rounded-none border-slate-200"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[150px] h-10 rounded-none border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-3 h-3" />
                                        <span>{statusFilter === 'all' ? 'ทุกสถานะ' : STATUS_MAP[statusFilter]?.label}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="all">ทุกสถานะ</SelectItem>
                                    <SelectItem value="studying">กำลังเรียน</SelectItem>
                                    <SelectItem value="drop">ดรอป</SelectItem>
                                    <SelectItem value="resigned">ลาออก</SelectItem>
                                    <SelectItem value="graduated">จบการศึกษา</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                <SelectTrigger className="w-full md:w-[200px] h-10 rounded-none border-slate-200">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="กรองตามวิชา" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="all">ทุกวิชา</SelectItem>
                                    {availableSubjects.map(subj => (
                                        <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* User Table */}
                        <div className="rounded-none border border-slate-200 overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[900px]">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-[80px]">รหัส</th>
                                        <th className="px-4 py-3">ผู้ใช้งาน</th>
                                        <th className="px-4 py-3">วิชาที่สมัคร</th>
                                        <th className="px-4 py-3">ชื่อนักเรียน</th>
                                        <th className="px-4 py-3">อีเมล</th>
                                        <th className="px-4 py-3">ระดับการศึกษา</th>
                                        <th className="px-4 py-3">โรงเรียน</th>
                                        <th className="px-4 py-3">สถานะ</th>
                                        <th className="px-4 py-3">บทบาท</th>
                                        <th className="px-4 py-3 text-right">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                                ไม่พบข้อมูลนักเรียน
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">
                                                    {user.studentId || user.studentIdMap || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border border-slate-200 rounded-none">
                                                            <AvatarImage src={user.photoURL} className="rounded-none" />
                                                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs rounded-none">
                                                                {(user.displayName || user.studentName || user.username || 'U')[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium text-slate-900">
                                                                {user.displayName || user.studentName || user.username || '-'}
                                                            </div>
                                                            <div className="text-xs text-slate-500">{user.username || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 min-w-[130px] max-w-[200px]">
                                                    <div className="flex flex-col gap-1">
                                                        {user.enrolledSubjects?.length ? (
                                                            user.enrolledSubjects.map((subject, idx) => (
                                                                <div key={idx}>
                                                                    {renderSubjectWithIcon(subject)}
                                                                </div>
                                                            ))
                                                        ) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.studentName || '-'}
                                                </td>
                                                <td className="px-4 py-3 max-w-[150px] truncate text-xs" title={user.email}>
                                                    {user.email && !user.email.includes('placeholder.com') && !user.email.includes('no-email') ? user.email : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.educationLevel ? (EDUCATION_LEVEL_MAP[user.educationLevel] || user.educationLevel) : '-'}
                                                </td>
                                                <td className="px-4 py-3 max-w-[150px] truncate" title={user.school}>
                                                    {user.school || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`font-medium px-2 py-1 rounded-none text-xs border ${STATUS_MAP[user.status || 'studying']?.color.replace('text-', 'border-').replace('100', '200') || 'border-slate-200'} ${STATUS_MAP[user.status || 'studying']?.color || 'text-slate-800'}`}>
                                                            {STATUS_MAP[user.status || 'studying']?.label || 'กำลังเรียน'}
                                                        </span>
                                                        {user.statusNote && (
                                                            <div className="text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded-none border border-red-100 inline-block">
                                                                {user.statusNote}
                                                            </div>
                                                        )}
                                                        {/* Check for quota expired (Sessions) - Priority: Quota > Date */}
                                                        {user.registeredCourses?.some(c => {
                                                            const total = c.totalSessions || 0;
                                                            if (total > 0) {
                                                                return (c.usedSessions || 0) >= total;
                                                            }
                                                            return c.endDate && new Date() > new Date(c.endDate);
                                                        }) && (
                                                                <div className="text-[10px] text-white font-bold bg-orange-500 px-2 py-0.5 rounded-none shadow-sm">
                                                                    หมดโควต้า
                                                                </div>
                                                            )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getRoleBadge(user.role, user.isApproved)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-none"
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
            {/* User Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden border border-slate-200 rounded-none shadow-lg h-[85vh] flex flex-col" aria-describedby="user-details-description">
                    <DialogTitle className="sr-only">รายละเอียดผู้ใช้งาน</DialogTitle>
                    <DialogDescription id="user-details-description" className="sr-only">
                        รายละเอียดผู้ใช้งาน
                    </DialogDescription>
                    {selectedUser && (
                        <div className="flex flex-col h-full">
                            {/* Header - Compact */}
                            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-indigo-600" />
                                        รายละเอียดผู้เรียน
                                    </div>
                                    {getRoleBadge(selectedUser.role, selectedUser.isApproved)}
                                </div>
                                <div className="flex gap-2 mr-8">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 rounded-none gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                                                <Download className="h-4 w-4" />
                                                ส่งออกข้อมูล
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-none">
                                            <DropdownMenuItem onClick={() => exportSingleUserWord(selectedUser)} className="cursor-pointer gap-2 rounded-none">
                                                <div className="w-5 h-5 bg-blue-100/50 flex items-center justify-center rounded-sm">
                                                    <FileText className="h-3 w-3 text-blue-600" />
                                                </div>
                                                ส่งออกเป็น Word
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => exportSingleUserPDF(selectedUser)} className="cursor-pointer gap-2 rounded-none">
                                                <div className="w-5 h-5 bg-red-100/50 flex items-center justify-center rounded-sm">
                                                    <FileText className="h-3 w-3 text-red-600" />
                                                </div>
                                                ส่งออกเป็น PDF
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                        onClick={handleEditToggle}
                                        className={`
                                            px-4 py-2 rounded-none shadow-sm transition-all duration-300 font-itim text-sm h-9
                                            ${isEditing
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                            }
                                        `}
                                    >
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <X className="h-3 w-3" /> ยกเลิกแก้ไข
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Edit2 className="h-3 w-3" /> แก้ไขข้อมูล
                                            </div>
                                        )}
                                    </Button>

                                </div>
                            </div>

                            {/* Body Content - 2 Column Grid */}
                            <div className="flex-1 overflow-hidden">
                                <div className="grid grid-cols-12 h-full">

                                    {/* Left Column: Profile & Account (Col-span-4) */}
                                    <div className="col-span-4 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto space-y-6">

                                        {/* Profile Avatar Area */}
                                        <div className="flex flex-col items-center text-center">
                                            <Avatar className="h-32 w-32 border-4 border-white rounded-none shadow-sm mb-4">
                                                <AvatarImage src={selectedUser.photoURL} className="rounded-none object-cover" />
                                                <AvatarFallback className="text-4xl bg-white text-slate-400 font-bold rounded-none border border-slate-200">
                                                    {(selectedUser.displayName || selectedUser.studentName || selectedUser.username || 'U')[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <h2 className="text-xl font-bold text-slate-800 mb-1">
                                                {selectedUser.studentName || selectedUser.displayName || '-'}
                                            </h2>
                                            <p className="text-slate-500 text-sm font-mono bg-slate-200/50 px-2 py-1 rounded">
                                                @{selectedUser.username}
                                            </p>
                                        </div>

                                        {/* Account Info */}
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Shield className="h-3 w-3" /> ข้อมูลบัญชี
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="bg-white p-3 border border-slate-200 rounded-none shadow-sm">
                                                    <div className="text-xs text-slate-400 mb-1">Password</div>
                                                    <div className="flex items-center justify-between">
                                                        {newPassword ? (
                                                            <span 
                                                                className="font-mono font-bold text-emerald-600 cursor-pointer select-all"
                                                                onClick={() => copyToClipboard(newPassword, 'รหัสผ่าน')}
                                                                title="คลิกเพื่อคัดลอก"
                                                            >
                                                                {newPassword}
                                                            </span>
                                                        ) : (
                                                            <span 
                                                                className="font-mono text-slate-800 font-medium cursor-pointer select-all"
                                                                onClick={() => selectedUser.plainPassword && copyToClipboard(selectedUser.plainPassword, 'รหัสผ่าน')}
                                                                title="คลิกเพื่อคัดลอก"
                                                            >
                                                                {selectedUser.plainPassword || '••••••••'}
                                                            </span>
                                                        )}
                                                        {isEditing && (
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none text-slate-400" onClick={generatePassword} title="รีเซ็ต">
                                                                    <RefreshCw className="h-3 w-3" />
                                                                </Button>
                                                                {(newPassword || selectedUser.plainPassword) && (
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none text-slate-400" onClick={() => copyToClipboard(newPassword || selectedUser.plainPassword || '', 'รหัสผ่าน')}>
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3 border border-slate-200 rounded-none shadow-sm">
                                                    <div className="text-xs text-slate-400 mb-1">Status</div>
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={editForm.status || 'studying'}
                                                                onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                                                            >
                                                                <SelectTrigger className="h-8 rounded-none border-slate-200 bg-slate-50">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-none">
                                                                    {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {['drop', 'resigned'].includes(editForm.status || '') && (
                                                                <textarea
                                                                    className="w-full text-xs p-2 rounded-none border border-slate-200 bg-slate-50 focus:outline-none resize-none"
                                                                    rows={2}
                                                                    placeholder="ระบุสาเหตุ..."
                                                                    value={editForm.statusNote || ''}
                                                                    onChange={(e) => setEditForm({ ...editForm, statusNote: e.target.value })}
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span className={`inline-block px-2 py-1 rounded-none text-xs font-semibold ${STATUS_MAP[selectedUser.status || 'studying']?.color || 'text-slate-800'}`}>
                                                                {STATUS_MAP[selectedUser.status || 'studying']?.label || 'กำลังเรียน'}
                                                            </span>
                                                            {selectedUser.statusNote && (
                                                                <div className="text-xs text-red-500 mt-1 pl-2 border-l-2 border-red-200">
                                                                    {selectedUser.statusNote}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons (Delete) */}
                                        {!isEditing && (
                                            <div className="pt-4 border-t border-slate-200">
                                                <Button
                                                    onClick={() => handleDeleteUser(selectedUser._id)}
                                                    variant="ghost"
                                                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none h-10"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> ลบผู้ใช้งาน
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Details & Courses (Col-span-8) */}
                                    <div className="col-span-8 p-8 overflow-y-auto bg-white space-y-8">

                                        {/* Personal Details */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                <UserCheck className="h-4 w-4 text-indigo-500" />
                                                ข้อมูลส่วนตัว (Personal Information)
                                            </h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {/* Student ID [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">รหัสนักเรียน (Student ID)</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editForm.studentId || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                                                            className="rounded-none h-9 font-mono"
                                                            placeholder="เช่น 1/69"
                                                        />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1 font-mono">{selectedUser.studentId || '-'}</div>}
                                                </div>

                                                {/* Citizen ID */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">เลขบัตรประชาชน</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editForm.citizenId || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, citizenId: e.target.value })}
                                                            maxLength={13}
                                                            className="rounded-none h-9 font-mono"
                                                            placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                                        />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1 font-mono">{selectedUser.citizenId || '-'}</div>}
                                                </div>

                                                {/* Username */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Username</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editForm.username || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                            className="rounded-none h-9 font-mono"
                                                            placeholder="Username"
                                                        />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1 font-mono">{selectedUser.username || '-'}</div>}
                                                </div>

                                                {/* Email */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">อีเมล (Email)</Label>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editForm.email || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                            className="rounded-none h-9"
                                                            placeholder="อีเมลของนักเรียน"
                                                            type="email"
                                                        />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1 truncate" title={selectedUser.email}>
                                                        {selectedUser.email && !selectedUser.email.includes('placeholder.com') && !selectedUser.email.includes('no-email') ? selectedUser.email : '-'}
                                                    </div>}
                                                </div>

                                                {/* Password - Only Editable in Edit Mode */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Password</Label>
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                placeholder="ตั้งรหัสผ่านใหม่ (ว่างไว้ถ้าไม่แก้)"
                                                                className="rounded-none h-9 font-mono text-xs"
                                                            />
                                                            <Button variant="outline" size="icon" onClick={generatePassword} className="h-9 w-9 shrink-0 rounded-none bg-slate-50 hover:bg-slate-100" title="สุ่มรหัส">
                                                                <RefreshCw className="h-4 w-4 text-slate-600" />
                                                            </Button>
                                                            {newPassword && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => copyToClipboard(newPassword, 'รหัสผ่าน')}
                                                                    className="h-9 w-9 shrink-0 rounded-none bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                                                                    title="คัดลอกรหัสผ่าน"
                                                                >
                                                                    <Copy className="h-4 w-4 text-indigo-600" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="text-sm font-medium border-b border-dashed border-slate-200 pb-1 font-mono text-slate-800 cursor-pointer select-all flex items-center justify-between"
                                                            onClick={() => selectedUser.plainPassword && copyToClipboard(selectedUser.plainPassword, 'รหัสผ่าน')}
                                                            title="คลิกเพื่อคัดลอก"
                                                        >
                                                            <span>{selectedUser.plainPassword || '••••••••'}</span>
                                                            {selectedUser.plainPassword && <Copy className="h-3 w-3 text-slate-400 opacity-50" />}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Student Name */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ชื่อ-นามสกุล (นักเรียน)</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.studentName || ''} onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.studentName || '-'}</div>}
                                                </div>

                                                {/* Nickname [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ชื่อเล่น</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.nickname || ''} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.nickname || '-'}</div>}
                                                </div>

                                                {/* BirthDate [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">วันเกิด (DD/MM/YYYY)</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.birthDate || ''} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} className="rounded-none h-9" placeholder="เช่น 15/04/2550" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.birthDate || '-'}</div>}
                                                </div>

                                                {/* Gender [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">เพศ</Label>
                                                    {isEditing ? (
                                                        <Select value={editForm.gender || ''} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                                                            <SelectTrigger className="h-9 rounded-none border-slate-200">
                                                                <SelectValue placeholder="เลือกเพศ" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-none">
                                                                <SelectItem value="ชาย">ชาย</SelectItem>
                                                                <SelectItem value="หญิง">หญิง</SelectItem>
                                                                <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.gender || '-'}</div>}
                                                </div>

                                                {/* Ethnicity [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">เชื้อชาติ</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.ethnicity || ''} onChange={(e) => setEditForm({ ...editForm, ethnicity: e.target.value })} className="rounded-none h-9" placeholder="เช่น ไทย" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.ethnicity || '-'}</div>}
                                                </div>

                                                {/* Religion [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ศาสนา</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.religion || ''} onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })} className="rounded-none h-9" placeholder="เช่น พุทธ, คริสต์" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.religion || '-'}</div>}
                                                </div>

                                                {/* Student Phone [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">เบอร์โทรศัพท์ (นักเรียน)</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.studentPhone || ''} onChange={(e) => setEditForm({ ...editForm, studentPhone: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.studentPhone || '-'}</div>}
                                                </div>

                                                {/* Address [NEW] */}
                                                <div className="space-y-1 col-span-2">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ที่อยู่ตามทะเบียนบ้าน/ปัจจุบัน</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.address || '-'}</div>}
                                                </div>

                                                {/* Parent Name */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ชื่อผู้ปกครอง</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.parentName || ''} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.parentName || '-'}</div>}
                                                </div>

                                                {/* Parent Relation [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ความสัมพันธ์</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.parentRelation || ''} onChange={(e) => setEditForm({ ...editForm, parentRelation: e.target.value })} className="rounded-none h-9" placeholder="บิดา/มารดา" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.parentRelation || '-'}</div>}
                                                </div>

                                                {/* Parent Phone [NEW] */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">เบอร์โทรศัพท์ (ผู้ปกครอง)</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.parentPhone || ''} onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.parentPhone || '-'}</div>}
                                                </div>

                                                {/* Parent Address [NEW] */}
                                                <div className="space-y-1 col-span-2">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ที่อยู่ผู้ปกครอง</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.parentAddress || ''} onChange={(e) => setEditForm({ ...editForm, parentAddress: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.parentAddress || '-'}</div>}
                                                </div>

                                                {/* School */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">โรงเรียน</Label>
                                                    {isEditing ? (
                                                        <Input value={editForm.school || ''} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} className="rounded-none h-9" />
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.school || '-'}</div>}
                                                </div>

                                                {/* Education Level */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase font-semibold">ระดับชั้น</Label>
                                                    {isEditing ? (
                                                        <Select value={editForm.educationLevel} onValueChange={(val) => setEditForm({ ...editForm, educationLevel: val })}>
                                                            <SelectTrigger className="rounded-none h-9"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="rounded-none">
                                                                {Object.entries(EDUCATION_LEVEL_MAP).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : <div className="text-sm font-medium border-b border-dashed border-slate-200 pb-1">{selectedUser.educationLevel ? (EDUCATION_LEVEL_MAP[selectedUser.educationLevel] || selectedUser.educationLevel) : '-'}</div>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Registered Courses Table */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-indigo-500" />
                                                    คอร์สเรียนปัจจุบัน (Registered Courses)
                                                </h3>
                                                {isEditing && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleOpenAddCourse}
                                                        className="h-7 text-xs rounded-none border-dashed border-slate-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
                                                    >
                                                        + เพิ่มคอร์ส (Add Course)
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="border border-slate-200 rounded-none overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase">
                                                        <tr>
                                                            <th className="px-4 py-3">Status</th>
                                                            <th className="px-4 py-3">Subject</th>
                                                            <th className="px-4 py-3">Teacher</th>
                                                            <th className="px-4 py-3">Schedule</th>
                                                            <th className="px-4 py-3">Quota</th>
                                                            <th className="px-4 py-3">Duration</th>
                                                            <th className="px-4 py-3 text-right">จัดการ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(() => {
                                                            const targetUser = isEditing ? editForm : selectedUser;
                                                            const regCourses = targetUser?.registeredCourses || [];
                                                            const legacySubjects = targetUser?.enrolledSubjects || [];

                                                            // Create a map of existing subjects to avoid duplicates
                                                            const courseMap = new Map();

                                                            // Priority 1: Registered Courses (Detailed)
                                                            regCourses.forEach((c: any) => {
                                                                courseMap.set(c.subject, { ...c, isLegacy: false });
                                                            });

                                                            // Priority 2: Enrolled Subjects (Legacy) - Only if not in Registered
                                                            legacySubjects.forEach((subName: string) => {
                                                                if (!courseMap.has(subName)) {
                                                                    courseMap.set(subName, {
                                                                        subject: subName,
                                                                        teacherName: '-',
                                                                        day: '-',
                                                                        time: '-',
                                                                        startDate: null,
                                                                        endDate: null,
                                                                        isLegacy: true
                                                                    });
                                                                }
                                                            });

                                                            const unifiedCourses = Array.from(courseMap.values());

                                                            if (unifiedCourses.length === 0) {
                                                                return (
                                                                    <tr>
                                                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                                                            ไม่มีข้อมูลคอร์สเรียน
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }

                                                            return unifiedCourses.map((course, idx) => {
                                                                const endDate = course.endDate ? new Date(course.endDate) : null;
                                                                const isTimeExpired = endDate ? endDate < new Date() : false;
                                                                const hasQuota = course.totalSessions && course.totalSessions > 0;
                                                                const isQuotaExpired = hasQuota && (course.usedSessions || 0) >= course.totalSessions;
                                                                // If hasQuota, only expire if quota reached. Else check time.
                                                                const isExpired = hasQuota ? isQuotaExpired : isTimeExpired;

                                                                const targetUserRegCourses = isEditing ? editForm.registeredCourses : selectedUser.registeredCourses;
                                                                const targetUserEnrolled = isEditing ? editForm.enrolledSubjects : selectedUser.enrolledSubjects;
                                                                const regCourseIdx = (targetUserRegCourses || []).findIndex((c: any) => c.subject === course.subject);

                                                                return (
                                                                    <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${(course.status === 'drop' || course.status === 'resigned') ? 'bg-orange-50/30' :
                                                                        (course.status === 'graduated') ? 'bg-indigo-50/30' :
                                                                            isExpired ? 'bg-red-50/10' : ''
                                                                        }`}>
                                                                        <td className="px-4 py-3 align-top">
                                                                            {course.status && course.status !== 'active' ? (
                                                                                <Badge variant="outline" className={`rounded-none text-[10px] px-1.5 ${course.status === 'drop' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                                                    course.status === 'resigned' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                                        course.status === 'graduated' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                                                            'bg-slate-100 text-slate-700 border-slate-200'
                                                                                    }`}>
                                                                                    {course.status === 'drop' ? 'Drop' :
                                                                                        course.status === 'resigned' ? 'Resigned' :
                                                                                            course.status === 'graduated' ? 'Graduated' : course.status}
                                                                                </Badge>
                                                                            ) : isExpired ? (
                                                                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 rounded-none text-[10px] px-1.5">
                                                                                    Expired
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-none text-[10px] px-1.5">
                                                                                    Active
                                                                                </Badge>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 font-medium text-slate-800 align-top">
                                                                            {renderSubjectWithIcon(course.subject)}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-slate-600 align-top">{course.teacherName || '-'}</td>
                                                                        <td className="px-4 py-3 align-top">
                                                                            <div className="flex flex-col text-xs">
                                                                                <span className="font-semibold text-slate-700">{course.day}</span>
                                                                                <span className="text-slate-500">{course.time}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 align-top">
                                                                            {course.isLegacy ? (
                                                                                <span className="text-slate-400">-</span>
                                                                            ) : (
                                                                                <div className="flex flex-col">
                                                                                    <span className={`font-bold ${course.usedSessions >= course.totalSessions ? 'text-red-500' : 'text-indigo-600'}`}>
                                                                                        {course.usedSessions || 0} / {course.totalSessions || 0}
                                                                                    </span>
                                                                                    <div className="w-16 h-1 bg-slate-100 mt-1">
                                                                                        <div
                                                                                            className={`h-full ${course.usedSessions >= course.totalSessions ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                                                            style={{ width: `${Math.min(100, ((course.usedSessions || 0) / (course.totalSessions || 1)) * 100)}%` }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-slate-500 align-top font-mono">
                                                                            <div>Start: {course.startDate ? new Date(course.startDate).toLocaleDateString('th-TH') : '-'}</div>
                                                                            <div className={`${isExpired ? 'text-red-600 font-bold' : ''}`}>
                                                                                End: {course.endDate ? new Date(course.endDate).toLocaleDateString('th-TH') : '-'}
                                                                            </div>
                                                                            {course.extensionHistory && course.extensionHistory.length > 0 && (
                                                                                <div className="mt-2 text-xs">
                                                                                    <div className="font-bold text-indigo-600 mb-1 flex items-center gap-1">
                                                                                        <HistoryIcon className="w-3 h-3" /> ประวัติการต่อคอร์สเรียน
                                                                                    </div>
                                                                                    <div className="space-y-1 pl-2 border-l-2 border-indigo-100">
                                                                                        {course.extensionHistory.map((ext: any, extIdx: number) => (
                                                                                            <div key={extIdx} className="text-[10px] text-slate-500">
                                                                                                <span className="font-mono text-slate-700">{new Date(ext.extendedAt).toLocaleDateString('th-TH')}</span>
                                                                                                <span className="mx-1">:</span>
                                                                                                <span>+{ext.sessionsAdded} ครั้ง</span>
                                                                                                {ext.newEndDate && (
                                                                                                    <span className="ml-1 text-slate-400">(ถึง {new Date(ext.newEndDate).toLocaleDateString('th-TH')})</span>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {/* Extend Button - Inline */}
                                                                            {isExpired && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    className="h-6 text-[10px] mt-2 rounded-none px-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1"
                                                                                    onClick={() => openExtensionDialog(regCourseIdx, course.endDate)}
                                                                                >
                                                                                    <RefreshCw className="w-3 h-3" /> ต่ออายุ
                                                                                </Button>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right align-top">
                                                                            {isEditing && (
                                                                                <div className="flex flex-col gap-2 items-end">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className={`h-6 w-full text-[10px] rounded-none justify-end px-0 mb-1 ${course.isLegacy ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-500 hover:text-indigo-700'}`}
                                                                                        onClick={() => handleOpenEditSchedule(regCourseIdx, course)}
                                                                                        disabled={course.isLegacy}
                                                                                    >
                                                                                        <Settings className="w-3 h-3 mr-1" /> ตั้งค่า
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 w-full text-red-400 hover:text-red-600 text-[10px] rounded-none justify-end px-0"
                                                                                        onClick={() => {
                                                                                            if (confirm('ยืนยันการลบคอร์สเรียนรายวิชานี้?')) {
                                                                                                const updatedReg = (targetUserRegCourses || []).filter((c: any) => c.subject !== course.subject);
                                                                                                const updatedLegacy = (targetUserEnrolled || []).filter((s: string) => s !== course.subject);
                                                                                                setEditForm({ 
                                                                                                    ...editForm, 
                                                                                                    registeredCourses: updatedReg,
                                                                                                    enrolledSubjects: updatedLegacy
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3 mr-1" /> ลบคอร์ส
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions (Sticky Bottom) - Only for Edit Mode Save */}
                            {isEditing && (
                                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0 z-10">
                                    <Button variant="ghost" onClick={handleEditToggle} className="rounded-none text-slate-500 hover:text-slate-800">ยกเลิก</Button>
                                    <Button
                                        onClick={handleSaveChanges}
                                        disabled={actionLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none px-6"
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        บันทึกการเปลี่ยนแปลงทั้งหมด
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent >
            </Dialog >

            {/* Export Dialog */}
            < Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} >
                <DialogContent className="sm:max-w-md rounded-none border-slate-200" aria-describedby="export-dialog-description">
                    <DialogTitle className="sr-only">ดาวน์โหลดรายชื่อนักเรียน</DialogTitle>
                    <DialogDescription id="export-dialog-description" className="sr-only">
                        เลือกวิชาที่ต้องการดาวน์โหลดรายชื่อนักเรียน
                    </DialogDescription>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold font-itim text-slate-800">ดาวน์โหลดรายชื่อนักเรียน</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">เลือกวิชาที่ต้องการ</Label>
                            <Select value={exportSubject} onValueChange={setExportSubject}>
                                <SelectTrigger className="h-11 rounded-none border-slate-200">
                                    <SelectValue placeholder="เลือกวิชา" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="all">ดาวน์โหลดทุกคน (แยกตามวิชา)</SelectItem>
                                    {availableSubjects.map(subj => (
                                        <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="mr-2 h-11 rounded-none border-slate-200">ยกเลิก</Button>
                        <Button onClick={handleExportExcel} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-none px-8">
                            ดาวน์โหลด Excel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Extension Dialog */}
            < Dialog open={isExtensionDialogOpen} onOpenChange={setIsExtensionDialogOpen} >
                <DialogContent className="sm:max-w-md rounded-none" aria-describedby="extension-dialog-desc">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg text-slate-800">ต่ออายุคอร์สเรียน (Extend Course)</DialogTitle>
                        <DialogDescription id="extension-dialog-desc">
                            เพิ่มระยะเวลาเรียนและบันทึกประวัติการต่ออายุ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold">วันที่ต่อคอร์ส (New End Date)</Label>
                            <Input
                                type="date"
                                value={extensionDate}
                                onChange={(e) => setExtensionDate(e.target.value)}
                                className="rounded-none font-mono h-11 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold">โควตาจำนวนครั้งที่เรียน (Course Quota)</Label>
                            <div className="grid grid-cols-1 gap-3">
                                <Select
                                    value={extensionPreset}
                                    onValueChange={(val) => {
                                        setExtensionPreset(val);
                                        if (val !== 'custom') {
                                            setExtensionSessions(parseInt(val));
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-none border-slate-200 bg-white">
                                        <SelectValue placeholder="เลือกจำนวนครั้ง" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="4">4 ครั้ง (คอร์ส 1 เดือน)</SelectItem>
                                        <SelectItem value="12">12 ครั้ง (คอร์ส 3 เดือน)</SelectItem>
                                        <SelectItem value="24">24 ครั้ง (คอร์ส 6 เดือน)</SelectItem>
                                        <SelectItem value="48">48 ครั้ง (คอร์ส 1 ปี)</SelectItem>
                                        <SelectItem value="custom">กำหนดเอง (Custom)</SelectItem>
                                    </SelectContent>
                                </Select>

                                {extensionPreset === 'custom' && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="ระบุจำนวนครั้ง..."
                                            value={extensionSessions || ''}
                                            onChange={(e) => setExtensionSessions(parseInt(e.target.value) || 0)}
                                            className="h-11 rounded-none border-slate-200 flex-1"
                                        />
                                        <span className="text-sm text-slate-500 font-medium">ครั้ง</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {extensionCourseIndex !== null && (
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-none shadow-sm">
                            <p className="text-indigo-800 text-sm flex items-center gap-2 mb-1">
                                <BookOpen className="w-4 h-4" />
                                <strong>วิชา:</strong> {editForm.registeredCourses?.[extensionCourseIndex]?.subject}
                            </p>
                            <p className="text-emerald-700 text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                จำนวนครั้งใหม่ (New Total): {(editForm.registeredCourses?.[extensionCourseIndex]?.totalSessions || 0) + extensionSessions} ครั้ง
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">หมายเหตุ (Notes)</Label>
                        <Input
                            placeholder="เช่น ต่ออายุคอร์ส 3 เดือน, บันทึกเพิ่มเติม..."
                            value={extensionNote}
                            onChange={(e) => setExtensionNote(e.target.value)}
                            className="rounded-none h-11 border-slate-200"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsExtensionDialogOpen(false)} className="rounded-none">ยกเลิก</Button>
                        <Button onClick={confirmExtension} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                            ยืนยันการต่ออายุ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Course Dialog [NEW] */}
            <Dialog open={isAddCourseDialogOpen} onOpenChange={setIsAddCourseDialogOpen}>
                <DialogContent className="sm:max-w-xl rounded-none border-slate-200" aria-describedby="add-course-desc">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                            เพิ่มคอร์สเรียนพิเศษ (Add Course)
                        </DialogTitle>
                        <DialogDescription id="add-course-desc">
                            เพิ่มรายวิชาใหม่ให้กับนักเรียน (ต้องกดบันทึกหลังจากเพิ่ม)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Subject & Teacher */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>วิชา (Subject) <span className="text-red-500">*</span></Label>
                                <Select
                                    value={newCourse.subject}
                                    onValueChange={(val) => setNewCourse({ ...newCourse, subject: val })}
                                >
                                    <SelectTrigger className="h-10 rounded-none border-slate-200">
                                        <SelectValue placeholder="เลือกวิชา" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none max-h-[200px]">
                                        {allSubjects.length > 0 ? (
                                            allSubjects.map(sub => <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>)
                                        ) : (
                                            availableSubjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ครูผู้สอน (Teacher) <span className="text-red-500">*</span></Label>
                                <Select
                                    value={newCourse.teacherId}
                                    onValueChange={(val) => setNewCourse({ ...newCourse, teacherId: val })}
                                >
                                    <SelectTrigger className="h-10 rounded-none border-slate-200">
                                        <SelectValue placeholder="เลือกครู" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none max-h-[200px]">
                                        {teachers.map(t => <SelectItem key={t._id} value={t._id}>{t.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>วันเริ่มเรียน (Start) <span className="text-red-500">*</span></Label>
                                <Input type="date" className="h-10 rounded-none" value={newCourse.startDate} onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>วันสิ้นสุด (End) <span className="text-red-500">*</span></Label>
                                <Input type="date" className="h-10 rounded-none" value={newCourse.endDate} onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })} />
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>วันเรียน (Day) <span className="text-red-500">*</span></Label>
                                <Select value={newCourse.day} onValueChange={(val) => setNewCourse({ ...newCourse, day: val })}>
                                    <SelectTrigger className="h-10 rounded-none border-slate-200"><SelectValue placeholder="วัน" /></SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>เวลา (Time) <span className="text-red-500">*</span></Label>
                                <Select value={newCourse.time} onValueChange={(val) => setNewCourse({ ...newCourse, time: val })}>
                                    <SelectTrigger className="h-10 rounded-none border-slate-200"><SelectValue placeholder="เวลา" /></SelectTrigger>
                                    <SelectContent className="rounded-none max-h-[150px]">
                                        {[
                                            '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00', '15:30 - 17:30',
                                            '16:00 - 18:00', '16:30 - 18:30', '17:00 - 19:00', '17:30 - 19:30',
                                            '18:00 - 20:00', '20:00 - 22:00', 'อื่นๆ (ระบุเวลาเอง)'
                                        ].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {newCourse.time === 'อื่นๆ (ระบุเวลาเอง)' && (
                            <div className="space-y-2">
                                <Label>ระบุเวลาเอง</Label>
                                <Input
                                    className="h-10 rounded-none bg-yellow-50 border-yellow-200"
                                    placeholder="เช่น 10:00-12:00"
                                    value={newCourse.customTime}
                                    onChange={(e) => setNewCourse({ ...newCourse, customTime: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Quota [NEW] */}
                        <div className="p-3 bg-slate-50 border border-slate-200">
                            <Label className="text-indigo-700 font-bold mb-2 block text-sm">โควตาจำนวนครั้งที่เรียน (Course Quota)</Label>
                            <div className="flex items-center gap-4">
                                <Select
                                    value={isAddCourseCustomQuota ? "0" : ([4, 12, 24, 48].includes(newCourse.totalSessions) ? newCourse.totalSessions.toString() : "0")}
                                    onValueChange={(val) => {
                                        const intVal = parseInt(val);
                                        if (intVal === 0) {
                                            setIsAddCourseCustomQuota(true);
                                            setNewCourse({ ...newCourse, totalSessions: 0 });
                                        } else {
                                            setIsAddCourseCustomQuota(false);
                                            setNewCourse({ ...newCourse, totalSessions: intVal });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-10 rounded-none border-slate-200 bg-white flex-1 text-sm">
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

                                {isAddCourseCustomQuota && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="ระบุ 1-100"
                                            className="h-10 rounded-none bg-white border-slate-200"
                                            value={newCourse.totalSessions || ''}
                                            onChange={(e) => setNewCourse({ ...newCourse, totalSessions: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="text-xs text-slate-500">ครั้ง</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * ระบบจะหักจำนวนครั้งอัตโนมัติเมื่อครูเช็คชื่อมาเรียน
                            </p>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 mt-2">
                            <p className="text-[10px] text-slate-500 italic">
                                * ระดับเริ่มต้นจะเป็น Basic เสมอ (Starting Level: Basic)
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCourseDialogOpen(false)} className="rounded-none border-slate-200">ยกเลิก</Button>
                        <Button onClick={handleConfirmAddCourse} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                            เพิ่มคอร์ส
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Course Settings Dialog */}
            <Dialog open={isEditScheduleDialogOpen} onOpenChange={setIsEditScheduleDialogOpen}>
                <DialogContent className="sm:max-w-2xl rounded-none border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-indigo-500" />
                            ตั้งค่ารายวิชา (Course Settings)
                        </DialogTitle>
                        <DialogDescription>
                            จัดการข้อมูลรายวิชา วันเวลาเรียน และโควตา
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Top Info */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none flex items-center justify-between">
                            <div>
                                <Label className="text-xs text-slate-500">วิชา (Subject)</Label>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-500" /> {editScheduleData.subject}
                                </div>
                            </div>
                            <div className="text-right">
                                <Label className="text-xs text-slate-500">ครูผู้สอน (Teacher)</Label>
                                <div className="font-bold text-slate-700">{editScheduleData.teacherName}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Dates */}
                            <div className="space-y-2">
                                <Label>วันเริ่มเรียน (Start Date)</Label>
                                <Input
                                    type="date"
                                    className="rounded-none"
                                    value={editScheduleData.startDate ? new Date(editScheduleData.startDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEditScheduleData({ ...editScheduleData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>วันสิ้นสุด (End Date)</Label>
                                <Input
                                    type="date"
                                    className="rounded-none"
                                    value={editScheduleData.endDate ? new Date(editScheduleData.endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEditScheduleData({ ...editScheduleData, endDate: e.target.value })}
                                />
                            </div>

                            {/* Schedule */}
                            <div className="space-y-2">
                                <Label>วันเรียน (Day)</Label>
                                <Select value={editScheduleData.day} onValueChange={(val) => setEditScheduleData({ ...editScheduleData, day: val })}>
                                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>เวลา (Time)</Label>
                                <Select value={editScheduleData.time} onValueChange={(val) => setEditScheduleData({ ...editScheduleData, time: val })}>
                                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-none max-h-[150px]">
                                        {[
                                            '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00', '15:30 - 17:30',
                                            '16:00 - 18:00', '16:30 - 18:30', '17:00 - 19:00', '17:30 - 19:30',
                                            '18:00 - 20:00', '20:00 - 22:00', 'อื่นๆ (ระบุเวลาเอง)'
                                        ].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom Time */}
                        {editScheduleData.time === 'อื่นๆ (ระบุเวลาเอง)' && (
                            <div className="space-y-2">
                                <Label>ระบุเวลาเอง</Label>
                                <Input
                                    className="rounded-none bg-yellow-50"
                                    value={editScheduleData.customTime}
                                    onChange={(e) => setEditScheduleData({ ...editScheduleData, customTime: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Status */}
                            <div className="space-y-2">
                                <Label>สถานะ (Status)</Label>
                                <Select value={editScheduleData.status} onValueChange={(val) => setEditScheduleData({ ...editScheduleData, status: val })}>
                                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="active" className="text-emerald-700">Active (กำลังเรียน)</SelectItem>
                                        <SelectItem value="drop" className="text-orange-700">Drop (ดรอป)</SelectItem>
                                        <SelectItem value="graduated" className="text-indigo-700">Graduated (จบการศึกษา)</SelectItem>
                                        <SelectItem value="resigned" className="text-red-700">Resigned (ลาออก)</SelectItem>
                                        <SelectItem value="expired" className="text-red-500">Expired (หมดอายุ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Quota */}
                            <div className="space-y-2">
                                <Label>โควตา (Quota)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        className="rounded-none"
                                        value={editScheduleData.totalSessions}
                                        onChange={(e) => setEditScheduleData({ ...editScheduleData, totalSessions: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-sm text-slate-500">ครั้ง</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditScheduleDialogOpen(false)} className="rounded-none border-slate-200">ยกเลิก</Button>
                        <Button onClick={handleSaveEditSchedule} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                            <Save className="w-4 h-4 mr-2" /> บันทึกข้อมูล
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

