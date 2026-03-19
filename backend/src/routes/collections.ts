import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, desc, count as dbCount, or, ilike } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface CollectionWithPollCount {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  poll_count: number;
  created_at: Date;
  updated_at: Date;
}

interface CollectionResponse {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function registerCollectionRoutes(app: App) {
  // GET /api/collections - list all collections with poll counts
  app.fastify.get('/api/collections', {
    schema: {
      description: 'List all collections with poll counts',
      tags: ['collections'],
      response: {
        200: {
          description: 'List of collections',
          type: 'object',
          properties: {
            collections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  color: { type: ['string', 'null'] },
                  emoji: { type: ['string', 'null'] },
                  poll_count: { type: 'integer' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'Fetching all collections');
    const collections = await app.db
      .select()
      .from(schema.collections)
      .orderBy(desc(schema.collections.created_at));

    const collectionsWithCounts: CollectionWithPollCount[] = [];
    for (const collection of collections) {
      const pollCount = await app.db
        .select({ count: dbCount(schema.polls.id) })
        .from(schema.polls)
        .where(eq(schema.polls.collection_id, collection.id));

      collectionsWithCounts.push({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        emoji: collection.emoji,
        poll_count: pollCount[0]?.count || 0,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
      });
    }

    app.logger.info({ count: collectionsWithCounts.length }, 'Collections fetched successfully');
    return { collections: collectionsWithCounts };
  });

  // POST /api/collections - create collection
  app.fastify.post('/api/collections', {
    schema: {
      description: 'Create a new collection',
      tags: ['collections'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          emoji: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Collection created successfully',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            color: { type: ['string', 'null'] },
            emoji: { type: ['string', 'null'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{
      Body: {
        name: string;
        description?: string;
        color?: string;
        emoji?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { name, description, color, emoji } = request.body;

    if (!name) {
      app.logger.warn({}, 'Missing name in collection creation');
      return reply.status(400).send({ error: 'name is required' });
    }

    app.logger.info({ name }, 'Creating new collection');

    const newCollection = await app.db
      .insert(schema.collections)
      .values({
        name,
        description: description || null,
        color: color || null,
        emoji: emoji || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    app.logger.info({ collectionId: newCollection[0].id }, 'Collection created successfully');
    return reply.status(201).send({
      id: newCollection[0].id,
      name: newCollection[0].name,
      description: newCollection[0].description,
      color: newCollection[0].color,
      emoji: newCollection[0].emoji,
      created_at: newCollection[0].created_at,
      updated_at: newCollection[0].updated_at,
    });
  });

  // GET /api/collections/:id - get collection with polls and combined results
  app.fastify.get('/api/collections/:id', {
    schema: {
      description: 'Get a collection with its polls and combined results',
      tags: ['collections'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Collection ID' },
        },
      },
      response: {
        200: {
          description: 'Collection with polls and combined results',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            color: { type: ['string', 'null'] },
            emoji: { type: ['string', 'null'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            polls: { type: 'array' },
            combined_results: { type: 'object' },
          },
        },
        404: {
          description: 'Collection not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ collectionId: id }, 'Fetching collection');

    const collection = await app.db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);

    if (collection.length === 0) {
      app.logger.warn({ collectionId: id }, 'Collection not found');
      return reply.status(404).send({ error: 'Not found' });
    }

    const coll = collection[0];

    // Fetch all polls in this collection
    const polls = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.collection_id, id));

    app.logger.info({ collectionId: id, pollCount: polls.length }, 'Polls fetched');

    // For each poll, get vote counts
    const pollsWithCounts = [];
    let totalVotes = 0;
    const combinedCounts = { a: 0, b: 0, c: 0, d: 0 };
    const labelsByOption: Record<string, Set<string | null>> = { a: new Set(), b: new Set(), c: new Set(), d: new Set() };

    for (const poll of polls) {
      const voteResults = await app.db
        .select({
          choice: schema.votes.choice,
          count: dbCount(schema.votes.id),
        })
        .from(schema.votes)
        .where(eq(schema.votes.poll_id, poll.id))
        .groupBy(schema.votes.choice);

      let aCnt = 0, bCnt = 0, cCnt = 0, dCnt = 0;
      for (const result of voteResults) {
        if (result.choice === 'a') aCnt = result.count;
        if (result.choice === 'b') bCnt = result.count;
        if (result.choice === 'c') cCnt = result.count;
        if (result.choice === 'd') dCnt = result.count;
      }

      const pollTotal = aCnt + bCnt + cCnt + dCnt;
      totalVotes += pollTotal;
      combinedCounts.a += aCnt;
      combinedCounts.b += bCnt;
      combinedCounts.c += cCnt;
      combinedCounts.d += dCnt;

      // Track labels
      if (poll.option_a_label) labelsByOption.a.add(poll.option_a_label);
      if (poll.option_b_label) labelsByOption.b.add(poll.option_b_label);
      if (poll.option_c_label) labelsByOption.c.add(poll.option_c_label);
      if (poll.option_d_label) labelsByOption.d.add(poll.option_d_label);

      pollsWithCounts.push({
        id: poll.id,
        title: poll.title,
        option_a_label: poll.option_a_label,
        option_b_label: poll.option_b_label,
        option_a_emoji: poll.option_a_emoji,
        option_b_emoji: poll.option_b_emoji,
        option_c_label: poll.option_c_label,
        option_c_emoji: poll.option_c_emoji,
        option_d_label: poll.option_d_label,
        option_d_emoji: poll.option_d_emoji,
        is_active: poll.is_active,
        counts: { a: aCnt, b: bCnt, c: cCnt, d: dCnt, total: pollTotal },
      });
    }

    // Compute by_option with most common label and percentages
    const byOption: Record<string, { label: string | null; total: number; percentage: number }> = {};
    for (const option of ['a', 'b', 'c', 'd']) {
      const labels = Array.from(labelsByOption[option]).filter((l) => l !== null);
      const mostCommonLabel = labels.length > 0 ? labels[0] : null;
      const total = combinedCounts[option as keyof typeof combinedCounts];
      const percentage = totalVotes > 0 ? Math.round((total / totalVotes) * 100) : 0;

      byOption[option] = {
        label: mostCommonLabel,
        total,
        percentage,
      };
    }

    // Build polls_summary
    const pollsSummary = pollsWithCounts.map((p) => ({
      poll_id: p.id,
      poll_title: p.title,
      counts: p.counts,
    }));

    const combinedResults = {
      total_votes: totalVotes,
      total_polls: polls.length,
      by_option: byOption,
      polls_summary: pollsSummary,
    };

    app.logger.info({ collectionId: id, totalVotes, totalPolls: polls.length }, 'Collection fetched successfully');

    return reply.status(200).send({
      id: coll.id,
      name: coll.name,
      description: coll.description,
      color: coll.color,
      emoji: coll.emoji,
      created_at: coll.created_at,
      updated_at: coll.updated_at,
      polls: pollsWithCounts,
      combined_results: combinedResults,
    });
  });

  // PUT /api/collections/:id - update collection
  app.fastify.put('/api/collections/:id', {
    schema: {
      description: 'Update a collection',
      tags: ['collections'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Collection ID' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          color: { type: ['string', 'null'] },
          emoji: { type: ['string', 'null'] },
        },
      },
      response: {
        200: {
          description: 'Collection updated successfully',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            color: { type: ['string', 'null'] },
            emoji: { type: ['string', 'null'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Collection not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        description?: string | null;
        color?: string | null;
        emoji?: string | null;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { name, description, color, emoji } = request.body;

    app.logger.info({ collectionId: id }, 'Updating collection');

    // Check if collection exists
    const collection = await app.db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);

    if (collection.length === 0) {
      app.logger.warn({ collectionId: id }, 'Collection not found');
      return reply.status(404).send({ error: 'Not found' });
    }

    const updates: Partial<typeof schema.collections.$inferSelect> = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (emoji !== undefined) updates.emoji = emoji;

    const updated = await app.db
      .update(schema.collections)
      .set(updates)
      .where(eq(schema.collections.id, id))
      .returning();

    app.logger.info({ collectionId: id }, 'Collection updated successfully');
    return reply.status(200).send({
      id: updated[0].id,
      name: updated[0].name,
      description: updated[0].description,
      color: updated[0].color,
      emoji: updated[0].emoji,
      created_at: updated[0].created_at,
      updated_at: updated[0].updated_at,
    });
  });

  // DELETE /api/collections/:id - delete collection
  app.fastify.delete('/api/collections/:id', {
    schema: {
      description: 'Delete a collection',
      tags: ['collections'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Collection ID' },
        },
      },
      response: {
        200: {
          description: 'Collection deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        404: {
          description: 'Collection not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ collectionId: id }, 'Deleting collection');

    // Check if collection exists
    const collection = await app.db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, id))
      .limit(1);

    if (collection.length === 0) {
      app.logger.warn({ collectionId: id }, 'Collection not found');
      return reply.status(404).send({ error: 'Not found' });
    }

    // Set all polls' collection_id to null before deleting
    await app.db
      .update(schema.polls)
      .set({ collection_id: null })
      .where(eq(schema.polls.collection_id, id));

    await app.db.delete(schema.collections).where(eq(schema.collections.id, id));
    app.logger.info({ collectionId: id }, 'Collection deleted successfully');
    return { success: true };
  });
}

export async function seedCollections(app: App) {
  app.logger.info({}, 'Seeding collections');

  const existingCollections = await app.db.select().from(schema.collections);
  if (existingCollections.length > 0) {
    app.logger.info({}, 'Collections already exist, skipping seed');
    return;
  }

  // Insert seed collections
  const collectionsData = [
    {
      id: '11111111-1111-1111-1111-111111111111' as any,
      name: 'Food Preferences 🍕',
      emoji: '🍕',
      color: '#FF6B6B',
      description: 'What foods do kids like?',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222' as any,
      name: 'Animals 🐾',
      emoji: '🐾',
      color: '#4ECDC4',
      description: 'Which animals do kids prefer?',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  await app.db.insert(schema.collections).values(collectionsData);
  app.logger.info({ count: collectionsData.length }, 'Collections seeded successfully');

  // Update existing polls to reference collections
  // Pizza and Ice Cream → Food collection
  await app.db
    .update(schema.polls)
    .set({ collection_id: '11111111-1111-1111-1111-111111111111' as any, updated_at: new Date() })
    .where(
      or(
        ilike(schema.polls.title, '%pizza%'),
        ilike(schema.polls.title, '%ice cream%')
      )
    );

  // Dogs → Animals collection
  await app.db
    .update(schema.polls)
    .set({ collection_id: '22222222-2222-2222-2222-222222222222' as any, updated_at: new Date() })
    .where(ilike(schema.polls.title, '%dog%'));

  app.logger.info({}, 'Polls updated with collection_ids');
}
