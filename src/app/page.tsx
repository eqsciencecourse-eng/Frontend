'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Clock, Briefcase, Star, Shield, GraduationCap, School, Info, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TeacherLoginModal from '@/components/auth/TeacherLoginModal';
import LegalDocumentsModal from '@/components/legal/LegalDocumentsModal';
import UserGuideModal from '@/components/guide/UserGuideModal';
import TechBackground from '@/components/landing/TechBackground';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const { loginWithCredentials } = useAuth();
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [userGuideModalOpen, setUserGuideModalOpen] = useState(false);
  const [studentInfoOpen, setStudentInfoOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Student Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Scroll animations
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithCredentials({ username, password });
      toast.success('เข้าสู่ระบบสำเร็จ');
      setStudentInfoOpen(false);
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLoginSuccess = () => {
    setTeacherModalOpen(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden selection:bg-primary/30 relative">
      <TechBackground />

      {/* Navbar Overlay */}
      <nav className="fixed top-0 inset-x-0 z-50 h-24 transition-all duration-300 glass border-b border-white/10 flex items-center">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="relative w-48 h-14"
            >
              <Image
                src="/logo.png"
                alt="EQ.Science Logo"
                width={192}
                height={56}
                className="object-contain object-left"
                priority
              />
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex items-center pt-24 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

            {/* Hero Text */}
            <motion.div
              style={{ y: heroY, opacity }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold tracking-wider mb-8 backdrop-blur-sm">
                <Star className="h-4 w-4 fill-blue-500" />
                แพลตฟอร์มการเรียนรู้คอมพิวเตอร์แห่งอนาคต
              </div>

              <h1 className="text-2xl md:text-5xl lg:text-6xl font-black leading-tight mb-8 tracking-tight">
                <span className="block text-slate-800 dark:text-white mb-2">ระบบติดตามผลการเรียน</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 animate-gradient-x">
                  และเช็กประวัติการมาเรียน
                </span>
              </h1>

              <p className="text-xl md:text-1xl text-slate-600 dark:text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                ยกระดับการเรียนรู้ด้วยเทคโนโลยีทันสมัย เข้าถึงข้อมูลได้ทุกที่ทุกเวลา
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {/* Student Login Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStudentInfoOpen(true)}
                  className="group relative px-8 py-4 rounded-full font-bold text-lg transition-all duration-300
                             bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 overflow-hidden w-full sm:w-auto min-w-[240px]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <GraduationCap className="w-6 h-6" />
                    เข้าสู่ระบบสำหรับนักเรียน
                  </span>
                </motion.button>

                {/* Teacher Login Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTeacherModalOpen(true)}
                  className="group relative px-8 py-4 rounded-full font-bold text-lg transition-all duration-300
                             bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-700
                             hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-500 dark:hover:text-orange-400
                             shadow-lg w-full sm:w-auto min-w-[240px]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <School className="w-6 h-6" />
                    เข้าสู่ระบบสำหรับครู
                  </span>
                </motion.button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">ทำไมคุณถึงต้องใช้ ระบบจัดการเรียนรู้ของ EQ Science?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              เพราะเราใส่ใจในทุกรายละเอียดของการเรียนรู้ เพื่อให้มั่นใจว่าผู้เรียนจะได้รับประสบการณ์ที่ดีที่สุด
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-violet-500" />}
              title="ระบบที่มีความเสถียรสูง"
              desc="ระบบที่มีความเสถียรสูง รองรับการใช้งานพร้อมกันจำนวนมาก"
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-cyan-500" />}
              title="ข้อมูลอัปเดตทันที"
              desc="ข้อมูลอัปเดตทันที ไม่ต้องรอนาน ทั้งคะแนนและการบ้าน"
            />
            <FeatureCard
              icon={<Briefcase className="h-8 w-8 text-pink-500" />}
              title="จัดเก็บข้อมูลอย่างเป็นระบบ"
              desc="จัดเก็บข้อมูลอย่างเป็นระบบ เพื่อการนำไปใช้ต่ออย่างมืออาชีพ"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-500">
            ©Rayong EQ.Science Learning Center.
          </div>
          <div className="flex gap-6">
            <button onClick={() => { setLegalTab('privacy'); setLegalModalOpen(true); }} className="text-slate-400 hover:text-primary transition-colors text-sm">Privacy Policy</button>
            <button onClick={() => { setLegalTab('terms'); setLegalModalOpen(true); }} className="text-slate-400 hover:text-primary transition-colors text-sm">Terms of Service</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LegalDocumentsModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalTab}
      />

      <UserGuideModal
        isOpen={userGuideModalOpen}
        onClose={() => setUserGuideModalOpen(false)}
      />

      {/* Student Login Info Dialog with Inline Form */}
      <Dialog open={studentInfoOpen} onOpenChange={setStudentInfoOpen}>
        <DialogContent className="sm:max-w-md border-0 rounded-2xl shadow-2xl bg-white dark:bg-slate-900 p-6">
          <DialogHeader className="mb-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">คำแนะนำการเข้าสู่ระบบ</DialogTitle>
            <DialogDescription className="text-center pt-2 text-base text-slate-600">
              นักเรียนต้องได้รับ <strong>Username</strong> และ <strong>Password</strong> จากแอดมินเท่านั้น
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้ (Username)</Label>
              <Input
                id="username"
                placeholder="กรอกชื่อผู้ใช้"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-xl"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน (Password)</Label>
              <Input
                id="password"
                type="password"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/20 mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>
          </form>

          <div className="pt-6 text-center text-sm text-slate-500">
            <p className="mb-2">หากยังไม่ได้รับรหัสผ่าน สามารถติดต่อแอดมินได้ที่</p>
            <a
              href="https://www.facebook.com/Eq.Science"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
            >
              Facebook: Eq.Science <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherModalOpen} onOpenChange={setTeacherModalOpen}>
        <DialogContent className="sm:max-w-md glass-card border-0">
          <DialogHeader>
            <DialogTitle>เข้าสู่ระบบครู</DialogTitle>
            <DialogDescription className="hidden">Teacher Login</DialogDescription>
          </DialogHeader>
          <TeacherLoginModal onSuccess={handleTeacherLoginSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 backdrop-blur-sm">
      <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-white group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}
