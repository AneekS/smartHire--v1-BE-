export interface ResumeInput {
    skills?: string[];
    experience?: { years: number };
    education?: { level: string };
    summary?: string;
    certifications?: string[];
    projects?: string[];
    publications?: string[];
    awards?: string[];
}

export interface JobInput {
    requiredSkills?: string[];
    preferredSkills?: string[];
    requiredExperienceYears: number;
    requiredEducationLevel: string;
    title?: string;
    description?: string;
}
