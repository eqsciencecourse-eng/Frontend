'use client';

import { useState, useMemo } from 'react';
import { Check, Search, Filter, Users, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Student {
    _id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    studentClass?: string;
    parentName?: string;
    studentName?: string;
}

interface StudentSelectorProps {
    students: Student[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    onDeleteUser?: (id: string, name: string) => void;
}

export default function StudentSelector({ students, selectedIds, onSelectionChange, onDeleteUser }: StudentSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState<string | null>(null);

    // Extract unique classes for filter
    const classes = useMemo(() => {
        const unique = new Set(students.map(s => s.studentClass).filter(Boolean));
        return Array.from(unique).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch =
                (student.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesClass = classFilter ? student.studentClass === classFilter : true;
            return matchesSearch && matchesClass;
        });
    }, [students, searchTerm, classFilter]);

    const handleSelectAll = () => {
        if (filteredStudents.every(s => selectedIds.includes(s._id))) {
            // Deselect all visible
            const newSelected = selectedIds.filter(id => !filteredStudents.find(s => s._id === id));
            onSelectionChange(newSelected);
        } else {
            // Select all visible
            const newIds = filteredStudents.map(s => s._id);
            const combined = Array.from(new Set([...selectedIds, ...newIds]));
            onSelectionChange(combined);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s._id));

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Header / Filter */}
            <div className="p-4 border-b space-y-3 bg-slate-50/50">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="ค้นหานักเรียน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white"
                        />
                    </div>
                    {/* Class Filters */}
                    {classes.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] scrollbar-thin">
                            {classes.map(cls => (
                                <Badge
                                    key={cls}
                                    variant={classFilter === cls ? "default" : "outline"}
                                    onClick={() => setClassFilter(classFilter === cls ? null : cls as string)} // Cast cls to string
                                    className="cursor-pointer whitespace-nowrap"
                                >
                                    {cls}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            id="select-all"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                            เลือกทั้งหมด ({filteredStudents.length})
                        </label>
                    </div>
                    <span className="text-sm text-slate-400">
                        เลือกแล้ว {selectedIds.length} คน
                    </span>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {filteredStudents.map(student => (
                        <div
                            key={student._id}
                            onClick={() => toggleSelection(student._id)}
                            className={`group flex items-center gap-3 p-3 rounded-none cursor-pointer transition-colors border-b last:border-0 ${selectedIds.includes(student._id)
                                ? 'bg-emerald-50 border-emerald-100'
                                : 'bg-white border-slate-50 hover:bg-slate-50'
                                }`}
                        >
                            <Checkbox checked={selectedIds.includes(student._id)} />
                            <Avatar className="h-10 w-10 border border-slate-100">
                                <AvatarImage src={student.photoURL} />
                                <AvatarFallback className="bg-slate-100 text-slate-400">
                                    <Users className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm text-slate-800 truncate">{student.studentName || student.displayName}</p>
                                    {student.studentClass && (
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {student.studentClass}
                                        </Badge>
                                    )}
                                </div>
                                {(!student.email?.includes('placeholder.com') && !student.email?.includes('no-email')) && (
                                    <p className="text-xs text-slate-500 truncate">{student.email}</p>
                                )}
                            </div>

                            {onDeleteUser && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteUser(student._id, student.displayName);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>ไม่พบนักเรียน</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
