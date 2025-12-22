import { Prisma, PromptStatus, VarType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../errors';
import type { AuthUser } from '../middleware/requireAuth';

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

export async function listPrompts(params: {
  q?: string;
  tag?: string;
  env?: string;
  sort: 'updatedAt' | 'createdAt';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}) {
  const where: Prisma.PromptWhereInput = {
    deletedAt: null,
  };

  if (params.q) {
    const q = params.q.trim();
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        {
          versions: {
            some: {
              content: { contains: q },
            },
          },
        },
      ];
    }
  }

  if (params.tag) {
    const tag = normalizeTagName(params.tag);
    where.tags = {
      some: {
        tag: {
          name: tag,
        },
      },
    };
  }

  if (params.env) {
    where.publications = {
      some: {
        environment: {
          key: params.env,
        },
      },
    };
  }

  const skip = (params.page - 1) * params.pageSize;

  const [total, prompts] = await Promise.all([
    prisma.prompt.count({ where }),
    prisma.prompt.findMany({
      where,
      orderBy: { [params.sort]: params.order },
      skip,
      take: params.pageSize,
      include: {
        tags: { include: { tag: true } },
        publications: { include: { environment: true, promptVersion: true } },
      },
    }),
  ]);

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    items: prompts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ownerTeam: p.ownerTeam,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tags: p.tags.map((t) => t.tag.name),
      publications: p.publications.map((pub) => ({
        env: pub.environment.key,
        promptVersionId: pub.promptVersionId,
        publishedAt: pub.publishedAt,
      })),
    })),
  };
}

export async function getPromptDetail(promptId: string) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      versions: { include: { variables: true }, orderBy: { version: 'desc' } },
      publications: { include: { environment: true, promptVersion: true } },
    },
  });

  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    ownerTeam: prompt.ownerTeam,
    status: prompt.status,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    tags: prompt.tags.map((t) => t.tag.name),
    versions: prompt.versions.map((v) => ({
      id: v.id,
      version: v.version,
      content: v.content,
      modelName: v.modelName,
      temperature: v.temperature,
      maxTokens: v.maxTokens,
      topP: v.topP,
      notes: v.notes,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      variables: v.variables.map((vv) => ({
        name: vv.name,
        type: vv.type,
        required: vv.required,
        defaultValue: vv.defaultValue,
      })),
    })),
    publications: prompt.publications.map((pub) => ({
      id: pub.id,
      env: pub.environment.key,
      promptVersionId: pub.promptVersionId,
      publishedAt: pub.publishedAt,
      publishedBy: pub.publishedBy,
      notes: pub.notes,
    })),
  };
}

export async function createPrompt(
  user: AuthUser,
  body: {
    name: string;
    description?: string;
    ownerTeam?: string;
    status?: 'ACTIVE' | 'ARCHIVED';
    tags: string[];
    initialVersion: {
      content: string;
      modelName?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      notes?: string;
      variables: Array<{
        name: string;
        type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
        required: boolean;
        defaultValue?: string;
      }>;
    };
  },
) {
  const tagNames = Array.from(
    new Set((body.tags || []).map(normalizeTagName).filter(Boolean)),
  );

  const result = await prisma.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        name: body.name,
        description: body.description,
        ownerTeam: body.ownerTeam,
        status:
          (body.status as PromptStatus | undefined) ?? PromptStatus.ACTIVE,
      },
    });

    const version = await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: 1,
        content: body.initialVersion.content,
        modelName: body.initialVersion.modelName,
        temperature: body.initialVersion.temperature,
        maxTokens: body.initialVersion.maxTokens,
        topP: body.initialVersion.topP,
        notes: body.initialVersion.notes,
        createdBy: user.email,
      },
    });

    if (body.initialVersion.variables.length > 0) {
      await tx.promptVariable.createMany({
        data: body.initialVersion.variables.map((v) => ({
          promptVersionId: version.id,
          name: v.name,
          type: VarType[v.type],
          required: v.required,
          defaultValue: v.defaultValue,
        })),
      });
    }

    for (const t of tagNames) {
      const tag = await tx.tag.upsert({
        where: { name: t },
        update: {},
        create: { name: t },
      });

      await tx.promptTag.upsert({
        where: { promptId_tagId: { promptId: prompt.id, tagId: tag.id } },
        update: {},
        create: { promptId: prompt.id, tagId: tag.id },
      });
    }

    return { promptId: prompt.id, initialVersionId: version.id };
  });

  return getPromptDetail(result.promptId);
}

