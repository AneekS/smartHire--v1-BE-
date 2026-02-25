import { PrismaClient } from '@prisma/client';
import { SKILL_TAXONOMY } from '../src/shared/constants/skill-taxonomy';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding skill taxonomy...');

  for (const skill of SKILL_TAXONOMY) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { aliases: skill.aliases },
      create: skill,
    });
  }

  console.log(`Seeded ${SKILL_TAXONOMY.length} skills`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
