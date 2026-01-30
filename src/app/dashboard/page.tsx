'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            if (!loading && !user) {
                router.push('/login');
                return;
            }

            if (user) {
                try {
                    const token = await user.getIdToken();
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                        const profile = await response.json();
                        if (profile.role === 'admin') {
                            router.push('/dashboard/admin');
                        } else if (profile.role === 'teacher') {
                            router.push('/dashboard/teacher');
                        } else {
                            router.push('/dashboard/student');
                        }
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    router.push('/dashboard/student'); // Default to student
                } finally {
                    setIsChecking(false);
                }
            }
        };

        checkRole();
    }, [user, loading, router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-lg">กำลังตรวจสอบสิทธิ์...</div>
        </div>
    );
}
