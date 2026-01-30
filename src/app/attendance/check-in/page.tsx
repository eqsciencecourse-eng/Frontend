'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Loader2, XCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Suspense } from 'react';

function CheckInContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, token: authToken, loading } = useAuth(); // Destructure loading

    const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [quotaInfo, setQuotaInfo] = useState<{ remaining?: number, deducted?: boolean } | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    // Force Login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            const returnUrl = encodeURIComponent(`/attendance/check-in?token=${token}`);
            router.push(`/auth?mode=login&redirect=${returnUrl}`);
        }
    }, [user, loading, router, token]);

    const handleCheckIn = async () => {
        if (!token) return;
        setStatus('checking');

        try {
            const res = await fetch(API_ENDPOINTS.ATTENDANCE.QR_CHECK_IN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ token })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || 'เช็คชื่อเรียบร้อยแล้ว (Checked in successfully)');

                if (data.quotaDeducted !== undefined) {
                    setQuotaInfo({
                        remaining: data.remainingQuota,
                        deducted: data.quotaDeducted
                    });
                }

                if (data.warning) {
                    setWarning(data.warning);
                    toast.warning(data.warning);
                } else {
                    toast.success('เช็คชื่อสำเร็จ!');
                }

                setTimeout(() => {
                    router.push('/dashboard/student');
                }, 5000); // Give them more time to read details
            } else {
                setStatus('error');
                setMessage(data.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ');
                toast.error(data.message || 'Check-in failed');
            }
        } catch (error) {
            setStatus('error');
            setMessage('ไม่สามารถเชื่อมต่อระบบได้');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-6">
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800">ไม่พบรหัสการเช็คชื่อ</h2>
                        <p className="text-slate-500 mt-2">กรุณาสแกน QR Code ใหม่อีกครั้ง</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) return null; // Should redirect by useEffect

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-indigo-600">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="h-6 w-6 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">ยืนยันการเข้าเรียน</CardTitle>
                    <CardDescription>กดปุ่มด้านล่างเพื่อบันทึกเวลาเรียน</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">ผู้เรียน (Student)</p>
                        <p className="font-bold text-lg text-slate-800">{user?.displayName || user?.email}</p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-green-700 mb-2">เช็คชื่อสำเร็จ!</h3>
                            <p className="text-slate-500">{message}</p>

                            {warning && (
                                <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-xs border border-yellow-200 rounded-lg">
                                    <strong>Note:</strong> {warning}
                                </div>
                            )}

                            {quotaInfo && (
                                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Quota Update</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">ตัดโควต้า:</span>
                                        <span className={`font-bold ${quotaInfo.deducted ? 'text-green-600' : 'text-slate-400'}`}>
                                            {quotaInfo.deducted ? 'สำเร็จ (-1)' : 'ไม่ถูกตัด'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-sm text-slate-600">คงเหลือ:</span>
                                        <span className="font-bold text-indigo-700 text-lg">{quotaInfo.remaining ?? '-'}</span>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-slate-400 mt-6">กำลังกลับสู่หน้าหลัก...</p>
                        </div>
                    ) : status === 'error' ? (
                        <div className="text-center py-6">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-red-700 mb-2">เช็คชื่อไม่สำเร็จ</h3>
                            <p className="text-slate-500">{message}</p>
                            <Button variant="outline" onClick={() => setStatus('idle')} className="mt-4">
                                ลองใหม่อีกครั้ง
                            </Button>
                        </div>
                    ) : (
                        <Button
                            className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg transition-all active:scale-95"
                            onClick={handleCheckIn}
                            disabled={status === 'checking'}
                        >
                            {status === 'checking' ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                'มาเรียน (Present)'
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function CheckInPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <CheckInContent />
        </Suspense>
    );
}
