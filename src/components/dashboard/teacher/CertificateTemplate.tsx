import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface CertificateTemplateProps {
    studentName: string;
    courseName: string;
    level: string;
    completionDate: string | Date;
    score: number;
    grade: string;
    schoolName?: string;
    directorName?: string;
}

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(({
    studentName,
    courseName,
    level,
    completionDate,
    score,
    grade,
    schoolName = 'EQSCI SCHOOLS',
    directorName = 'Director Signature'
}, ref) => {
    return (
        <div
            ref={ref}
            className="w-[1123px] h-[794px] bg-white relative overflow-hidden text-slate-900 font-serif"
            style={{ minWidth: '1123px', minHeight: '794px' }} // A4 Landscape roughly at 96 DPI, adjusted for ratio
        >
            {/* Professional Border */}
            <div className="absolute inset-4 border-4 border-double border-slate-800 pointer-events-none" />
            <div className="absolute inset-6 border border-slate-300 pointer-events-none" />

            {/* Corner Ornaments (CSS shapes for simplicity) */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-slate-800" />
            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-slate-800" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-slate-800" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-slate-800" />

            {/* Content Container */}
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10 px-20">

                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-widest text-slate-900 uppercase">Certificate</h1>
                    <p className="text-xl tracking-[0.3em] font-light text-slate-500 uppercase">of Completion</p>
                </div>

                <div className="w-24 h-px bg-slate-300 my-4" />

                {/* Presented To */}
                <div className="space-y-2">
                    <p className="text-lg italic text-slate-500 font-light">This certificate is proudly presented to</p>
                    <h2 className="text-6xl font-bold text-indigo-900 py-4 font-sans italic">{studentName}</h2>
                </div>

                {/* Achievement */}
                <div className="space-y-6 max-w-2xl mx-auto">
                    <p className="text-xl text-slate-600 leading-relaxed">
                        For successfully completing the requirements of the curriculum for
                    </p>

                    <div className="border-b-2 border-slate-800 pb-2 px-8 inline-block min-w-[400px]">
                        <h3 className="text-3xl font-bold text-slate-800 uppercase tracking-wide">
                            {courseName}
                        </h3>
                        <p className="text-lg text-slate-600 font-medium mt-1">Level: {level}</p>
                    </div>

                    <div className="flex justify-center gap-12 mt-4 text-slate-600">
                        <div className="text-center">
                            <span className="block text-sm uppercase tracking-wider text-slate-400">Final Grade</span>
                            <span className="text-2xl font-bold text-slate-800">{grade} ({score}%)</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-sm uppercase tracking-wider text-slate-400">Date</span>
                            <span className="text-2xl font-bold text-slate-800">
                                {format(new Date(completionDate), 'd MMMM yyyy')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer / Signatures */}
                <div className="absolute bottom-20 w-full px-32 flex justify-between items-end">
                    <div className="text-center">
                        <div className="w-48 border-b border-slate-400 mb-2 h-16 flex items-end justify-center">
                            <span className="font-dancing text-2xl text-slate-800">Eqsci</span>
                        </div>
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Eqsci Schools</p>
                    </div>

                    <div className="w-24 flex items-center justify-center opacity-20">
                        {/* Seal Placeholder */}
                        <div className="w-20 h-20 rounded-full border-4 border-slate-800"></div>
                    </div>

                    <div className="text-center">
                        <div className="w-48 border-b border-slate-400 mb-2 h-16 flex items-end justify-center">
                            <span className="font-dancing text-2xl text-slate-800">Director</span>
                        </div>
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{directorName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

CertificateTemplate.displayName = 'CertificateTemplate';

export default CertificateTemplate;
