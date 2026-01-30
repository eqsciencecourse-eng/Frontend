'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File as FileIcon, Image as ImageIcon, Film, Music, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    maxSize?: number; // in bytes
    accept?: Record<string, string[]>;
}

export default function FileUploader({
    onFilesSelected,
    files = [], // Receive files from parent
    maxFiles = 10,
    maxSize = 50 * 1024 * 1024, // 50MB default (New Limit)
    accept
}: FileUploaderProps & { files?: File[] }) { // Extend props
    // internal state removed

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // combine current files (from props) with new files
        const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
        onFilesSelected(newFiles);
    }, [files, maxFiles, onFilesSelected]);

    const removeFile = (fileToRemove: File) => {
        const newFiles = files.filter(f => f !== fileToRemove);
        onFilesSelected(newFiles);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept
    });

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-purple-500" />;
        if (file.type.startsWith('video/')) return <Film className="h-8 w-8 text-pink-500" />;
        if (file.type.startsWith('audio/')) return <Music className="h-8 w-8 text-yellow-500" />;
        return <FileIcon className="h-8 w-8 text-blue-500" />;
    };

    return (
        <div className="w-full space-y-4">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-all duration-200",
                    isDragActive
                        ? "border-emerald-500 bg-emerald-50/50 scale-[1.01]"
                        : "border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                        "h-16 w-16 rounded-none flex items-center justify-center transition-colors",
                        isDragActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <Upload className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-slate-700">
                            {isDragActive ? "Drop files here..." : "Click or drag files to upload"}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            PDF, DOCX, JPG, ZIP up to {maxSize / 1024 / 1024}MB
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                        {files.map((file, idx) => (
                            <motion.div
                                key={`${file.name}-${idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-none shadow-sm group"
                            >
                                <div className="h-12 w-12 bg-slate-50 rounded-none flex items-center justify-center flex-shrink-0">
                                    {getFileIcon(file)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-700 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-400">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(file); }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-none transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
