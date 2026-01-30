'use client';

import { useAuth } from '@/context/AuthContext';
import { Label } from '@/components/ui/label';
import { User, GraduationCap, School, BookOpen, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

export default function EditProfileForm() {
    const { user } = useAuth();
    const subjects = user?.enrolledSubjects || [];

    return (
        <div className="space-y-6 pt-2">

            {/* Header / Intro */}
            <div className="flex flex-col space-y-1.5 pb-4">
                <h3 className="font-semibold text-lg leading-none tracking-tight">ข้อมูลส่วนตัว</h3>
                <p className="text-sm text-slate-500">
                    ข้อมูลนี้ถูกบันทึกโดยผู้ดูแลระบบ (Admin) หากต้องการแก้ไขกรุณาติดต่อเจ้าหน้าที่
                </p>
            </div>

            <Separator className="bg-slate-100" />

            {/* Personal Info Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-slate-500 font-medium">ชื่อผู้ปกครอง</Label>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500">
                            <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">{user?.parentName || '-'}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-500 font-medium">ชื่อนักเรียน</Label>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500">
                            <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">{user?.studentName || user?.displayName || '-'}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-500 font-medium">ชื่อเล่น</Label>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-yellow-500">
                            <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">{user?.nickname || '-'}</span>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-500 font-medium">โรงเรียน</Label>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-pink-500">
                            <School className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">{user?.school || '-'}</span>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-500 font-medium">ระดับการศึกษา</Label>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-purple-500">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-700">
                            {user?.educationLevel ? (EDUCATION_LEVEL_MAP[user.educationLevel] || user.educationLevel) : '-'}
                        </span>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-100 my-6" />

            {/* Enrolled Subjects */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800">รายวิชาที่ลงทะเบียน</h3>
                </div>

                {subjects.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {subjects.map((subject, index) => (
                            <div key={index} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="w-1.5 h-8 bg-indigo-500 rounded-full group-hover:scale-y-110 transition-transform"></div>
                                <span className="font-medium text-slate-700 flex-1">{subject}</span>
                                <div className="text-xs text-slate-400 font-mono px-2 py-1 bg-slate-50 rounded">Course</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ยังไม่มีรายวิชาที่ลงทะเบียน</p>
                    </div>
                )}
            </div>
        </div>
    );
}
