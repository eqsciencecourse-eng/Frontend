
'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportsView() {
    return (
        <div className="max-w-2xl mx-auto mt-10">
            <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
                <h2 className="text-xl font-medium text-slate-800 mb-6">Select Date</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Select Month:</label>
                        <Select>
                            <SelectTrigger className="bg-white border-slate-300 rounded-none">
                                <SelectValue placeholder="เลือกเดือน" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="01">มกราคม</SelectItem>
                                <SelectItem value="02">กุมภาพันธ์</SelectItem>
                                {/* Add more months */}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Select Day:</label>
                        <Select>
                            <SelectTrigger className="bg-white border-slate-300 rounded-none">
                                <SelectValue placeholder="เลือกวัน" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="01">1</SelectItem>
                                <SelectItem value="02">2</SelectItem>
                                {/* Add more days */}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none h-10">
                            ตกลง
                        </Button>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none h-10">
                            Export to Excel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
