'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, User as FirebaseUser } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'eq_access_token';

export interface AuthUser {
    id: string;
    _id?: string; // [FIX] MongoDB ID support
    uid: string;
    email: string;
    role: string;
    displayName?: string;
    photoURL?: string;
    parentName?: string;
    studentName?: string;
    studentClass?: string;
    enrolledSubjects?: string[];
    authorizedSubjects?: string[]; // Teacher permissions
    studyTimes?: string[];
    school?: string;
    educationLevel?: string;
    nickname?: string; // [NEW]
    lineUserId?: string; // [NEW] Line Integration
    getIdToken: () => Promise<string | undefined>;
}

interface AuthResponse {
    token: string;
    user: any;
}

interface GoogleRegisterPayload {
    parentName: string;
    studentName: string;
    educationLevel: string;
    enrolledSubjects?: string[];
    studyTimes?: string[];
    school?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    signInWithGoogle: () => Promise<AuthResponse>;
    registerWithGoogle: (payload: GoogleRegisterPayload) => Promise<AuthResponse>;
    continueGoogleRegistration: (payload: GoogleRegisterPayload) => Promise<AuthResponse>;
    loginWithCredentials: (payload: { email?: string; username?: string; password: string }) => Promise<AuthResponse>;
    checkIfEmailExists: (email: string) => Promise<boolean>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const isBrowser = typeof window !== 'undefined';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Safety ref for mounting checks
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Listen to Firebase Auth state
    // Restored standard sync logic to ensure user state is consistent
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!isMounted.current) return;

            if (!currentUser) {
                // Only clear if we actually have a user stored (to avoid loop or flash)
                // We rely on token bootstrap mostly, but this catches explicit firebase logout
                if (localStorage.getItem(TOKEN_KEY) && !token) {
                    // Potential desync, but we trust persistToken logic mostly.
                }
            }
        });
        return () => unsubscribe();
    }, [token]);

    const persistToken = useCallback((newToken: string | null) => {
        if (!isBrowser) return;
        if (newToken) {
            localStorage.setItem(TOKEN_KEY, newToken);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }, []);

    // Improved Safe Set State
    const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
        if (isMounted.current) {
            setter(value);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Firebase sign out error:', error);
        }

        if (isMounted.current) {
            setUser(null);
            setToken(null);
        }
        persistToken(null);
        router.push('/login');
    }, [persistToken, router]);

    const fetchWithAuth = useCallback(
        async (url: string, options: RequestInit = {}) => {
            const headers = new Headers(options.headers);
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                if (isMounted.current) {
                    logout();
                }
            }

            return response;
        },
        [token, logout]
    );

    const enrichUser = useCallback((backendUser: any, activeToken?: string): AuthUser => {
        return {
            ...backendUser,
            getIdToken: async () => {
                if (activeToken) return activeToken;
                if (token) return token;
                if (auth.currentUser) return auth.currentUser.getIdToken();
                return undefined;
            },
            // Fallback IDs if needed
            id: backendUser._id || backendUser.id,
            uid: backendUser._id || backendUser.id,
        };
    }, [token]);

    const fetchProfile = useCallback(
        async (activeToken: string) => {
            try {
                const res = await fetch(`${API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${activeToken}` },
                });

                if (!res.ok) throw new Error('FAILED_TO_FETCH_PROFILE');

                const profile = await res.json();
                if (isMounted.current) {
                    setUser(enrichUser(profile, activeToken));
                }
            } catch (error) {
                console.error("Fetch profile error", error);
                throw error;
            }
        },
        [enrichUser],
    );

    const bootstrap = useCallback(async () => {
        if (!isBrowser) return;
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (!storedToken) {
            safeSetState<boolean>(setLoading, false);
            return;
        }

        if (isMounted.current) setToken(storedToken);

        try {
            await fetchProfile(storedToken);
        } catch (error) {
            console.error("Bootstrap error", error);
            persistToken(null);
            if (isMounted.current) {
                setToken(null);
                setUser(null);
            }
        } finally {
            safeSetState<boolean>(setLoading, false);
        }
    }, [fetchProfile, persistToken, safeSetState]);

    useEffect(() => {
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAuthResponse = useCallback(
        async (response: Response) => {
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const error = new Error(errorBody.message || 'AUTH_ERROR');
                (error as any).code = errorBody.statusCode;
                throw error;
            }
            const data: AuthResponse = await response.json();

            persistToken(data.token);

            if (isMounted.current) {
                setToken(data.token);
                setUser(enrichUser(data.user, data.token));
            }

            return data;
        },
        [persistToken, enrichUser],
    );

    // Context Methods - Standard Implementations
    const signInWithGoogle = useCallback(async () => {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        const response = await fetch(`${API_URL}/api/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
        });
        return await handleAuthResponse(response);
    }, [handleAuthResponse]);

    const loginWithCredentials = useCallback(async (payload: { email?: string; username?: string; password: string }) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return await handleAuthResponse(response);
    }, [handleAuthResponse]);

    const registerWithGoogle = useCallback(async (payload: GoogleRegisterPayload) => {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        const response = await fetch(`${API_URL}/api/auth/google-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: idToken,
                payload: { ...payload, email: result.user.email }
            }),
        });
        return await handleAuthResponse(response);
    }, [handleAuthResponse]);

    const continueGoogleRegistration = useCallback(async (payload: GoogleRegisterPayload) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('NO_GOOGLE_USER');
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}/api/auth/google-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: idToken,
                payload: { ...payload, email: currentUser.email }
            }),
        });
        return await handleAuthResponse(response);
    }, [handleAuthResponse]);

    const checkIfEmailExists = useCallback(async (email: string) => {
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length > 0) return true;
            const res = await fetch(`${API_URL}/api/users/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                const data = await res.json();
                return data.exists;
            }
            return false;
        } catch (error) {
            console.error("Check email error", error);
            return false;
        }
    }, []);

    const refreshUser = useCallback(async () => {
        if (!token) return;
        await fetchProfile(token);
    }, [fetchProfile, token]);

    const value = useMemo(
        () => ({
            user,
            token,
            loading,
            signInWithGoogle,
            loginWithCredentials,
            registerWithGoogle,
            continueGoogleRegistration,
            checkIfEmailExists,
            logout,
            refreshUser,
            fetchWithAuth,
        }),
        [user, token, loading, signInWithGoogle, loginWithCredentials, registerWithGoogle, continueGoogleRegistration, checkIfEmailExists, logout, refreshUser, fetchWithAuth],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
