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
            className="group relative overflow-hidden rounded-none bg-white p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all cursor-pointer"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="h-12 w-12 rounded-none bg-slate-100 flex items-center justify-center text-indigo-700 mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm border border-slate-200">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-800 transition-colors">
                        {subject.name}
                    </h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-sm text-slate-500 font-semibold tracking-wide">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{studentCount || 0} Students</span>
                </div>
            </div>
        </motion.div>
    );
}
