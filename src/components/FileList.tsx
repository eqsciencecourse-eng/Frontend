'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface FileItem {
    id: number;
    name: string;
    url: string;
}

export function FileList({ files }: { files: FileItem[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>เอกสารและไฟล์งาน</CardTitle>
                <CardDescription>ดาวน์โหลดเอกสารที่ครูส่งมา</CardDescription>
            </CardHeader>
            <CardContent>
                {files.length > 0 ? (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium">{file.name}</span>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={file.url} download>
                                        <Download className="mr-2 h-4 w-4" />
                                        ดาวน์โหลด
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                        ยังไม่มีไฟล์
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
