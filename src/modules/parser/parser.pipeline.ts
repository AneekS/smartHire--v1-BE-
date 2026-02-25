import { prisma } from '../../infrastructure/db/prisma.client';
import { redis } from '../../infrastructure/redis/redis.client';
import { downloadFromS3, deleteLocalFile } from '../../infrastructure/storage/s3.client';
import { PARSE_CACHE_TTL_SECONDS } from '../../config/constants';
import { extractTextFromFile } from './extractor';
import { preprocessResumeText, truncateToTokenLimit } from './preprocessor';
import { parseResumeWithLLM } from './llm.client';
import { validateParsedResume } from './response.validator';
import { computeATSScore } from './scorer';
import type { ParsedResume } from './response.validator';

export async function runParserPipeline(resumeId: string): Promise<void> {
  const resume = await prisma.resume.findUniqueOrThrow({
    where: { id: resumeId },
  });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { parseStatus: 'PROCESSING' },
  });

  let tempFilePath: string | null = null;

  try {
    const cacheKey = `parsed:resume:${resumeId}`;
    const cached = await redis.get(cacheKey);

    let parsedData: ParsedResume;

    if (cached) {
      parsedData = JSON.parse(cached) as ParsedResume;
    } else {
      tempFilePath = await downloadFromS3(resume.fileUrl);

      const extracted = await extractTextFromFile(
        tempFilePath,
        resume.fileType as 'pdf' | 'docx'
      );

      const cleanText = preprocessResumeText(extracted.rawText);
      const truncatedText = truncateToTokenLimit(cleanText);

      const rawAIOutput = await parseResumeWithLLM(truncatedText);
      const rawJson = JSON.parse(rawAIOutput);
      parsedData = validateParsedResume(rawJson);

      await redis.setex(cacheKey, PARSE_CACHE_TTL_SECONDS, JSON.stringify(parsedData));
    }

    const atsResult = computeATSScore({ parsedResume: parsedData });

    const allSkills = [
      ...parsedData.skills.languages,
      ...parsedData.skills.frameworks,
      ...parsedData.skills.databases,
      ...parsedData.skills.tools,
      ...parsedData.skills.cloud,
    ];

    await prisma.$transaction(async (tx) => {
      await tx.resume.update({
        where: { id: resumeId },
        data: {
          parseStatus: 'COMPLETED',
          parsedData: parsedData as any,
          extractedSkills: allSkills,
          atsScore: atsResult.total,
          yearsExperience: parsedData.metrics.totalExperienceYears,
          parsedAt: new Date(),
        },
      });

      if (parsedData.personalInfo.name) {
        await tx.candidateProfile.upsert({
          where: { candidateId: resume.candidateId },
          update: { fullName: parsedData.personalInfo.name },
          create: {
            candidateId: resume.candidateId,
            fullName: parsedData.personalInfo.name,
            completionScore: 30,
          },
        });
      }

      for (const skillName of allSkills) {
        const skill = await tx.skill.findFirst({
          where: {
            OR: [
              { name: { equals: skillName, mode: 'insensitive' } },
              { aliases: { has: skillName.toLowerCase() } },
            ],
          },
        });

        if (skill) {
          await tx.candidateSkill.upsert({
            where: {
              candidateId_skillId: {
                candidateId: resume.candidateId,
                skillId: skill.id,
              },
            },
            update: { source: 'resume_parsed' },
            create: {
              candidateId: resume.candidateId,
              skillId: skill.id,
              proficiency: 50,
              source: 'resume_parsed',
            },
          });
        }
      }
    });
  } catch (error) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        parseStatus: 'FAILED',
        parseError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  } finally {
    if (tempFilePath) {
      await deleteLocalFile(tempFilePath);
    }
  }
}
