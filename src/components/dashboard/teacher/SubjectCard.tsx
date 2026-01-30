'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users } from 'lucide-react';

interface SubjectCardProps {
    subject: any;
    studentCount?: number;
    onClick: () => void;
}

export default function SubjectCard({ subject, studentCount, onClick }: SubjectCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="h-12 w-12 rounded-xl bg-indigo-100/50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                        {subject.name}
                    </h3>

                </div>

                <div className="mt-6 flex items-center text-sm text-slate-400 font-medium">
                    <Users className="h-4 w-4 mr-1.5" />
                    <span>{studentCount || 0} Students</span>
                </div>
            </div>
        </motion.div>
    );
}
