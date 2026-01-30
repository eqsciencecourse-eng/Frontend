'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Upload, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';

export default function InvoiceTable() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(API_ENDPOINTS.ACCOUNTING.BASE, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const loadingToast = toast.loading('Uploading Excel...');
        try {
            const token = await user?.getIdToken();
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_ENDPOINTS.ACCOUNTING.BASE}/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Imported ${data.count} invoices successfully`, { id: loadingToast });
                fetchInvoices();
            } else {
                const err = await res.json();
                throw new Error(err.message || 'Import failed');
            }
        } catch (error: any) {
            console.error('Import error:', error);
            toast.error(error.message || 'Failed to import Excel', { id: loadingToast });
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">ใบเสร็จนักเรียน</h2>

            {/* Filters (Mock UI for now as per Image 1) */}
            <div className="flex gap-2 justify-center mb-6">
                <select className="border rounded-none px-3 py-2 text-sm"><option>เลือกวันที่ชำระเงิน</option></select>
                <select className="border rounded-none px-3 py-2 text-sm"><option>เลือกเดือนที่ชำระเงิน</option></select>
                <select className="border rounded-none px-3 py-2 text-sm"><option>เลือกปี</option></select>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-none h-[38px]">ตกลง</Button>

                <div className="w-px bg-slate-300 mx-2"></div>

                <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <Button
                    onClick={handleImportClick}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none h-[38px] gap-2"
                >
                    <FileSpreadsheet className="w-4 h-4" /> Import Excel
                </Button>
            </div>

            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                            <th className="px-4 py-3 text-center">ใบเสร็จ<br />นักเรียน</th>
                            <th className="px-4 py-3">ชื่อ-สกุล<br />นักเรียน</th>
                            <th className="px-4 py-3 text-center">ชำระ<br />เงินวันที่</th>
                            <th className="px-4 py-3 text-right">จำนวน<br />เงิน</th>
                            <th className="px-4 py-3">คอร์ส</th>
                            <th className="px-4 py-3 text-center">วันที่เริ่ม<br />เรียน</th>
                            <th className="px-4 py-3 text-center">วันสิ้นสุด<br />ชำระค่า<br />เรียน</th>
                            <th className="px-4 py-3 text-center">เวลา<br />ชำระ<br />เงิน</th>
                            <th className="px-4 py-3 text-center">สลิป</th>
                            <th className="px-4 py-3 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : invoices.map((inv, index) => (
                            <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-center font-medium">{index + 1}</td>
                                <td className="px-4 py-3">{inv.customerName}</td>
                                <td className="px-4 py-3 text-center">
                                    {inv.paymentDate ? format(new Date(inv.paymentDate), 'dd-MM-yyyy') : '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 truncate max-w-[150px]">{inv.classLevel}</td>
                                <td className="px-4 py-3 text-center">
                                    {inv.periodStart ? format(new Date(inv.periodStart), 'dd-MM-yyyy') : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {inv.periodEnd ? format(new Date(inv.periodEnd), 'dd-MM-yyyy') : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">{inv.paymentTime}</td>
                                <td className="px-4 py-3 text-center">
                                    {inv.slipUrl && (
                                        <button className="text-blue-500 hover:underline text-xs" onClick={() => window.open(inv.slipUrl, '_blank')}>
                                            ดูสลิป
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col gap-1 items-center">
                                        <Button size="sm" className="h-7 w-24 bg-teal-500 hover:bg-teal-600 text-white rounded-none text-xs">
                                            <Eye className="w-3 h-3 mr-1" /> View PDF
                                        </Button>
                                        <Button size="sm" className="h-7 w-24 bg-red-500 hover:bg-red-600 text-white rounded-none text-xs">
                                            <Download className="w-3 h-3 mr-1" /> Download
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
