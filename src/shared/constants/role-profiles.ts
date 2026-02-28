export const ROLE_PROFILES: Record<string, any> = {
    'SDE-I': {
        requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        milestoneTemplates: [
            { title: 'Frontend Basics', description: 'Learn React building blocks', requiredSkills: ['JavaScript', 'React'] },
            { title: 'Backend Basics', description: 'Learn Node.js basics', requiredSkills: ['Node.js'] }
        ]
    },
    'SDE-II': {
        requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'System Design', 'Docker', 'AWS'],
        milestoneTemplates: [
            { title: 'Advanced Frontend', description: 'Master React performance', requiredSkills: ['React', 'TypeScript'] },
            { title: 'Cloud Intrastructure', description: 'Learn deployment', requiredSkills: ['Docker', 'AWS'] },
            { title: 'Architecture', description: 'Design large systems', requiredSkills: ['System Design'] }
        ]
    }
};
