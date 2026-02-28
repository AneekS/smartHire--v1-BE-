import { prisma } from '../../config/database';
import { ROLE_PROFILES } from '../../shared/constants/role-profiles';
import { SKILL_TAXONOMY } from '../../shared/constants/skill-taxonomy';

async function getProfileWithSkills(candidateId: string) {
    const profile = await prisma.candidateProfile.findUnique({
        where: { userId: candidateId, isDeleted: false },
        include: { skills: { include: { skill: true } } }
    });
    if (!profile) throw new Error('Profile not found');
    return profile;
}

export async function getCareerPath(candidateId: string, targetRole = 'SDE-II') {
    const profile = await getProfileWithSkills(candidateId);
    const target = ROLE_PROFILES[targetRole] ?? ROLE_PROFILES['SDE-I'];
    const candidateSkills = new Set(profile.skills.map(s => s.skill.name));

    const milestones = target.milestoneTemplates.map((m: any, i: number) => ({
        order: i + 1,
        title: m.title,
        description: m.description,
        completed: m.requiredSkills.every((s: string) => candidateSkills.has(s))
    }));
    return { targetRole, milestones };
}

export async function getGapAnalysis(candidateId: string, roleProfile = 'SDE-I') {
    const profile = await getProfileWithSkills(candidateId);
    const candidateSkills = profile.skills.map(s => s.skill.name);
    const targetSkills = ROLE_PROFILES[roleProfile]?.requiredSkills ?? [];
    const gaps = targetSkills.filter((s: string) => !candidateSkills.includes(s));

    const recommendations = gaps.map((g: string) => ({
        skill: g, resources: SKILL_TAXONOMY[g]?.resources ?? []
    }));

    return { candidateSkills, roleProfile, gaps, recommendations };
}
