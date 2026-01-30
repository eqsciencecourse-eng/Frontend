'use client';

import { motion } from 'framer-motion';
import { Code, Cpu, Database, Globe, Laptop, Server, Wifi } from 'lucide-react';

export default function TechBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50 dark:bg-slate-950">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Floating Tech Icons */}
            <FloatingIcon icon={<Code />} x="10%" y="20%" delay={0} color="text-blue-500" />
            <FloatingIcon icon={<Cpu />} x="85%" y="15%" delay={2} color="text-violet-500" />
            <FloatingIcon icon={<Database />} x="75%" y="60%" delay={4} color="text-cyan-500" />
            <FloatingIcon icon={<Server />} x="15%" y="70%" delay={1} color="text-emerald-500" />
            <FloatingIcon icon={<Laptop />} x="50%" y="85%" delay={3} color="text-orange-500" />
            <FloatingIcon icon={<Globe />} x="90%" y="80%" delay={5} color="text-indigo-500" />

            {/* Glowing Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

            {/* Circuit Lines (Simplified as moving gradients) */}
            <motion.div
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_800px_at_50%_200px,#C9EBFF,transparent)]"
            />
        </div>
    );
}

function FloatingIcon({ icon, x, y, delay, color }: { icon: React.ReactNode, x: string, y: string, delay: number, color: string }) {
    return (
        <motion.div
            className={`absolute ${color} opacity-20`}
            style={{ left: x, top: y }}
            animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
            }}
            transition={{
                duration: 5,
                delay: delay,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <div className="w-12 h-12">
                {icon}
            </div>
        </motion.div>
    );
}
