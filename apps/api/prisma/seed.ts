import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, PromptStatus, VarType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  const envs = [
    { key: 'dev', name: 'Development' },
    { key: 'stage', name: 'Staging' },
    { key: 'prod', name: 'Production' },
  ];

  for (const e of envs) {
    await prisma.environment.upsert({
      where: { key: e.key },
      update: { name: e.name },
      create: e,
    });
  }

  const tagProduct = await prisma.tag.upsert({
    where: { name: 'product' },
    update: {},
    create: { name: 'product' },
  });

  const prompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-1' },
    update: {
      name: 'Support Reply',
      description: 'Draft a support reply with a friendly tone',
      ownerTeam: 'Support',
      status: PromptStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: 'seed-prompt-1',
      name: 'Support Reply',
      description: 'Draft a support reply with a friendly tone',
      ownerTeam: 'Support',
      status: PromptStatus.ACTIVE,
    },
  });

  await prisma.promptTag.upsert({
    where: { promptId_tagId: { promptId: prompt.id, tagId: tagProduct.id } },
    update: {},
    create: { promptId: prompt.id, tagId: tagProduct.id },
  });

  const existing = await prisma.promptVersion.findMany({
    where: { promptId: prompt.id },
    orderBy: { version: 'desc' },
  });

  if (existing.length === 0) {
    const v1 = await prisma.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: 1,
        content:
          'You are a helpful support agent.\n\nCustomer message:\n{{message}}\n\nWrite a concise, friendly reply and include next steps.',
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 400,
        topP: 1,
        notes: 'Initial version',
        createdBy: adminEmail,
      },
    });

    await prisma.promptVariable.createMany({
      data: [
        {
          promptVersionId: v1.id,
          name: 'message',
          type: VarType.STRING,
          required: true,
        },
      ],
    });

    const prod = await prisma.environment.findUnique({ where: { key: 'prod' } });

    if (prod) {
      await prisma.promptPublication.create({
        data: {
          promptId: prompt.id,
          environmentId: prod.id,
          promptVersionId: v1.id,
          publishedBy: adminEmail,
          notes: 'Seed publish',
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