export async function updatePrompt(
  _user: AuthUser,
  promptId: string,
  body: {
    name?: string;
    description?: string | null;
    ownerTeam?: string | null;
    status?: 'ACTIVE' | 'ARCHIVED';
    tags?: string[];
  },
) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
  });
  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.prompt.update({
      where: { id: promptId },
      data: {
        name: body.name,
        description: body.description === null ? null : body.description,
        ownerTeam: body.ownerTeam === null ? null : body.ownerTeam,
        status: body.status ? (body.status as PromptStatus) : undefined,
      },
    });

    if (body.tags) {
      const tagNames = Array.from(
        new Set(body.tags.map(normalizeTagName).filter(Boolean)),
      );

      await tx.promptTag.deleteMany({ where: { promptId } });

      for (const t of tagNames) {
        const tag = await tx.tag.upsert({
          where: { name: t },
          update: {},
          create: { name: t },
        });

        await tx.promptTag.create({ data: { promptId, tagId: tag.id } });
      }
    }
  });

  return getPromptDetail(promptId);
}

export async function softDeletePrompt(_user: AuthUser, promptId: string) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
  });
  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  await prisma.prompt.update({
    where: { id: promptId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function createPromptVersion(
  user: AuthUser,
  promptId: string,
  body: {
    fromVersionId?: string;
    content?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    notes?: string;
    variables?: Array<{
      name: string;
      type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
      required: boolean;
      defaultValue?: string;
    }>;
  },
) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
  });
  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  const latest = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { version: 'desc' },
  });

  const nextVersion = (latest?.version ?? 0) + 1;

  const base = body.fromVersionId
    ? await prisma.promptVersion.findFirst({
        where: { id: body.fromVersionId, promptId },
        include: { variables: true },
      })
    : null;

  if (body.fromVersionId && !base) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Base version not found',
    });
  }

  const content = body.content ?? base?.content;
  if (!content) {
    throw new AppError({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'content is required (or provide fromVersionId)',
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    const v = await tx.promptVersion.create({
      data: {
        promptId,
        version: nextVersion,
        content,
        modelName: body.modelName ?? base?.modelName,
        temperature: body.temperature ?? base?.temperature ?? undefined,
        maxTokens: body.maxTokens ?? base?.maxTokens ?? undefined,
        topP: body.topP ?? base?.topP ?? undefined,
        notes: body.notes,
        createdBy: user.email,
      },
    });

    const vars = body.variables ?? base?.variables ?? [];
    if (vars.length > 0) {
      await tx.promptVariable.createMany({
        data: vars.map((vv) => ({
          promptVersionId: v.id,
          name: vv.name,
          type: (vv as any).type as VarType,
          required: vv.required,
          defaultValue: (vv as any).defaultValue,
        })),
      });
    }

    return v;
  });

  return {
    id: created.id,
    version: created.version,
  };
}

export async function publishPromptVersion(
  user: AuthUser,
  promptId: string,
  body: { env: string; promptVersionId: string; notes?: string },
) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
  });
  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  const version = await prisma.promptVersion.findFirst({
    where: { id: body.promptVersionId, promptId },
  });
  if (!version) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Version not found',
    });
  }

  const env = await prisma.environment.findUnique({ where: { key: body.env } });
  if (!env) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Environment not found',
    });
  }

  return prisma.promptPublication.create({
    data: {
      promptId,
      environmentId: env.id,
      promptVersionId: version.id,
      publishedBy: user.email,
      notes: body.notes,
    },
    include: { environment: true, promptVersion: true },
  });
}

export async function getActivePromptVersion(promptId: string, envKey: string) {
  const env = await prisma.environment.findUnique({ where: { key: envKey } });
  if (!env) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Environment not found',
    });
  }

  const pub = await prisma.promptPublication.findFirst({
    where: {
      promptId,
      environmentId: env.id,
      prompt: { deletedAt: null },
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      promptVersion: { include: { variables: true } },
      environment: true,
    },
  });

  if (!pub) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'No published version for environment',
    });
  }

  return {
    env: pub.environment.key,
    publishedAt: pub.publishedAt,
    publishedBy: pub.publishedBy,
    notes: pub.notes,
    version: {
      id: pub.promptVersion.id,
      version: pub.promptVersion.version,
      content: pub.promptVersion.content,
      modelName: pub.promptVersion.modelName,
      temperature: pub.promptVersion.temperature,
      maxTokens: pub.promptVersion.maxTokens,
      topP: pub.promptVersion.topP,
      variables: pub.promptVersion.variables.map((v) => ({
        name: v.name,
        type: v.type,
        required: v.required,
        defaultValue: v.defaultValue,
      })),
    },
  };
}

