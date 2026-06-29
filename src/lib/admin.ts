/**
 * Utility functions for admin role checking
 */

/**
 * Core admin emails that are always allowed regardless of env var
 */
const CORE_ADMIN_EMAILS = [
    '67319010041@technicrayong.ac.th',
    'eq.science.course@gmail.com',
    'eq.science.online1@gmail.com',
];

/**
 * Get admin emails from environment variable + core list
 * Format: comma-separated string
 */
export function getAdminEmails(): string[] {
    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    if (!envEmails) return [...CORE_ADMIN_EMAILS];
    const parsedEmails = envEmails.split(',').map(email => email.trim());
    return [...new Set([...parsedEmails, ...CORE_ADMIN_EMAILS])];
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return getAdminEmails().includes(email);
}

/**
 * Check if user is admin based on email or role
 */
export function isAdmin(user: { email?: string | null; role?: string | null } | null): boolean {
    if (!user) return false;
    return isAdminEmail(user.email) || user.role === 'admin';
}

/**
 * Restricted admin emails - admins who cannot access the accounting system
 */
const RESTRICTED_ADMIN_EMAILS = ['eq.science.online1@gmail.com'];

/**
 * Check if user can access the accounting system
 */
export function canAccessAccounting(user: { email?: string | null } | null): boolean {
    if (!user) return false;
    return !RESTRICTED_ADMIN_EMAILS.includes(user.email || '');
}


