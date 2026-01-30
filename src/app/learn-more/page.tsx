'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

export default function LearnMorePage() {
    return (
        <div className="min-h-screen bg-white font-serif text-slate-900">
            {/* Navbar */}
            <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                        <span>กลับสู่หน้าหลัก</span>
                    </Link>
                    <div className="font-bold text-xl">คู่มือการใช้งานระบบ</div>
                    <div className="w-20"></div> {/* Spacer for centering */}
                </div>
            </nav>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-16 space-y-6">
                    <div className="relative h-20 w-auto aspect-[3/1] mx-auto">
                        <Image
                            src="/logo.png"
                            alt="EQ Science Logo"
                            width={200}
                            height={67}
                            className="object-contain mx-auto"
                        />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                        ระเบียบและขั้นตอนการใช้งานระบบสารสนเทศ
                    </h1>
                    <p className="text-lg text-slate-600">
                        ศูนย์การเรียนรู้ Rayong EQ.Science
                    </p>
                    <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full"></div>
                </div>

                {/* Content */}
                <div className="space-y-12">
                    {/* Section 1: Registration */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xl">
                                1
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">การสมัครสมาชิก (Registration)</h2>
                        </div>
                        <div className="pl-14 space-y-4 text-slate-700 leading-relaxed">
                            <p>
                                ผู้ปกครองและนักเรียนที่ประสงค์จะเข้าใช้งานระบบ จะต้องทำการลงทะเบียนเพื่อบันทึกข้อมูลเข้าสู่ฐานข้อมูลกลาง โดยมีขั้นตอนดังนี้:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>กดปุ่ม <strong>"Get Started"</strong> ที่หน้าแรกของเว็บไซต์</li>
                                <li>กรอกข้อมูลส่วนตัวให้ครบถ้วน ได้แก่ ชื่อผู้ปกครอง, ชื่อนักเรียน, ระดับชั้น และเวลาเรียนที่สะดวก</li>
                                <li>กดปุ่ม <strong>"Register & Login with Google"</strong> เพื่อยืนยันตัวตนและบันทึกข้อมูล</li>
                                <li>ระบบจะทำการตรวจสอบและบันทึกข้อมูลของท่านเข้าสู่ระบบทันที</li>
                            </ul>
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex gap-3 items-start mt-4">
                                <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-orange-800">
                                    <strong>หมายเหตุ:</strong> กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยัน เพื่อประโยชน์ในการติดต่อสื่อสารและการจัดเก็บผลการเรียน
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Login */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                                2
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">การเข้าสู่ระบบ (Login)</h2>
                        </div>
                        <div className="pl-14 space-y-4 text-slate-700 leading-relaxed">
                            <p>
                                สำหรับสมาชิกที่มีบัญชีอยู่แล้ว สามารถเข้าใช้งานได้ตามขั้นตอนดังนี้:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>กดปุ่ม <strong>"เข้าสู่ระบบ"</strong> ที่แถบเมนูด้านบน</li>
                                <li>เลือก <strong>"Login with Google"</strong></li>
                                <li>ระบบจะตรวจสอบบัญชีของท่าน หากพบข้อมูลจะนำท่านเข้าสู่หน้า Dashboard ทันที</li>
                            </ul>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex gap-3 items-start mt-4">
                                <CheckCircle className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-700">
                                    หากระบบไม่พบข้อมูลบัญชีของท่าน จะมีการแจ้งเตือนให้ท่านทำการสมัครสมาชิกใหม่อีกครั้ง
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Teacher Access */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xl">
                                3
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">สำหรับบุคลากร (Teacher Access)</h2>
                        </div>
                        <div className="pl-14 space-y-4 text-slate-700 leading-relaxed">
                            <p>
                                คุณครูและผู้ดูแลระบบสามารถเข้าใช้งานผ่านเมนู <strong>"เข้าสู่ระบบครู"</strong> โดยแบ่งเป็น:
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="border p-4 rounded-lg">
                                    <h3 className="font-bold text-lg mb-2">คุณครู</h3>
                                    <p className="text-sm">เข้าสู่ระบบด้วย Username และ Password ที่ได้รับจากทางสถาบัน</p>
                                </div>
                                <div className="border p-4 rounded-lg">
                                    <h3 className="font-bold text-lg mb-2">ผู้ดูแลระบบ</h3>
                                    <p className="text-sm">เข้าสู่ระบบด้วย Google Account ที่ได้รับการอนุมัติสิทธิ์แล้วเท่านั้น</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Action */}
                <div className="mt-20 text-center">
                    <Link href="/">
                        <Button size="lg" className="h-12 px-8 text-lg bg-slate-900 text-white hover:bg-slate-800">
                            รับทราบและกลับสู่หน้าหลัก
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