export async function exportPromptBundle(promptId: string) {
  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      versions: { include: { variables: true }, orderBy: { version: 'asc' } },
      publications: { include: { environment: true } },
    },
  });

  if (!prompt) {
    throw new AppError({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Prompt not found',
    });
  }

  return {
    prompt: {
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      ownerTeam: prompt.ownerTeam,
      status: prompt.status,
      tags: prompt.tags.map((t) => t.tag.name),
    },
    versions: prompt.versions.map((v) => ({
      version: v.version,
      content: v.content,
      modelName: v.modelName,
      temperature: v.temperature,
      maxTokens: v.maxTokens,
      topP: v.topP,
      notes: v.notes,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      variables: v.variables.map((vv) => ({
        name: vv.name,
        type: vv.type,
        required: vv.required,
        defaultValue: vv.defaultValue,
      })),
    })),
    publications: prompt.publications.map((p) => ({
      env: p.environment.key,
      promptVersionId: p.promptVersionId,
      publishedAt: p.publishedAt,
      publishedBy: p.publishedBy,
      notes: p.notes,
    })),
  };
}

export async function importPromptBundle(
  user: AuthUser,
  body: { bundle: any; mode: 'create' | 'merge' },
) {
  const bundle = body.bundle;

  if (!bundle || typeof bundle !== 'object') {
    throw new AppError({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'bundle is required',
    });
  }

  const promptIn = bundle.prompt;
  const versionsIn: any[] = Array.isArray(bundle.versions)
    ? bundle.versions
    : [];
  const tagsIn: string[] = Array.isArray(promptIn?.tags) ? promptIn.tags : [];

  if (!promptIn?.name || typeof promptIn.name !== 'string') {
    throw new AppError({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'bundle.prompt.name is required',
    });
  }

  const tagNames = Array.from(
    new Set(tagsIn.map(normalizeTagName).filter(Boolean)),
  );

  const promptId = await prisma.$transaction(async (tx) => {
    let prompt = null as any;

    if (body.mode === 'merge' && promptIn.id) {
      prompt = await tx.prompt.findFirst({
        where: { id: String(promptIn.id) },
      });
    }

    if (!prompt) {
      prompt = await tx.prompt.create({
        data: {
          id: promptIn.id ? String(promptIn.id) : undefined,
          name: promptIn.name,
          description: promptIn.description,
          ownerTeam: promptIn.ownerTeam,
          status:
            promptIn.status === 'ARCHIVED'
              ? PromptStatus.ARCHIVED
              : PromptStatus.ACTIVE,
        },
      });
    } else {
      await tx.prompt.update({
        where: { id: prompt.id },
        data: {
          name: promptIn.name,
          description: promptIn.description,
          ownerTeam: promptIn.ownerTeam,
          status:
            promptIn.status === 'ARCHIVED'
              ? PromptStatus.ARCHIVED
              : PromptStatus.ACTIVE,
          deletedAt: null,
        },
      });
    }

    await tx.promptTag.deleteMany({ where: { promptId: prompt.id } });
    for (const t of tagNames) {
      const tag = await tx.tag.upsert({
        where: { name: t },
        update: {},
        create: { name: t },
      });
      await tx.promptTag.create({
        data: { promptId: prompt.id, tagId: tag.id },
      });
    }

    const existingVersions = await tx.promptVersion.findMany({
      where: { promptId: prompt.id },
      select: { version: true },
    });
    const existingSet = new Set(existingVersions.map((v) => v.version));

    for (const v of versionsIn) {
      const versionNum = Number(v.version);
      if (!Number.isInteger(versionNum) || versionNum < 1) continue;
      if (existingSet.has(versionNum)) continue;

      const created = await tx.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: versionNum,
          content: String(v.content ?? ''),
          modelName: v.modelName ?? undefined,
          temperature: v.temperature ?? undefined,
          maxTokens: v.maxTokens ?? undefined,
          topP: v.topP ?? undefined,
          notes: v.notes ?? undefined,
          createdBy: v.createdBy ?? user.email,
          createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
        },
      });

      const vars = Array.isArray(v.variables) ? v.variables : [];
      for (const vv of vars) {
        if (!vv?.name) continue;
        const t = String(vv.type || 'STRING').toUpperCase();
        const type = (VarType as any)[t] ?? VarType.STRING;
        await tx.promptVariable.create({
          data: {
            promptVersionId: created.id,
            name: String(vv.name),
            type,
            required: Boolean(vv.required),
            defaultValue: vv.defaultValue ? String(vv.defaultValue) : undefined,
          },
        });
      }
    }

    return prompt.id as string;
  });

  return getPromptDetail(promptId);
}
