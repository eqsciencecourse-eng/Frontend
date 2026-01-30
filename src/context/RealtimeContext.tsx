'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

interface RealtimeContextType {
    notifications: any[];
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

    // Strict Mounted Ref
    const isMounted = useRef(false);
    // Track listener refs to ensure we can turn them off
    const listenersRef = useRef<{ connected?: any; notifications?: any }>({});

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Cleanup on unmount
            if (listenersRef.current.connected) off(listenersRef.current.connected);
            if (listenersRef.current.notifications) off(listenersRef.current.notifications);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            if (isMounted.current) {
                setNotifications([]);
                setIsConnected(false);
            }
            return;
        }

        // 1. Connection Listener
        const connectedRef = ref(db, '.info/connected');

        const onConnectedChange = (snap: any) => {
            if (!isMounted.current) return;
            const val = !!snap.val();
            // DECOUPLE: Use setTimeout to break the synchronous call stack from Firebase
            setTimeout(() => {
                if (isMounted.current) setIsConnected(val);
            }, 0);
        };
        const unsubConnected = onValue(connectedRef, onConnectedChange);

        // 2. Notifications Listener
        let notificationRef: any;
        if (user?.role === 'admin') {
            notificationRef = ref(db, 'notifications/admin');
        } else {
            notificationRef = ref(db, `notifications/users/${user.id}`);
        }

        const onNotificationChange = (snapshot: any) => {
            if (!isMounted.current) return;
            const data = snapshot.val();

            // DECOUPLE: Use setTimeout to ensure this runs in the next tick
            // preventing interference with current React render/commit phase
            setTimeout(() => {
                if (!isMounted.current) return;

                if (data) {
                    const list = Object.entries(data).map(([key, value]: [string, any]) => ({
                        id: key,
                        ...value,
                    }));
                    list.sort((a, b) => b.timestamp - a.timestamp);
                    setNotifications(list);
                } else {
                    setNotifications([]);
                }
            }, 0);
        };
        const unsubNotifications = onValue(notificationRef, onNotificationChange);

        return () => {
            unsubConnected();
            unsubNotifications();
        };
    }, [user]);

    return (
        <RealtimeContext.Provider value={{ notifications, isConnected }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
}
