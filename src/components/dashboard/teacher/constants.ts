export const EDUCATION_LEVELS: Record<string, string> = {
    'kindergarten': 'อนุบาล',
    'k1': 'อนุบาล 1',
    'k2': 'อนุบาล 2',
    'k3': 'อนุบาล 3',
    'elementary': 'ประถมศึกษา',
    'p1': 'ประถมศึกษาปีที่ 1',
    'p2': 'ประถมศึกษาปีที่ 2',
    'p3': 'ประถมศึกษาปีที่ 3',
    'p4': 'ประถมศึกษาปีที่ 4',
    'p5': 'ประถมศึกษาปีที่ 5',
    'p6': 'ประถมศึกษาปีที่ 6',
    'junior_high': 'มัธยมศึกษาตอนต้น',
    'm1': 'มัธยมศึกษาปีที่ 1',
    'm2': 'มัธยมศึกษาปีที่ 2',
    'm3': 'มัธยมศึกษาปีที่ 3',
    'senior_high': 'มัธยมศึกษาตอนปลาย',
    'm4': 'มัธยมศึกษาปีที่ 4',
    'm5': 'มัธยมศึกษาปีที่ 5',
    'm6': 'มัธยมศึกษาปีที่ 6',
    'university': 'มหาวิทยาลัย',
    'other': 'อื่นๆ'
};

export const SKILL_STRUCTURE = [
    {
        category: 'ด้านองค์ความรู้ (Knowledge)',
        items: [
            { id: 'k_exercise', label: 'แบบฝึกหัด', max: 5 }
        ]
    },
    {
        category: 'ด้านการปฏิบัติ (Action/Skill)',
        items: [
            { id: 's_creative', label: 'ความคิดสร้างสรรค์ (Creative Thinking)', max: 5 },
            { id: 's_planning', label: 'วางแผนการทำงาน (Planning & Time Management)', max: 5 },
            { id: 's_problem_solving', label: 'การแก้ปัญหา (Problem Solving)', max: 5 },
            { id: 's_design_improve', label: 'ปรับปรุงการออกแบบ (Improve of Design)', max: 5 },
            { id: 's_programming', label: 'ทักษะการเขียนโปรแกรม (Programming)', max: 5 },
            { id: 's_emotional', label: 'ทักษะทางอารมณ์/สมาธิ/ความขยัน', max: 5 }
        ]
    }
];

export const COURSE_LEVELS = [
    { value: 'Basic', label: 'พื้นฐาน (Basic)' },
    { value: 'Intermediate', label: 'ระดับกลาง (Intermediate)' },
    { value: 'Advanced', label: 'ระดับสูง (Advanced)' }
];
