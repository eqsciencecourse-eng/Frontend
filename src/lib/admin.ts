/**
 * Utility functions for admin role checking
 */

/**
 * Get admin emails from environment variable
 * Format: comma-separated string
 */
export function getAdminEmails(): string[] {
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '67319010041@technicrayong.ac.th,eq.science.course@gmail.com';
    return adminEmails.split(',').map(email => email.trim());
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




