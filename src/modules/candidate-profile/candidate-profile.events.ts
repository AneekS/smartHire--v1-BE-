export const PROFILE_EVENTS = {
    PROFILE_CREATED: 'candidate.profile.created',
    PROFILE_UPDATED: 'candidate.profile.updated',
    PROFILE_DELETED: 'candidate.profile.deleted',
    SKILLS_UPDATED: 'candidate.profile.skills_updated',
    RESUME_PARSED: 'candidate.profile.resume_parsed',
    RESUME_CONFIRMED: 'candidate.profile.resume_confirmed',
    GDPR_DELETION_QUEUED: 'candidate.profile.gdpr_deletion_queued',
    PRIVACY_CHANGED: 'candidate.profile.privacy_changed',
} as const;

export type ProfileEventPayload = {
    eventType: string;
    profileId: string;
    userId: string;
    timestamp: string;
    correlationId: string;
    payload: Record<string, any>;
};
