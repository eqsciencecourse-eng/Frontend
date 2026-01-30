'use client';

import React from 'react';
import dynamic from 'next/dynamic';



interface PDFReportViewProps {
    user: any;
    data: any;
    stats: any;
    subjectName?: string;
}

export default function PDFReportView({ user, data, stats, subjectName = "Comprehensive Skill Report" }: PDFReportViewProps) {
    // Current Date (Thai)
    const currentDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Score Calculations
    const skills = data?.skills || {};
    const skillKeys = Object.keys(skills);

    // Calculate Total Percentage based on "Standardized Formula" (Average of skills for now)
    const totalSkillScore = skillKeys.reduce((acc, key) => acc + (skills[key] || 0), 0);
    const maxPossibleScore = skillKeys.length * 100;
    const percentage = maxPossibleScore > 0 ? (totalSkillScore / maxPossibleScore) * 100 : 0;

    return (
        <div id="pdf-report" className="w-[210mm] min-h-[297mm] bg-white p-8 flex flex-col justify-between" style={{ position: 'fixed', left: '-9999px', top: 0 }}>
            <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b-2 border-slate-800 pb-2">
                    <img src="/logo.png" alt="EQ.Science Logo" className="h-16 w-auto" />
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-slate-900">{subjectName} Analysis</h1>
                        <p className="text-sm text-slate-600">Rayong EQ.Science Learning Center</p>
                    </div>
                </div>

                {/* Section 1: User Info */}
                <div className="mb-5 grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                        <p className="text-xs text-slate-500">ชื่อผู้เรียน</p>
                        <p className="text-base font-bold text-slate-800">{user?.displayName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">วันที่ประเมินล่าสุด</p>
                        <p className="text-base font-bold text-slate-800">{currentDate}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">ระดับชั้น</p>
                        <p className="text-base font-bold text-slate-800">{user?.grade || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">จำนวนครั้งที่ประเมิน</p>
                        <p className="text-base font-bold text-slate-800">{stats.gradesCount} ครั้ง</p>
                    </div>
                </div>

                {/* Section 3: Graph */}


                {/* Section 4: Score Table */}
                <div className="mb-5">
                    <h3 className="text-sm font-bold bg-orange-500 text-white px-3 py-1 rounded-md mb-2 inline-block">
                        Score Summary
                    </h3>
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-left">
                                <th className="p-2 font-bold text-slate-700">ทักษะ (Skill)</th>
                                <th className="p-2 font-bold text-slate-700 text-right">คะแนน (Score)</th>
                                <th className="p-2 font-bold text-slate-700 text-right">เต็ม (Full)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {skillKeys.map((key) => (
                                <tr key={key} className="border-b border-slate-100">
                                    <td className="p-2 text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                                    <td className="p-2 text-slate-800 font-bold text-right">{skills[key]}</td>
                                    <td className="p-2 text-slate-400 text-right">100</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 font-bold">
                                <td className="p-2 text-slate-800">Total Average</td>
                                <td className="p-2 text-indigo-600 text-right">{percentage.toFixed(1)}%</td>
                                <td className="p-2 text-right"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Section 5: Summary */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                    <p className="text-indigo-800 text-base font-medium">สรุปผลการประเมินรวม</p>
                    <div className="text-4xl font-bold text-indigo-600 my-1">{percentage.toFixed(1)}%</div>
                    <p className="text-xs text-indigo-400">Based on Standardized Calculation Formula</p>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 mt-8 flex justify-between items-end text-xs text-slate-400">
                <div>
                    <p>Rayong EQ.Science Learning Center System</p>
                    <p>Generated on {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p>© {new Date().getFullYear()} All Rights Reserved</p>
                </div>
            </div>
        </div>
    );
}
