import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, desc, count as dbCount } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import { randomUUID } from 'crypto';

interface PollWithCounts {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  option_c_label: string | null;
  option_c_emoji: string | null;
  option_d_label: string | null;
  option_d_emoji: string | null;
  is_active: boolean;
  collection_id: string | null;
  created_at: Date;
  updated_at: Date;
  counts: {
    a: number;
    b: number;
    c: number;
    d: number;
    total: number;
  };
}

async function getVoteCounts(app: App, pollId: string) {
  const results = await app.db
    .select({
      choice: schema.votes.choice,
      count: dbCount(schema.votes.id),
    })
    .from(schema.votes)
    .where(eq(schema.votes.poll_id, pollId))
    .groupBy(schema.votes.choice);

  let aCount = 0;
  let bCount = 0;
  let cCount = 0;
  let dCount = 0;

  for (const result of results) {
    if (result.choice === 'a') aCount = result.count;
    if (result.choice === 'b') bCount = result.count;
    if (result.choice === 'c') cCount = result.count;
    if (result.choice === 'd') dCount = result.count;
  }

  return {
    a: aCount,
    b: bCount,
    c: cCount,
    d: dCount,
    total: aCount + bCount + cCount + dCount,
  };
}

function formatPoll(poll: typeof schema.polls.$inferSelect): Omit<typeof poll, 'created_at' | 'updated_at'> & { created_at: Date; updated_at: Date } {
  return {
    ...poll,
    created_at: poll.created_at,
    updated_at: poll.updated_at,
  };
}

