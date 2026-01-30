
'use client';

import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HandbookView() {
    return (
        <div className="max-w-4xl mx-auto mt-10 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-8">คู่มือใช้งานเว็บไซต์ ระบบชำระเงิน</h2>

            <div className="bg-black aspect-video w-full rounded-none flex items-center justify-center mb-6">
                {/* Video Placeholder */}
                <div className="text-white text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Video Player Placeholder</p>
                    <p className="text-sm opacity-70">Video source not provided</p>
                </div>
            </div>

            <div className="flex justify-center">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-none">
                    <BookOpen className="w-4 h-4" />
                    Handbook by นายสุภาพร จันทร์ทอง
                </Button>
            </div>
        </div>
    );
}
