const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:4000' : '');
const API_PREFIX = '/api';

export const API_ENDPOINTS = {
    BASE: `${API_BASE}${API_PREFIX}`,

    // Auth
    AUTH: {
        ME: `${API_BASE}${API_PREFIX}/auth/me`,
        GOOGLE_LOGIN: `${API_BASE}${API_PREFIX}/auth/google-login`,
        GOOGLE_REGISTER: `${API_BASE}${API_PREFIX}/auth/google-register`,
        LOGIN: `${API_BASE}${API_PREFIX}/auth/login`,
        REGISTER: `${API_BASE}${API_PREFIX}/auth/register`,
    },

    // Users
    USERS: {
        PROFILE: `${API_BASE}${API_PREFIX}/users/profile`,
        UPDATE_PROFILE: `${API_BASE}${API_PREFIX}/users/update-profile`,
        CHECK_EMAIL: `${API_BASE}${API_PREFIX}/users/check-email`,
        STUDENTS: `${API_BASE}${API_PREFIX}/users/students`,
        PENDING_TEACHERS: `${API_BASE}${API_PREFIX}/users/pending-teachers`,
        SCHEDULE: `${API_BASE}${API_PREFIX}/users/schedule`,
        LIST: `${API_BASE}${API_PREFIX}/users`,
        UPDATE: (id: string) => `${API_BASE}${API_PREFIX}/users/${id}`,
        UPDATE_COURSE_LEVEL: (id: string) => `${API_BASE}${API_PREFIX}/users/${id}/course-level`,
        BATCH_ATTENDANCE: `${API_BASE}${API_PREFIX}/users/batch-attendance`, // [NEW]
    },

    // Line Integration
    LINE: {
        CONNECT: `${API_BASE}${API_PREFIX}/line/connect`,
        TEST_NOTIFY: `${API_BASE}${API_PREFIX}/line/test-notify`,
    },

    // Admin
    ADMIN: {
        USERS: `${API_BASE}${API_PREFIX}/admin/users`,
        PENDING_TEACHERS: `${API_BASE}${API_PREFIX}/admin/pending-teachers`,
        STATS: `${API_BASE}${API_PREFIX}/admin/stats`,
        APPROVE_TEACHER: (token: string) => `${API_BASE}${API_PREFIX}/admin/approve-teacher/${token}`,
        DELETE_USER: (id: string) => `${API_BASE}${API_PREFIX}/admin/users/${id}`,
        CREATE_TEACHER: `${API_BASE}${API_PREFIX}/admin/create-teacher`,
        REGISTRY_LIST: `${API_BASE}${API_PREFIX}/users/registry`,
        IMPORT_REGISTRY: `${API_BASE}${API_PREFIX}/users/registry/import`,
        EXCEL_FILES: `${API_BASE}${API_PREFIX}/users/registry/excel-files`,
        IMPORT_FROM_SERVER: `${API_BASE}${API_PREFIX}/users/registry/import-from-server`,
    },

    // [NEW] Continuous Evaluation
    EVALUATIONS: {
        CREATE: `${API_BASE}${API_PREFIX}/evaluations`,
        UPDATE: (id: string) => `${API_BASE}${API_PREFIX}/evaluations/${id}`,
        DELETE: (id: string) => `${API_BASE}${API_PREFIX}/evaluations/${id}`,
        GET_STUDENT_SUMMARY: (id: string) => `${API_BASE}${API_PREFIX}/evaluations/student/${id}/summary`,
        GET_STUDENT_HISTORY: (id: string) => `${API_BASE}${API_PREFIX}/evaluations/student/${id}/history`,
    },

    // Courses
    COURSES: {
        LIST: `${API_BASE}${API_PREFIX}/courses`,
        CREATE: `${API_BASE}${API_PREFIX}/courses`,
        MY_COURSES: `${API_BASE}${API_PREFIX}/courses/my-courses`,
        BY_ID: (id: string) => `${API_BASE}${API_PREFIX}/courses/${id}`,
    },

    // Classes
    CLASSES: {
        LIST: `${API_BASE}${API_PREFIX}/classes`,
        REQUESTS: `${API_BASE}${API_PREFIX}/classes/requests`,
        PENDING_REQUESTS: `${API_BASE}${API_PREFIX}/classes/requests/pending`,
        APPROVE_REQUEST: (id: string) => `${API_BASE}${API_PREFIX}/classes/requests/${id}/approve`,
        REJECT_REQUEST: (id: string) => `${API_BASE}${API_PREFIX}/classes/requests/${id}/reject`,
        BY_ID: (id: string) => `${API_BASE}${API_PREFIX}/classes/${id}`,
    },

    // Subjects
    SUBJECTS: {
        LIST: `${API_BASE}${API_PREFIX}/subjects`,
    },

    // Grades
    GRADES: {
        BASE: `${API_BASE}${API_PREFIX}/grades`,
        CREATE: `${API_BASE}${API_PREFIX}/grades`,
        STUDENT: (id: string) => `${API_BASE}${API_PREFIX}/grades/student/${id}`,
        MY_GRADES: `${API_BASE}${API_PREFIX}/grades/my-grades`,
        SUMMARY: `${API_BASE}${API_PREFIX}/grades/summary/me`,
        ADD_SCORE: `${API_BASE}${API_PREFIX}/grades/add-score`,
        UPDATE_SKILL_HISTORY: `${API_BASE}${API_PREFIX}/grades/update-skill-history`,
        UPDATE_LEVEL: `${API_BASE}${API_PREFIX}/grades/update-level`, // [NEW]
        UPDATE_EVALUATION: `${API_BASE}${API_PREFIX}/grades/update-evaluation`,
        FINALIZE_LEVEL: `${API_BASE}${API_PREFIX}/grades/finalize-level`,
        BATCH_SHEET: `${API_BASE}${API_PREFIX}/grades/batch-sheet`, // [NEW]
    },

    // Files
    FILES: {
        BULK_SEND: `${API_BASE}${API_PREFIX}/files/bulk-send`,
        SENT: (uid: string) => `${API_BASE}${API_PREFIX}/files/sent/${uid}`,
        USER: (uid: string) => `${API_BASE}${API_PREFIX}/files/user/${uid}`,
        BY_ID: (id: string) => `${API_BASE}${API_PREFIX}/files/${id}`,
    },

    // Schedules
    SCHEDULES: {
        BY_UID: (uid: string) => `${API_BASE}${API_PREFIX}/schedules/${uid}`,
        BULK: `${API_BASE}${API_PREFIX}/schedules/bulk`,
        NOTIFY: (uid: string, day: string) => `${API_BASE}${API_PREFIX}/schedules/notify/${uid}/${day}`,
    },

    // Schools
    SCHOOLS: {
        SEARCH: (query: string) => `${API_BASE}${API_PREFIX}/schools?q=${encodeURIComponent(query)}`,
    },

    // Attendance
    ATTENDANCE: {
        CREATE: `${API_BASE}${API_PREFIX}/attendance`,
        TEACHER_LIST: `${API_BASE}${API_PREFIX}/attendance/teacher`,
        MY_HISTORY: `${API_BASE}${API_PREFIX}/attendance/my-history`, // [NEW]
        CHECK: (subjectId: string, date: string) => `${API_BASE}${API_PREFIX}/attendance/check?subjectId=${subjectId}&date=${date}`,
        ALL: `${API_BASE}${API_PREFIX}/attendance/all`,
        GENERATE_QR: `${API_BASE}${API_PREFIX}/attendance/qr/generate`,
        QR_CHECK_IN: `${API_BASE}${API_PREFIX}/attendance/qr/check-in`,
        UPDATE: (id: string) => `${API_BASE}${API_PREFIX}/attendance/${id}`,
        DELETE: (id: string) => `${API_BASE}${API_PREFIX}/attendance/${id}`,
    },

    // Reports
    REPORTS: {
        USER: `${API_BASE}${API_PREFIX}/reports/user`,
    },

    // Accounting
    ACCOUNTING: {
        BASE: `${API_BASE}${API_PREFIX}/accounting`,
        CREATE: `${API_BASE}${API_PREFIX}/accounting`,
        UPDATE: (id: string) => `${API_BASE}${API_PREFIX}/accounting/${id}`,
        DELETE: (id: string) => `${API_BASE}${API_PREFIX}/accounting/${id}`,
    },
};

// Helper function for dynamic paths
export const buildApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE}${API_PREFIX}${normalizedPath}`;
};

// Export for backward compatibility (will be removed after refactoring)
export const API_URL = API_BASE;
