'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Search, Upload, FileSpreadsheet, Loader2, Save, Edit2, Eye, X, User as UserIcon, Shield, RefreshCw, Copy, Trash2, BookOpen, Download, UserCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AddStudentDialog from './AddStudentDialog';

// CONSTANTS
const STATUS_MAP: Record<string, { label: string; color: string }> = {
    'studying': { label: 'กำลังเรียน', color: 'bg-green-100 text-green-700' },
    'drop': { label: 'ดรอป', color: 'bg-orange-100 text-orange-700' },
    'resigned': { label: 'ลาออก', color: 'bg-red-100 text-red-700' },
    'graduated': { label: 'จบการศึกษา', color: 'bg-indigo-100 text-indigo-700' },
};

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

interface RegistryTableProps {
    initialData?: any[];
}

export default function RegistryTable({ initialData = [] }: RegistryTableProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [excelFiles, setExcelFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [showAddStudent, setShowAddStudent] = useState(false); // New State

    // Edit State
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [newPassword, setNewPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Filter users
    const filteredUsers = users.filter(u => {
        const search = searchTerm.toLowerCase();
        return (
            (u.firstName || '').toLowerCase().includes(search) ||
            (u.lastName || '').toLowerCase().includes(search) ||
            (u.nickname || '').toLowerCase().includes(search) ||
            (u.studentIdMap || '').toLowerCase().includes(search)
        );
    });

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

                console.log('Excel Data:', data);

                // Map Excel columns to DTO
                const mappedData = data.map((row: any) => ({
                    studentIdMap: row['ID'] ? String(row['ID']) : undefined,
                    prefix: row['คำนำหน้า'],
                    firstName: row['ชื่อ'],
                    lastName: row['นามสกุล'],
                    nickname: row['ชื่อเล่น'],
                    birthDate: row['วัน/เดือน/ปี เกิด'], // Keep as string for now
                    age: row['อายุ'] ? Number(row['อายุ']) : undefined,
                    gender: row['เพศ'],
                    ethnicity: row['เชื้อชาติ'],
                    nationality: row['สัญชาติ'],
                    religion: row['ศาสนา'],
                    school: row['โรงเรียน'],
                    studentClass: row['ระดับชั้น'], // Mapping to existing field
                    address: row['ที่อยู่นักเรียน'],
                    studentPhone: row['เบอร์นักเรียน'],
                    parentName: row['ผู้ปกครอง'],
                    parentRelation: row['ความสัมพันธ์'],
                    parentAddress: row['ที่อยู่ผู้ปกครอง'],
                    parentPhone: row['เบอร์ผู้ปกครอง'],
                    enrollmentType: row['สมัครเรียนหลักสูตร'],
                    status: row['สถานะ'] === 'drop' ? 'drop' : 'studying', // Basic mapping
                    // Add required fields for creation if missing
                    role: 'student',
                    email: row['อีเมลล์'] !== '-' ? row['อีเมลล์'] : undefined,
                    isRegistry: true
                }));

                // Send to Backend
                const token = await currentUser?.getIdToken();
                const res = await fetch(API_ENDPOINTS.ADMIN.IMPORT_REGISTRY, {
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

                // Refresh list
                fetchRegistry();

            } catch (error) {
                console.error('Import Error:', error);
                toast.error('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
            } finally {
                setIsImporting(false);
                // Reset file input
                e.target.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    // HELPERS
    const renderSubjectWithIcon = (subjectName: string) => {
        const lowerSubject = subjectName.toLowerCase();
        let icon = <BookOpen className="w-4 h-4 text-slate-500" />;
        let colorClass = "bg-slate-50 text-slate-700 border-slate-200";

        // Simple heuristics for icons
        if (lowerSubject.includes('arduino') || lowerSubject.includes('microbit')) {
            colorClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
        } else if (lowerSubject.includes('iot') || lowerSubject.includes('internet')) {
            colorClass = "bg-blue-50 text-blue-700 border-blue-200";
        } else if (lowerSubject.includes('python') || lowerSubject.includes('code')) {
            colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
        }

        return (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-none border ${colorClass} w-full min-w-[140px]`}>
                {icon}
                <span className="truncate font-medium text-xs font-itim">{subjectName}</span>
            </div>
        );
    };

    const getRoleBadge = (role: string, isApproved: boolean) => {
        if (role === 'admin') return <Badge variant="destructive" className="rounded-none px-3">แอดมิน</Badge>;
        if (role === 'teacher') return <Badge variant="default" className="rounded-none px-3 bg-blue-500">ครู</Badge>;
        return <Badge variant="outline" className="rounded-none px-3 border-slate-300 text-slate-700">นักเรียน</Badge>;
    };

    // HANDLERS
    const handleViewDetails = (user: any) => {
        setSelectedUser(user);
        setEditForm(user);
        setIsEditing(false);
        setNewPassword('');
        setShowDetails(true);
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm(selectedUser || {});
        } else {
            setIsEditing(true);
            setEditForm(selectedUser || {});
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

    const handleSaveChanges = async () => {
        if (!selectedUser || !currentUser) return;

        setActionLoading(true);
        try {
            const token = await currentUser.getIdToken();

            // Prepare payload
            const { _id, createdAt, role, isApproved, ...updatePayload } = editForm;

            if (newPassword) {
                updatePayload.passwordHash = newPassword;
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

    // EXPORT HANDLER
    const handleExport = () => {
        if (!filteredUsers.length) {
            toast.error('ไม่มีข้อมูลให้ส่งออก');
            return;
        }

        const wb = XLSX.utils.book_new();
        // Flatten data for export
        const exportData = filteredUsers.map(u => ({
            'ID': u.studentIdMap || '',
            'คำนำหน้า': u.prefix || '',
            'ชื่อ': u.firstName || '',
            'นามสกุล': u.lastName || '',
            'ชื่อเล่น': u.nickname || '',
            'ระดับชั้น': u.studentClass || '',
            'สถานะ': STATUS_MAP[u.status || 'studying']?.label || u.status,
            'เบอร์นักเรียน': u.studentPhone || '',
            'โรงเรียน': u.school || '',
            // Add more fields as needed
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Registry Data");

        const filename = selectedFile ? `Registry_${selectedFile.match(/\d+/)?.[0] || 'Export'}.xlsx` : 'Registry_Export.xlsx';
        XLSX.writeFile(wb, filename);
        toast.success('ส่งออกไฟล์ Excel สำเร็จ');
    };


    const handleImportFromServer = async () => {
        if (!selectedFile) {
            toast.error('กรุณาเลือกปีการศึกษาก่อน');
            return;
        }

        setIsImporting(true);
        try {
            const token = await currentUser?.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.IMPORT_FROM_SERVER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filename: selectedFile })
            });

            if (!res.ok) throw new Error('Failed to import');

            const result = await res.json();
            toast.success(`นำเข้าข้อมูลจากไฟล์ ${selectedFile.match(/\d+/)?.[0]} สำเร็จ: ${result.count} รายการ`);
            fetchRegistry();
        } catch (error) {
            console.error('Import from Server Error:', error);
            toast.error('เกิดข้อผิดพลาดในการนำเข้าข้อมูลจาก Server');
        } finally {
            setIsImporting(false);
        }
    };


    const fetchExcelFiles = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.EXCEL_FILES, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExcelFiles(data);
                if (data.length > 0) setSelectedFile(data[0]);
            }
        } catch (error) {
            console.error('Error fetching excel files:', error);
        }
    };

    const fetchRegistry = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(API_ENDPOINTS.ADMIN.REGISTRY_LIST, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchRegistry();
            fetchExcelFiles();
        }
    }, [currentUser]);

    // [NEW] Fix IDs
    const handleFixIds = async () => {
        try {
            const token = await currentUser?.getIdToken(); // Use currentUser to get token
            if (!token) {
                toast.error('Authentication token not found.');
                return;
            }
            const response = await fetch(`${API_ENDPOINTS.ADMIN.REGISTRY_LIST}/fix-ids`, { // Corrected API endpoint
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || 'IDs re-sequenced successfully');
                fetchRegistry(); // Refresh
            } else {
                toast.error(data.message || 'Failed to fix IDs');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error fixing IDs');
        }
    };

    return (
        <div className="space-y-4">
            <Card className="rounded-none shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/dashboard/admin')}
                                    className="h-8 w-8 p-0 rounded-full border-slate-300 hover:bg-white hover:text-slate-700"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    ทะเบียนนักเรียน {selectedFile ? `[ปี ${selectedFile.match(/\d+/)?.[0] || ''}]` : ''}
                                </CardTitle>
                            </div>
                            {/* Added CardDescription based on the provided change, assuming it's an addition */}
                            <CardDescription>จัดการข้อมูลนักเรียนจากไฟล์ Excel และตรวจสอบรายชื่อ</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* [NEW] Fix IDs Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleFixIds}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 rounded-none"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-sequence IDs
                            </Button>

                            {/* Year Selector */}
                            <div className="flex items-center gap-2 bg-white p-1 border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 pl-2">ปีการศึกษา:</span>
                                <select
                                    className="text-sm border-none focus:ring-0 cursor-pointer h-8 px-2 bg-transparent font-bold text-indigo-600 outline-none"
                                    value={selectedFile}
                                    onChange={(e) => setSelectedFile(e.target.value)}
                                    disabled={isImporting}
                                >
                                    {excelFiles.map(file => (
                                        <option key={file} value={file}>
                                            25{file.match(/\d+/)?.[0] || file}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    size="sm"
                                    onClick={handleImportFromServer}
                                    disabled={isImporting || !selectedFile}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none h-8"
                                >
                                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    นำเข้าข้อมูล
                                </Button>
                            </div>

                            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="bg-orange-500 hover:bg-orange-600 text-white rounded-none h-8"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Excel
                            </Button>

                            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none h-8 font-bold shadow-sm"
                                size="sm"
                                onClick={() => setShowAddStudent(true)}
                            >
                                <UserIcon className="w-4 h-4 mr-2" />
                                เพิ่มนักเรียนใหม่
                            </Button>


                            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="excel-upload"
                                    disabled={isImporting}
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-none cursor-pointer transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {isImporting ? 'กำลังนำเข้า...' : 'Import from PC'}
                                </label>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="ค้นหาชื่อ, รหัส, หรือชื่อเล่น..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 rounded-none border-slate-300 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[80px] font-bold text-slate-700">ID</TableHead>
                                    <TableHead className="w-[180px] font-bold text-slate-700">ชื่อ-นามสกุล</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-700">ชื่อเล่น</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-700">ระดับชั้น</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-700">อายุ</TableHead>
                                    <TableHead className="w-[120px] font-bold text-slate-700">ผู้ปกครอง</TableHead>
                                    <TableHead className="w-[120px] font-bold text-slate-700">เบอร์ผู้ปกครอง</TableHead>
                                    <TableHead className="min-w-[200px] font-bold text-slate-700">ที่อยู่</TableHead>
                                    <TableHead className="w-[80px] font-bold text-slate-700">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                                            {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูล'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((u, i) => (
                                        <TableRow key={u._id || i} className="hover:bg-slate-50 border-b border-slate-100">
                                            <TableCell className="font-mono text-xs">{u.studentIdMap || '-'}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{u.prefix}{u.firstName} {u.lastName}</div>
                                            </TableCell>
                                            <TableCell>{u.nickname || '-'}</TableCell>
                                            <TableCell>{u.studentClass || '-'}</TableCell>
                                            <TableCell>{u.age || '-'}</TableCell>
                                            <TableCell>{u.parentName || '-'}</TableCell>
                                            <TableCell>{u.parentPhone || '-'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={u.address}>
                                                {u.address || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-none"
                                                    onClick={() => handleViewDetails(u)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Details/Edit Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border border-slate-200 rounded-none shadow-lg h-[80vh] flex flex-col">
                    <DialogTitle className="sr-only">รายละเอียดผู้ใช้งาน</DialogTitle>
                    <DialogDescription className="sr-only">แบบฟอร์มแก้ไขข้อมูล</DialogDescription>

                    {selectedUser && (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-indigo-600" />
                                        แก้ไขข้อมูลนักเรียน
                                    </div>
                                    <Badge variant="outline" className="rounded-none px-3 border-slate-300 text-slate-700">
                                        {selectedUser.studentIdMap || 'New'}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleEditToggle}
                                        className={`px-4 py-2 rounded-none h-9 ${isEditing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {isEditing ? <div className="flex items-center gap-2"><X className="h-3 w-3" /> ยกเลิก</div> : <div className="flex items-center gap-2"><Edit2 className="h-3 w-3" /> แก้ไข</div>}
                                    </Button>
                                    {isEditing && (
                                        <Button onClick={handleSaveChanges} disabled={actionLoading} className="px-4 py-2 rounded-none h-9 bg-green-600 hover:bg-green-700 text-white">
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} บันทึก
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Body - 2 Column Grid */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Personal Info */}
                                    <Card className="rounded-none shadow-sm border-slate-200">
                                        <CardHeader className="py-3 px-4 bg-white border-b border-slate-100">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-indigo-500" /> ข้อมูลส่วนตัว
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">คำนำหน้า</Label>
                                                    {isEditing ? <Input value={editForm.prefix || ''} onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.prefix || '-'}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">ชื่อเล่น</Label>
                                                    {isEditing ? <Input value={editForm.nickname || ''} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.nickname || '-'}</div>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">ชื่อจริง</Label>
                                                    {isEditing ? <Input value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.firstName || '-'}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">นามสกุล</Label>
                                                    {isEditing ? <Input value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.lastName || '-'}</div>}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-500 uppercase">โรงเรียน</Label>
                                                {isEditing ? <Input value={editForm.school || ''} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.school || '-'}</div>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">ระดับชั้น</Label>
                                                    {isEditing ? <Input value={editForm.studentClass || ''} onChange={(e) => setEditForm({ ...editForm, studentClass: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.studentClass || '-'}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">อายุ</Label>
                                                    {isEditing ? <Input type="number" value={editForm.age || ''} onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.age || '-'}</div>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Contact & Parent Info */}
                                    <Card className="rounded-none shadow-sm border-slate-200">
                                        <CardHeader className="py-3 px-4 bg-white border-b border-slate-100">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-emerald-500" /> ข้อมูลติดต่อ & ผู้ปกครอง
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-500 uppercase">ที่อยู่</Label>
                                                {isEditing ? <Input value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium truncate" title={selectedUser.address}>{selectedUser.address || '-'}</div>}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-500 uppercase">เบอร์นักเรียน</Label>
                                                {isEditing ? <Input value={editForm.studentPhone || ''} onChange={(e) => setEditForm({ ...editForm, studentPhone: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.studentPhone || '-'}</div>}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-500 uppercase">ชื่อผู้ปกครอง</Label>
                                                {isEditing ? <Input value={editForm.parentName || ''} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.parentName || '-'}</div>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">คนสัมพันธ์</Label>
                                                    {isEditing ? <Input value={editForm.parentRelation || ''} onChange={(e) => setEditForm({ ...editForm, parentRelation: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.parentRelation || '-'}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">เบอร์ผู้ปกครอง</Label>
                                                    {isEditing ? <Input value={editForm.parentPhone || ''} onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.parentPhone || '-'}</div>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* System Status (Col-span-full on mobile) */}
                                    <div className="md:col-span-2">
                                        <Card className="rounded-none shadow-sm border-slate-200">
                                            <CardHeader className="py-3 px-4 bg-white border-b border-slate-100">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4 text-orange-500" /> สถานะการเรียน
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">หลักสูตรที่สมัคร</Label>
                                                    {isEditing ? <Input value={editForm.enrollmentType || ''} onChange={(e) => setEditForm({ ...editForm, enrollmentType: e.target.value })} className="h-8 rounded-none" /> : <div className="text-sm font-medium">{selectedUser.enrollmentType || '-'}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">สถานะ</Label>
                                                    {isEditing ? (
                                                        <Select value={editForm.status || 'studying'} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                                                            <SelectTrigger className="h-8 rounded-none"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(STATUS_MAP).map(([k, { label }]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <div className="text-sm font-medium">
                                                            <Badge className={`rounded-none ${STATUS_MAP[selectedUser.status || 'studying']?.color}`}>{STATUS_MAP[selectedUser.status || 'studying']?.label}</Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AddStudentDialog
                open={showAddStudent}
                onOpenChange={setShowAddStudent}
                onSuccess={fetchRegistry}
            />
        </div >
    );
}
