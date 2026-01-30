import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, User, GraduationCap, ShieldCheck, FileText, BarChart } from "lucide-react";

interface UserGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        คู่มือการใช้งานเว็บไซต์ (User Guide)
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        คำแนะนำการใช้งานระบบสำหรับนักเรียน ผู้ปกครอง และครู
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="student" className="h-full flex flex-col">
                        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800">
                            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-4">
                                <TabsTrigger value="student" className="gap-2">
                                    <User className="h-4 w-4" />
                                    สำหรับนักเรียน
                                </TabsTrigger>
                                <TabsTrigger value="parent" className="gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    สำหรับผู้ปกครอง
                                </TabsTrigger>
                                <TabsTrigger value="teacher" className="gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    สำหรับครู
                                </TabsTrigger>
                                <TabsTrigger value="general" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    ทั่วไป
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 p-6 bg-slate-50/30 dark:bg-slate-950">
                            {/* Student Guide */}
                            <TabsContent value="student" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
                                <section>
                                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm">1</span>
                                        การเริ่มต้นใช้งาน (Getting Started)
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>1. คลิกปุ่ม <strong>"เริ่มต้นใช้งาน"</strong> หรือ <strong>"เข้าสู่ระบบ"</strong> ที่หน้าแรก</p>
                                        <p>2. หากยังไม่มีบัญชี ให้เลือก <strong>"เริ่มต้นใช้งาน"</strong> และกรอกข้อมูลให้ครบถ้วน</p>
                                        <p>3. สามารถเข้าสู่ระบบด้วย <strong>Google Account</strong> ได้ทันทีเพื่อความสะดวก</p>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm">2</span>
                                        การลงทะเบียนเรียน (Class Registration)
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>1. ไปที่เมนู <strong>"ตารางเรียน"</strong> ใน Dashboard</p>
                                        <p>2. คลิกปุ่ม <strong>"ขอลงทะเบียนเรียน"</strong> (+) มุมขวาบน</p>
                                        <p>3. เลือกวิชาที่ต้องการ และระบุเวลาที่สะดวก</p>
                                        <p>4. กรอก <strong>เบอร์โทรผู้ปกครอง</strong> (จำเป็น) และกดยืนยัน</p>
                                        <p>5. รอแอดมินอนุมัติ สถานะจะเปลี่ยนเป็น "อนุมัติแล้ว"</p>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xl font-bold text-orange-500 mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-500 text-sm">3</span>
                                        การดูคะแนนสอบ (Check Scores)
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>1. คะแนนล่าสุดจะแสดงที่หน้า <strong>Overview</strong></p>
                                        <p>2. คลิกที่วิชาเพื่อดูรายละเอียดคะแนนรายครั้ง</p>
                                        <p>3. กราฟ <strong>Skill Analysis</strong> จะแสดงจุดแข็งและจุดที่ต้องพัฒนา</p>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* Parent Guide */}
                            <TabsContent value="parent" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
                                <section>
                                    <h3 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">1</span>
                                        การติดตามผลการเรียน
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>• ระบบจะส่งแจ้งเตือนผลการเรียนผ่านทาง <strong>Line</strong> หรือ <strong>Email</strong> ที่นักเรียนลงทะเบียนไว้</p>
                                        <p>• ท่านสามารถเข้าสู่ระบบด้วยบัญชีของนักเรียนเพื่อดูกราฟพัฒนาการอย่างละเอียด</p>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* Teacher Guide */}
                            <TabsContent value="teacher" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
                                <section>
                                    <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">1</span>
                                        การเข้าสู่ระบบครู
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>1. คลิกปุ่ม <strong>"สำหรับครู"</strong> ที่แถบเมนูด้านบน</p>
                                        <p>2. กรอกรหัสประจำตัวครู (Teacher ID) และรหัสผ่าน</p>
                                    </div>
                                </section>
                                <section>
                                    <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">2</span>
                                        การให้คะแนน
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <p>1. เลือกคลาสเรียนที่ต้องการ</p>
                                        <p>2. กรอกคะแนนสอบและอัปโหลดรูปภาพข้อสอบ (ถ้ามี)</p>
                                        <p>3. ระบบจะคำนวณเกรดและแจ้งเตือนนักเรียนอัตโนมัติ</p>
                                    </div>
                                </section>
                            </TabsContent>

                            {/* General Info */}
                            <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
                                <section>
                                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                        <BarChart className="h-6 w-6" />
                                        เกี่ยวกับระบบ EQ Science
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                                            แพลตฟอร์มนี้ถูกออกแบบมาเพื่อยกระดับการเรียนรู้ ด้วยการใช้ข้อมูล (Data-Driven) มาวิเคราะห์จุดแข็งและจุดอ่อนของผู้เรียน
                                            ช่วยให้ครูสามารถออกแบบการสอนที่เหมาะสม และผู้ปกครองสามารถติดตามพัฒนาการได้อย่างใกล้ชิด
                                        </p>
                                    </div>
                                </section>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
