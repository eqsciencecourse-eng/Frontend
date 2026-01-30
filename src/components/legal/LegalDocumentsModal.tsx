import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText } from "lucide-react";

interface LegalDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "privacy" | "terms";
}

export default function LegalDocumentsModal({ isOpen, onClose, defaultTab = "privacy" }: LegalDocumentsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        เอกสารทางกฎหมาย
                    </DialogTitle>
                    <DialogDescription>
                        Privacy Policy & Terms of Service
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-2">
                    <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="privacy" className="gap-2">
                                <Shield className="h-4 w-4" />
                                Privacy Policy
                            </TabsTrigger>
                            <TabsTrigger value="terms" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Terms of Service
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <ScrollArea className="h-full p-6">
                                <TabsContent value="privacy" className="mt-0 space-y-4">
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        <h2 className="text-xl font-bold text-primary mb-4">นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
                                        <p className="text-slate-500 mb-4">ฉบับปรับปรุงแกไขล่าสุดเมื่อ: 11 ธันวาคม 2025</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">1. บทนำ</h3>
                                        <p>Rayong EQ.Science Learning Center ("เรา", "ทางสถาบัน", หรือ "ระบบ") ให้ความสำคัญอย่างยิ่งกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน...</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">2. ข้อมูลที่เราเก็บรวบรวม</h3>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>ข้อมูลระบุตัวตน:</strong> ชื่อ-นามสกุล, ชื่อเล่น, รหัสนักเรียน (Student ID)</li>
                                            <li><strong>ข้อมูลการติดต่อ:</strong> เบอร์โทรศัพท์, อีเมล, Line ID</li>
                                            <li><strong>ข้อมูลการเข้าเรียน:</strong> ประวัติการเช็กชื่อ, เวลาเข้าเรียน (Check-in), สถานะการมาเรียน (Present/Late)</li>
                                            <li><strong>ข้อมูลการศึกษา:</strong> ประวัติผลการเรียน, เกียรติบัตร, การบ้าน</li>
                                            <li><strong>ข้อมูลทางเทคนิค:</strong> IP Address, Cookies, Log Files เพื่อความปลอดภัย</li>
                                        </ul>

                                        <h3 className="font-bold text-lg mt-4 mb-2">3. วัตถุประสงค์การใช้ข้อมูล</h3>
                                        <p>เราใช้ข้อมูลเพื่อให้บริการระบบติดตามการเข้าเรียน, รายงานประวัติการเรียนทาง Line Notify, ออกเกียรติบัตร และวิเคราะห์พัฒนาการผู้เรียน</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">4. การเปิดเผยข้อมูล</h3>
                                        <p>เราไม่ขายข้อมูลให้บุคคลภายนอก ข้อมูลอาจถูกเข้าถึงโดยครูผู้สอน หรือผู้ปกครอง (กรณีนักเรียน) เพื่อการติดตามผลการเรียน</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">5. ความปลอดภัย</h3>
                                        <p>ข้อมูลถูกจัดเก็บอย่างปลอดภัยบน Google Cloud / MongoDB Atlas ด้วยมาตรฐานความปลอดภัยระดับสากล</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="terms" className="mt-0 space-y-4">
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        <h2 className="text-xl font-bold text-primary mb-4">ข้อตกลงการใช้งาน (Terms of Service)</h2>
                                        <p className="text-slate-500 mb-4">ฉบับปรับปรุงแกไขล่าสุดเมื่อ: 11 ธันวาคม 2025</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">1. ข้อตกลงทั่วไป</h3>
                                        <p>การเข้าใช้งานระบบถือว่าท่านยอมรับข้อตกลงนี้ หากไม่เห็นด้วยโปรดระงับการใช้งาน</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">2. บัญชีผู้ใช้และความปลอดภัย</h3>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>ต้องให้ข้อมูลที่เป็นความจริง</li>
                                            <li>เก็บรักษารหัสผ่านเป็นความลับ</li>
                                            <li>แจ้งทันทีหากพบการเข้าถึงโดยไม่ได้รับอนุญาต</li>
                                        </ul>

                                        <h3 className="font-bold text-lg mt-4 mb-2">3. การใช้งานที่เหมาะสม</h3>
                                        <p>ห้ามใช้ผิดกฎหมาย, ห้าม Hack, ห้ามทุจริตผลคะแนน</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">4. ทรัพย์สินทางปัญญา</h3>
                                        <p>เนื้อหาและสื่อการสอนเป็นลิขสิทธิ์ของสถาบัน ห้ามทำซ้ำหรือเผยแพร่โดยไม่ได้รับอนุญาต</p>

                                        <h3 className="font-bold text-lg mt-4 mb-2">5. การระงับการให้บริการ</h3>
                                        <p>เราขอสงวนสิทธิ์ระงับบัญชีหากทำผิดกฎ หรือมีพฤติกรรมไม่เหมาะสม</p>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
