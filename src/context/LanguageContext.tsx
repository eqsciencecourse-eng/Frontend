'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    en: {
        'admin.title': 'Admin System',
        'admin.overview': 'Overview',
        'admin.users': 'Users',
        'admin.files': 'Files',
        'admin.settings': 'Settings',
        'admin.total_students': 'Total Students',
        'admin.total_teachers': 'Total Teachers',
        'admin.pending_teachers': 'Pending Approval',
        'admin.active_teachers': 'Active Teachers',
        'admin.teaching_now': 'Teaching Now',
        'admin.start_time': 'Start',
        'admin.no_active_teaching': 'No active classes',
        'admin.teacher_requests': 'Teacher Requests',
        'admin.approve': 'Approve',
        'admin.reject': 'Reject',
        'admin.all_users': 'All Users',
        'admin.search_placeholder': 'Search users...',
        'admin.file_manager': 'File Manager',
        'admin.file_desc': 'Manage folders and send files to students',
        'admin.create_folder': 'Create Folder',
        'admin.upload_file': 'Upload File',
        'admin.select_recipient': 'Select Recipient',
        'admin.select_file': 'Select File',
        'admin.upload': 'Upload',
        'admin.uploading': 'Uploading...',
        'admin.system_settings': 'System Settings',
        'admin.dark_mode': 'Dark Mode',
        'admin.dark_mode_desc': 'Toggle application theme',
        'admin.enable': 'Enable',
        'admin.disable': 'Disable',
        'admin.language': 'Language',
        'admin.language_desc': 'Select display language',

        // Student Dashboard
        'student.overview': 'Overview',
        'student.class_details': 'Class Schedule',
        'student.files': 'Documents',
        'student.settings': 'Settings',
        'student.score': 'Scores',
        'student.total_score': 'Total Score',
        'student.evaluation': 'Evaluation',
        'student.latest_time': 'Latest',
        'student.click_to_view': 'Click to view details',
        'student.analysis': 'Skill Analysis',
        'student.analysis_desc': 'Your learning skill summary',
        'student.no_files': 'No documents available',
        'student.profile_settings': 'Profile Settings',
        'student.profile_desc': 'Manage your profile',
        'student.profile_pic': 'Profile Picture',
        'student.contact_admin_change': 'Contact instructor to change profile picture',
        'student.contact_admin': 'Contact Admin',
        'student.notifications': 'Notifications',

        // Class Registration
        'class.title': 'Your Schedule',
        'class.desc': 'Registered courses and times',
        'class.add': 'Register New Class',
        'class.no_classes': 'No registered classes',
        'class.edit_time': 'Edit Time',
        'class.time_label': 'Class Time',
        'class.time_placeholder': 'Specify class time',
        'class.register_title': 'Register Class',
        'class.register_desc': 'Select course to register',
        'class.search_placeholder': 'Search courses...',
        'class.not_found': 'Course not found',
        'class.register_btn': 'Select',
        'class.select_time_title': 'Select Time',
        'class.select_time_desc': 'Select convenient time',
        'class.confirm_register': 'Confirm Registration',

        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.loading': 'Loading...',
        'common.success': 'Success',
        'common.error': 'Error',
        'logout': 'Logout',
    },
    th: {

        'admin.title': 'ระบบผู้ดูแลระบบ',
        'admin.overview': 'ภาพรวม',
        'admin.users': 'ผู้ใช้งาน',
        'admin.files': 'จัดการไฟล์',
        'admin.settings': 'ตั้งค่า',
        'admin.total_students': 'นักเรียนทั้งหมด',
        'admin.total_teachers': 'ครูทั้งหมด',
        'admin.pending_teachers': 'รออนุมัติ',
        'admin.active_teachers': 'ครูที่กำลังสอนอยู่',
        'admin.teaching_now': 'กำลังสอน',
        'admin.start_time': 'เริ่ม',
        'admin.no_active_teaching': 'ไม่มีการสอนในขณะนี้',
        'admin.teacher_requests': 'คำขอสมัครเป็นครู',
        'admin.approve': 'อนุมัติ',
        'admin.reject': 'ปฏิเสธ',
        'admin.all_users': 'ผู้ใช้งานทั้งหมด',
        'admin.search_placeholder': 'ค้นหาผู้ใช้...',
        'admin.file_manager': 'จัดการไฟล์',
        'admin.file_desc': 'จัดการโฟลเดอร์และส่งไฟล์ให้นักเรียน',
        'admin.create_folder': 'สร้างโฟลเดอร์',
        'admin.upload_file': 'อัปโหลดไฟล์ให้ผู้ใช้',
        'admin.select_recipient': 'เลือกผู้รับ',
        'admin.select_file': 'เลือกไฟล์',
        'admin.upload': 'อัปโหลด',
        'admin.uploading': 'กำลังส่ง...',
        'admin.system_settings': 'ตั้งค่าระบบ',
        'admin.dark_mode': 'โหมดมืด',
        'admin.dark_mode_desc': 'ปรับเปลี่ยนธีมของแอปพลิเคชัน',
        'admin.enable': 'เปิดใช้งาน',
        'admin.disable': 'ปิดใช้งาน',
        'admin.language': 'ภาษา',
        'admin.language_desc': 'เลือกภาษาที่ต้องการแสดงผล',

        // Student Dashboard
        'student.overview': 'ภาพรวม',
        'student.class_details': 'ตารางเรียน',
        'student.files': 'เอกสาร',
        'student.settings': 'ตั้งค่า',
        'student.score': 'คะแนน',
        'student.total_score': 'คะแนนสะสม',
        'student.evaluation': 'การประเมินผล',
        'student.latest_time': 'ล่าสุด',
        'student.click_to_view': 'คลิกเพื่อดูรายละเอียด',
        'student.analysis': 'วิเคราะห์ทักษะ',
        'student.analysis_desc': 'กราฟสรุปทักษะการเรียนรู้ของคุณ',
        'student.no_files': 'ยังไม่มีเอกสารในขณะนี้',
        'student.profile_settings': 'ข้อมูลส่วนตัว',
        'student.profile_desc': 'จัดการข้อมูลของคุณ',
        'student.profile_pic': 'รูปโปรไฟล์',
        'student.contact_admin_change': 'หากต้องการเปลี่ยนรูปโปรไฟล์ กรุณาติดต่อครูผู้สอน',
        'student.contact_admin': 'ติดต่อผู้ดูแล',
        'student.notifications': 'การแจ้งเตือน',

        // Class Registration
        'class.title': 'ตารางเรียนของคุณ',
        'class.desc': 'รายวิชาและเวลาเรียนที่คุณลงทะเบียน',
        'class.add': 'ลงทะเบียนเรียนเพิ่ม',
        'class.no_classes': 'ยังไม่ได้ลงทะเบียนรายวิชา',
        'class.edit_time': 'แก้ไขเวลาเรียน',
        'class.time_label': 'เวลาเรียน',
        'class.time_placeholder': 'ระบุเวลาเรียน',
        'class.register_title': 'ลงทะเบียนเรียน',
        'class.register_desc': 'เลือกรายวิชาที่ต้องการลงทะเบียน',
        'class.search_placeholder': 'ค้นหารายวิชา...',
        'class.not_found': 'ไม่พบรายวิชา',
        'class.register_btn': 'เลือก',
        'class.select_time_title': 'เลือกเวลาเรียน',
        'class.select_time_desc': 'เลือกช่วงเวลาที่คุณสะดวก',
        'class.confirm_register': 'ยืนยันการลงทะเบียน',

        // Common
        'common.save': 'บันทึก',
        'common.cancel': 'ยกเลิก',
        'common.loading': 'กำลังโหลด...',
        'common.success': 'ทำรายการสำเร็จ',
        'common.error': 'เกิดข้อผิดพลาด',
        'logout': 'ออกจากระบบ',
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('th');

    const t = (key: string) => {
        return translations[language][key as keyof typeof translations['th']] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
