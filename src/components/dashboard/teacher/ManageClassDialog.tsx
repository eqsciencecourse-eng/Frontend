import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, ArrowRight, Plus, Save, Loader2, Filter, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';

interface ManageClassDialogProps {
    isOpen: boolean;
    onClose: () => void;
    students: any[];
    onUpdate: () => void;
}

export default function ManageClassDialog({ isOpen, onClose, students, onUpdate }: ManageClassDialogProps) {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [targetClass, setTargetClass] = useState<string>('');
    const [isNewClass, setIsNewClass] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [filterClass, setFilterClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Derive available classes
    const availableClasses = Array.from(new Set(students.map(s => s.studentClass).filter(Boolean))).sort();

    // Filter students
    const filteredStudents = students.filter(s => {
        const matchesClass = filterClass === 'all' || s.studentClass === filterClass;
        const matchesSearch = s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Add all visible IDs that aren't already selected
            const visibleIds = filteredStudents.map(s => s._id);
            setSelectedStudents(prev => Array.from(new Set([...prev, ...visibleIds])));
        } else {
            // Remove visible IDs from selection
            const visibleIds = new Set(filteredStudents.map(s => s._id));
            setSelectedStudents(prev => prev.filter(id => !visibleIds.has(id)));
        }
    };

    const isAllVisibleSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s._id));

    const handleToggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (selectedStudents.length === 0) return toast.error('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');

        const finalClassName = isNewClass ? newClassName : targetClass;
        if (!finalClassName) return toast.error('กรุณาระบุห้องเรียนปลายทาง');

        setLoading(true);
        try {
            const token = localStorage.getItem('token'); // Or use useAuth() context if available passed down
            // Assuming endpoint exists or using existing update pattern
            // NOTE: Using a hypothetical bulk endpoint, or loop update if not exists.
            // Given the project structure, let's try to find if a bulk endpoint exists or use loop.
            // implementation_plan says we need to fix UI, assuming backend logic is "ok" or we use loop.
            // Let's use loop for safety if bulk doesn't exist, OR check if we have bulk endpoint
            // UsersService loop update is safer if we are unsure.

            // Revert to safer loop implementation if bulk endpoint is risky
            const promises = selectedStudents.map(id =>
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ studentClass: finalClassName })
                })
            );

            await Promise.all(promises);

            toast.success(`ย้ายนักเรียน ${selectedStudents.length} คน ไปยังห้อง ${finalClassName} เรียบร้อย`);
            if (isMounted.current) {
                onUpdate();
                onClose();
                setSelectedStudents([]);
            }

        } catch (e) {
            console.error(e);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* FULL SCREEN / LARGE LAYOUT FIX */}
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-white border-0 shadow-2xl rounded-lg overflow-hidden font-sans">

                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-white flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">จัดการห้องเรียน (Manage Classes)</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">ย้ายนักเรียนเข้าห้องเรียน หรือสร้างห้องเรียนใหม่</DialogDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                            <X className="w-5 h-5 text-slate-500" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Body - Grid Layout */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden bg-slate-50">

                    {/* LEFT: Filter & List (2 Cols) */}
                    <div className="md:col-span-2 flex flex-col border-r border-slate-200 bg-white h-full overflow-hidden">
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-100 bg-white space-y-4 shrink-0">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="ค้นหาชื่อนักเรียน..."
                                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={filterClass} onValueChange={setFilterClass}>
                                    <SelectTrigger className="w-full sm:w-[200px] bg-slate-50 border-slate-200">
                                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                        <SelectValue placeholder="กรองตามห้อง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">แสดงทุกห้อง</SelectItem>
                                        {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={isAllVisibleSelected}
                                        onCheckedChange={handleSelectAll}
                                        id="select-all"
                                    />
                                    <Label htmlFor="select-all" className="cursor-pointer font-medium">เลือกทั้งหมด ({filteredStudents.length})</Label>
                                </div>
                                <span>เลือกแล้ว ({selectedStudents.length})</span>
                            </div>
                        </div>

                        {/* List */}
                        <ScrollArea className="flex-1 p-4 bg-slate-50/30">
                            {filteredStudents.length > 0 ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-20">
                                    {filteredStudents.map(student => {
                                        const isSelected = selectedStudents.includes(student._id);
                                        return (
                                            <div
                                                key={student._id}
                                                onClick={() => handleToggleStudent(student._id)}
                                                className={`
                                                    group p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between select-none
                                                    ${isSelected
                                                        ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                                                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}
                                                `}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                                                        ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}
                                                    `}>
                                                        {isSelected ? <CheckIcon className="w-4 h-4" /> : <span className="text-xs font-bold">{student.displayName?.[0] || 'S'}</span>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {student.displayName || student.studentName}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                                                {student.studentClass || 'ไม่ระบุห้อง'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Checkbox Visual */}
                                                <div className={`
                                                    w-5 h-5 rounded border flex items-center justify-center ml-2
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}
                                                `}>
                                                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                                    <Search className="w-10 h-10 mb-2 opacity-20" />
                                    <p>ไม่พบนักเรียนตามเงื่อนไข</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* RIGHT: Action Panel */}
                    <div className="col-span-1 bg-white flex flex-col h-full border-l border-slate-200 shadow-xl z-10">
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-1">
                                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                                    ดำเนินการย้ายห้อง
                                </h3>
                                <p className="text-sm text-slate-500">เลือกห้องปลายทางที่ต้องการย้ายนักเรียนที่เลือกไป</p>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-center ring-1 ring-slate-100">
                                <div className="text-4xl font-black text-indigo-600 mb-1 tracking-tighter shadow-sm">{selectedStudents.length}</div>
                                <div className="text-sm font-medium text-slate-600 uppercase tracking-wide">นักเรียนที่เลือก</div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-slate-700">ห้องเรียนปลายทาง</Label>

                                    {/* Mode Toggle */}
                                    <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
                                        <button
                                            onClick={() => setIsNewClass(false)}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${!isNewClass ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            ห้องที่มีอยู่เดิม
                                        </button>
                                        <button
                                            onClick={() => setIsNewClass(true)}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${isNewClass ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            สร้างห้องใหม่
                                        </button>
                                    </div>

                                    {!isNewClass ? (
                                        <div className="animation-fade-in">
                                            <Select value={targetClass} onValueChange={setTargetClass}>
                                                <SelectTrigger className="h-11 bg-white border-slate-300">
                                                    <SelectValue placeholder="เลือกห้องเรียน..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableClasses.length > 0 ? (
                                                        availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                                                    ) : (
                                                        <div className="p-2 text-xs text-center text-slate-400">ไม่มีข้อมูลห้องเรียน</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="animation-fade-in space-y-2">
                                            <Input
                                                placeholder="ชื่อห้องใหม่ (เช่น ป.6/1)"
                                                value={newClassName}
                                                onChange={e => setNewClassName(e.target.value)}
                                                autoFocus
                                                className="h-11 border-indigo-200 focus:border-indigo-500 bg-indigo-50/30"
                                            />
                                            <p className="text-xs text-indigo-500 font-medium">* จะทำการสร้างชื่อห้องใหม่ให้กับนักเรียนที่เลือก</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                                disabled={selectedStudents.length === 0 || (!targetClass && !newClassName) || loading}
                                onClick={handleSave}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                ยืนยันการย้ายข้อมูล
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}
