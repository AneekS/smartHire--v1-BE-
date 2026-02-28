-- GIN index for pg_trgm skill name search
CREATE INDEX CONCURRENTLY idx_skills_name_trgm ON skills USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_profiles_active ON candidate_profiles (user_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY idx_candidate_skills_composite ON candidate_skills (profile_id, skill_id, proficiency);
CREATE INDEX CONCURRENTLY idx_candidate_skills_skill_prof ON candidate_skills (skill_id, proficiency) WHERE is_verified = false;
CREATE INDEX idx_audit_logs_brin ON profile_audit_logs USING BRIN (created_at);
CREATE INDEX CONCURRENTLY idx_profiles_completeness ON candidate_profiles (completeness_score DESC, location_country) WHERE is_deleted = false;