export async function registerPollRoutes(app: App) {
  // GET /api/polls - list all polls ordered by created_at desc
  app.fastify.get('/api/polls', {
    schema: {
      description: 'List all polls ordered by created_at descending',
      tags: ['polls'],
      response: {
        200: {
          description: 'List of polls',
          type: 'object',
          properties: {
            polls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  image_url: { type: ['string', 'null'] },
                  option_a_label: { type: 'string' },
                  option_b_label: { type: 'string' },
                  option_a_emoji: { type: 'string' },
                  option_b_emoji: { type: 'string' },
                  option_c_label: { type: ['string', 'null'] },
                  option_c_emoji: { type: ['string', 'null'] },
                  option_d_label: { type: ['string', 'null'] },
                  option_d_emoji: { type: ['string', 'null'] },
                  collection_id: { type: ['string', 'null'], format: 'uuid' },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  counts: {
                    type: 'object',
                    properties: {
                      a: { type: 'integer' },
                      b: { type: 'integer' },
                      c: { type: 'integer' },
                      d: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'Fetching all polls');
    const polls = await app.db
      .select()
      .from(schema.polls)
      .orderBy(desc(schema.polls.created_at));

    const pollsWithCounts: PollWithCounts[] = [];
    for (const poll of polls) {
      const counts = await getVoteCounts(app, poll.id);
      pollsWithCounts.push({
        id: poll.id,
        title: poll.title,
        description: poll.description,
        image_url: poll.image_url,
        option_a_label: poll.option_a_label,
        option_b_label: poll.option_b_label,
        option_a_emoji: poll.option_a_emoji,
        option_b_emoji: poll.option_b_emoji,
        option_c_label: poll.option_c_label,
        option_c_emoji: poll.option_c_emoji,
        option_d_label: poll.option_d_label,
        option_d_emoji: poll.option_d_emoji,
        is_active: poll.is_active,
        collection_id: poll.collection_id,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        counts,
      });
    }

    app.logger.info({ pollCount: pollsWithCounts.length }, 'Polls fetched successfully');
    return { polls: pollsWithCounts };
  });

  // POST /api/polls - create new poll
  app.fastify.post('/api/polls', {
    schema: {
      description: 'Create a new poll',
      tags: ['polls'],
      body: {
        type: 'object',
        required: ['title', 'option_a_label', 'option_a_emoji', 'option_b_label', 'option_b_emoji'],
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          image_url: { type: ['string', 'null'] },
          option_a_label: { type: 'string' },
          option_b_label: { type: 'string' },
          option_a_emoji: { type: 'string' },
          option_b_emoji: { type: 'string' },
          option_c_label: { type: ['string', 'null'] },
          option_c_emoji: { type: ['string', 'null'] },
          option_d_label: { type: ['string', 'null'] },
          option_d_emoji: { type: ['string', 'null'] },
          is_active: { type: 'boolean' },
          collection_id: { type: ['string', 'null'], format: 'uuid' },
        },
      },
      response: {
        201: {
          description: 'Poll created successfully',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            image_url: { type: ['string', 'null'] },
            option_a_label: { type: 'string' },
            option_b_label: { type: 'string' },
            option_a_emoji: { type: 'string' },
            option_b_emoji: { type: 'string' },
            option_c_label: { type: ['string', 'null'] },
            option_c_emoji: { type: ['string', 'null'] },
            option_d_label: { type: ['string', 'null'] },
            option_d_emoji: { type: ['string', 'null'] },
            is_active: { type: 'boolean' },
            collection_id: { type: ['string', 'null'], format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
                c: { type: 'integer' },
                d: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{
      Body: {
        title: string;
        description?: string | null;
        image_url?: string | null;
        option_a_label: string;
        option_b_label: string;
        option_a_emoji: string;
        option_b_emoji: string;
        option_c_label?: string | null;
        option_c_emoji?: string | null;
        option_d_label?: string | null;
        option_d_emoji?: string | null;
        is_active?: boolean;
        collection_id?: string | null;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { title, description, image_url, option_a_label, option_b_label, option_a_emoji, option_b_emoji, option_c_label, option_c_emoji, option_d_label, option_d_emoji, is_active, collection_id } = request.body;
    app.logger.info({ title, is_active }, 'Creating new poll');

    // If is_active is true, set all other polls to inactive
    if (is_active) {
      await app.db
        .update(schema.polls)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(schema.polls.is_active, true));
    }

    const newPoll = await app.db
      .insert(schema.polls)
      .values({
        title,
        description: description || null,
        image_url: image_url || null,
        option_a_label,
        option_b_label,
        option_a_emoji,
        option_b_emoji,
        option_c_label: option_c_label || null,
        option_c_emoji: option_c_emoji || null,
        option_d_label: option_d_label || null,
        option_d_emoji: option_d_emoji || null,
        is_active: is_active !== undefined ? is_active : false,
        collection_id: collection_id || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    const counts = await getVoteCounts(app, newPoll[0].id);
    app.logger.info({ pollId: newPoll[0].id }, 'Poll created successfully');
    return reply.status(201).send({ ...formatPoll(newPoll[0]), counts });
  });

  // GET /api/polls/active - get active poll with counts (must be before :id route)
  app.fastify.get('/api/polls/active', {
    schema: {
      description: 'Get the active poll with vote counts',
      tags: ['polls'],
      response: {
        200: {
          description: 'Active poll with counts',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            image_url: { type: ['string', 'null'] },
            option_a_label: { type: 'string' },
            option_b_label: { type: 'string' },
            option_a_emoji: { type: 'string' },
            option_b_emoji: { type: 'string' },
            option_c_label: { type: ['string', 'null'] },
            option_c_emoji: { type: ['string', 'null'] },
            option_d_label: { type: ['string', 'null'] },
            option_d_emoji: { type: ['string', 'null'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
                c: { type: 'integer' },
                d: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
        404: {
          description: 'No active poll found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'Fetching active poll');
    const activePoll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.is_active, true))
      .limit(1);

    if (activePoll.length === 0) {
      app.logger.warn({}, 'No active poll found');
      return reply.status(404).send({ error: 'No active poll' });
    }

    const poll = activePoll[0];
    const counts = await getVoteCounts(app, poll.id);
    app.logger.info({ pollId: poll.id, counts }, 'Active poll fetched successfully');
    return { ...formatPoll(poll), counts };
  });

  // GET /api/polls/:id - get poll with counts
  app.fastify.get('/api/polls/:id', {
    schema: {
      description: 'Get a poll by ID with vote counts',
      tags: ['polls'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Poll ID' },
        },
      },
      response: {
        200: {
          description: 'Poll with counts',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            image_url: { type: ['string', 'null'] },
            option_a_label: { type: 'string' },
            option_b_label: { type: 'string' },
            option_a_emoji: { type: 'string' },
            option_b_emoji: { type: 'string' },
            option_c_label: { type: ['string', 'null'] },
            option_c_emoji: { type: ['string', 'null'] },
            option_d_label: { type: ['string', 'null'] },
            option_d_emoji: { type: ['string', 'null'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
                c: { type: 'integer' },
                d: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
        404: {
          description: 'Poll not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ pollId: id }, 'Fetching poll');
    const poll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, id))
      .limit(1);

    if (poll.length === 0) {
      app.logger.warn({ pollId: id }, 'Poll not found');
      return reply.status(404).send({ error: 'Poll not found' });
    }

    const counts = await getVoteCounts(app, id);
    app.logger.info({ pollId: id, counts }, 'Poll fetched successfully');
    return { ...formatPoll(poll[0]), counts };
  });

  // PUT /api/polls/:id - update poll
  app.fastify.put('/api/polls/:id', {
    schema: {
      description: 'Update a poll',
      tags: ['polls'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Poll ID' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          image_url: { type: ['string', 'null'] },
          option_a_label: { type: 'string' },
          option_b_label: { type: 'string' },
          option_a_emoji: { type: 'string' },
          option_b_emoji: { type: 'string' },
          option_c_label: { type: ['string', 'null'] },
          option_c_emoji: { type: ['string', 'null'] },
          option_d_label: { type: ['string', 'null'] },
          option_d_emoji: { type: ['string', 'null'] },
          collection_id: { type: ['string', 'null'], format: 'uuid' },
          is_active: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Poll updated successfully',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            image_url: { type: ['string', 'null'] },
            option_a_label: { type: 'string' },
            option_b_label: { type: 'string' },
            option_a_emoji: { type: 'string' },
            option_b_emoji: { type: 'string' },
            option_c_label: { type: ['string', 'null'] },
            option_c_emoji: { type: ['string', 'null'] },
            option_d_label: { type: ['string', 'null'] },
            option_d_emoji: { type: ['string', 'null'] },
            collection_id: { type: ['string', 'null'], format: 'uuid' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
                c: { type: 'integer' },
                d: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
        404: {
          description: 'Poll not found',
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
        title?: string;
        description?: string | null;
        image_url?: string | null;
        option_a_label?: string;
        option_b_label?: string;
        option_a_emoji?: string;
        option_b_emoji?: string;
        option_c_label?: string | null;
        option_c_emoji?: string | null;
        option_d_label?: string | null;
        option_d_emoji?: string | null;
        collection_id?: string | null;
        is_active?: boolean;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { title, description, image_url, option_a_label, option_b_label, option_a_emoji, option_b_emoji, option_c_label, option_c_emoji, option_d_label, option_d_emoji, collection_id, is_active } = request.body;
    app.logger.info({ pollId: id, is_active }, 'Updating poll');

    // Check if poll exists
    const poll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, id))
      .limit(1);

    if (poll.length === 0) {
      app.logger.warn({ pollId: id }, 'Poll not found');
      return reply.status(404).send({ error: 'Poll not found' });
    }

    // If is_active is being set to true, set all other polls to inactive
    if (is_active === true) {
      await app.db
        .update(schema.polls)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(schema.polls.is_active, true));
    }

    const updates: Partial<typeof schema.polls.$inferSelect> = { updated_at: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (option_a_label !== undefined) updates.option_a_label = option_a_label;
    if (option_b_label !== undefined) updates.option_b_label = option_b_label;
    if (option_a_emoji !== undefined) updates.option_a_emoji = option_a_emoji;
    if (option_b_emoji !== undefined) updates.option_b_emoji = option_b_emoji;
    if (option_c_label !== undefined) updates.option_c_label = option_c_label;
    if (option_c_emoji !== undefined) updates.option_c_emoji = option_c_emoji;
    if (option_d_label !== undefined) updates.option_d_label = option_d_label;
    if (option_d_emoji !== undefined) updates.option_d_emoji = option_d_emoji;
    if (collection_id !== undefined) updates.collection_id = collection_id || null;
    if (is_active !== undefined) updates.is_active = is_active;

    const updated = await app.db
      .update(schema.polls)
      .set(updates)
      .where(eq(schema.polls.id, id))
      .returning();

    const counts = await getVoteCounts(app, id);
    app.logger.info({ pollId: id }, 'Poll updated successfully');
    return reply.status(200).send({ ...formatPoll(updated[0]), counts });
  });

  // DELETE /api/polls/:id
  app.fastify.delete('/api/polls/:id', {
    schema: {
      description: 'Delete a poll',
      tags: ['polls'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Poll ID' },
        },
      },
      response: {
        200: {
          description: 'Poll deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        404: {
          description: 'Poll not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ pollId: id }, 'Deleting poll');

    // Check if poll exists
    const poll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, id))
      .limit(1);

    if (poll.length === 0) {
      app.logger.warn({ pollId: id }, 'Poll not found');
      return reply.status(404).send({ error: 'Poll not found' });
    }

    await app.db.delete(schema.polls).where(eq(schema.polls.id, id));
    app.logger.info({ pollId: id }, 'Poll deleted successfully');
    return { success: true, id };
  });

  // POST /api/polls/:id/votes - insert vote
  app.fastify.post('/api/polls/:id/votes', {
    schema: {
      description: 'Cast a vote on a poll',
      tags: ['polls'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Poll ID' },
        },
      },
      body: {
        type: 'object',
        required: ['choice'],
        properties: {
          choice: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          voter_name: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Vote recorded successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            choice: { type: 'string' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Poll not found',
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
      Body: { choice: string; voter_name?: string };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { choice, voter_name } = request.body;
    app.logger.info({ pollId: id, choice, voterName: voter_name }, 'Inserting vote');

    // Validate choice
    if (!['a', 'b', 'c', 'd'].includes(choice)) {
      app.logger.warn({ pollId: id, choice }, 'Invalid choice');
      return reply.status(400).send({ error: 'Invalid choice' });
    }

    // Check if poll exists
    const poll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, id))
      .limit(1);

    if (poll.length === 0) {
      app.logger.warn({ pollId: id }, 'Poll not found');
      return reply.status(404).send({ error: 'Poll not found' });
    }

    // Validate poll is active
    if (!poll[0].is_active) {
      app.logger.warn({ pollId: id }, 'Poll is not active');
      return reply.status(400).send({ error: 'Poll is not active' });
    }

    await app.db.insert(schema.votes).values({
      poll_id: id,
      choice,
      voter_name: voter_name || null,
      created_at: new Date(),
    });

    app.logger.info({ pollId: id, choice }, 'Vote recorded successfully');
    return reply.status(201).send({ success: true, choice });
  });

  // POST /api/polls/:id/reset - delete all votes for poll
  app.fastify.post('/api/polls/:id/reset', {
    schema: {
      description: 'Reset all votes for a poll',
      tags: ['polls'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Poll ID' },
        },
      },
      response: {
        200: {
          description: 'Votes reset successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            deleted_count: { type: 'integer' },
          },
        },
        404: {
          description: 'Poll not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ pollId: id }, 'Resetting poll votes');

    // Check if poll exists
    const poll = await app.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, id))
      .limit(1);

    if (poll.length === 0) {
      app.logger.warn({ pollId: id }, 'Poll not found');
      return reply.status(404).send({ error: 'Poll not found' });
    }

    // Count votes before deleting
    const votesToDelete = await app.db
      .select()
      .from(schema.votes)
      .where(eq(schema.votes.poll_id, id));

    await app.db.delete(schema.votes).where(eq(schema.votes.poll_id, id));
    app.logger.info({ pollId: id, deletedCount: votesToDelete.length }, 'Poll votes reset successfully');
    return { success: true, deleted_count: votesToDelete.length };
  });

  // POST /api/upload - file upload endpoint
  app.fastify.post('/api/upload', {
    schema: {
      description: 'Upload a file',
      tags: ['upload'],
      response: {
        200: {
          description: 'File uploaded successfully',
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({}, 'Starting file upload');

    let data;
    try {
      data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      app.logger.error({ err: error }, 'Error reading file from request');
      return reply.status(500).send({ error: 'Upload failed', details: errorMsg });
    }

    if (!data) {
      app.logger.warn({}, 'No file uploaded');
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    try {
      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        app.logger.error({ err: error }, 'File too large');
        return reply.status(500).send({ error: 'Upload failed', details: errorMsg });
      }

      // Generate unique filename: UUID + original extension
      const uuid = randomUUID();
      const originalFilename = data.filename || '';
      let extension = '';

      if (originalFilename) {
        const lastDotIndex = originalFilename.lastIndexOf('.');
        if (lastDotIndex > 0) {
          extension = originalFilename.substring(lastDotIndex);
        }
      }

      if (!extension) {
        extension = '.bin';
      }

      const filename = `${uuid}${extension}`;
      const key = `uploads/${filename}`;

      app.logger.info({ filename, keyPath: key }, 'Uploading file to storage');

      // Upload to S3
      const uploadedKey = await app.storage.upload(key, buffer);

      // Get signed URL
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info({ filename, url }, 'File uploaded successfully');
      return { url };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      app.logger.error({ err: error }, 'Failed to upload file');
      return reply.status(500).send({ error: 'Upload failed', details: errorMsg });
    }
  });
}

export async function seedPolls(app: App) {
  app.logger.info({}, 'Seeding polls');

  const existingPolls = await app.db.select().from(schema.polls);
  if (existingPolls.length > 0) {
    app.logger.info({}, 'Polls already exist, skipping seed');
    return;
  }

  // Insert seed polls
  const pollsData = [
    {
      id: '11111111-1111-1111-1111-111111111111' as any,
      title: 'What\'s your favourite pizza topping?',
      description: null,
      image_url: null,
      option_a_label: 'Cheese',
      option_b_label: 'Pepperoni',
      option_a_emoji: '🍕',
      option_b_emoji: '🥩',
      option_c_label: 'Spicy',
      option_c_emoji: '🌶️',
      option_d_label: 'Mushroom',
      option_d_emoji: '🍄',
      is_active: true,
      collection_id: '11111111-1111-1111-1111-111111111111' as any,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222' as any,
      title: 'Dogs or Cats?',
      description: null,
      image_url: null,
      option_a_label: 'Dogs',
      option_b_label: 'Cats',
      option_a_emoji: '🐶',
      option_b_emoji: '🐱',
      option_c_label: null,
      option_c_emoji: null,
      option_d_label: null,
      option_d_emoji: null,
      is_active: false,
      collection_id: '22222222-2222-2222-2222-222222222222' as any,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333' as any,
      title: 'Favourite season?',
      description: null,
      image_url: null,
      option_a_label: 'Summer',
      option_b_label: 'Winter',
      option_a_emoji: '☀️',
      option_b_emoji: '❄️',
      option_c_label: 'Autumn',
      option_c_emoji: '🍂',
      option_d_label: 'Spring',
      option_d_emoji: '🌸',
      is_active: false,
      collection_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  await app.db.insert(schema.polls).values(pollsData);
  app.logger.info({ count: pollsData.length }, 'Polls seeded successfully');
}
