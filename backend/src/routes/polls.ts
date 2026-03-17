import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq, and, desc, count as dbCount } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

interface PollWithCounts {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  counts: {
    a: number;
    b: number;
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

  for (const result of results) {
    if (result.choice === 'a') aCount = result.count;
    if (result.choice === 'b') bCount = result.count;
  }

  return {
    a: aCount,
    b: bCount,
    total: aCount + bCount,
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
                  is_active: { type: 'boolean' },
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
    app.logger.info({}, 'Fetching all polls');
    const polls = await app.db
      .select()
      .from(schema.polls)
      .orderBy(desc(schema.polls.created_at));
    app.logger.info({ pollCount: polls.length }, 'Polls fetched successfully');
    return { polls: polls.map(formatPoll) };
  });

  // POST /api/polls - create new poll
  app.fastify.post('/api/polls', {
    schema: {
      description: 'Create a new poll',
      tags: ['polls'],
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          image_url: { type: 'string' },
          option_a_label: { type: 'string' },
          option_b_label: { type: 'string' },
          option_a_emoji: { type: 'string' },
          option_b_emoji: { type: 'string' },
          is_active: { type: 'boolean' },
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
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{
      Body: {
        title: string;
        description?: string;
        image_url?: string;
        option_a_label?: string;
        option_b_label?: string;
        option_a_emoji?: string;
        option_b_emoji?: string;
        is_active?: boolean;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { title, description, image_url, option_a_label, option_b_label, option_a_emoji, option_b_emoji, is_active } = request.body;
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
        option_a_label: option_a_label || 'Like',
        option_b_label: option_b_label || 'Dislike',
        option_a_emoji: option_a_emoji || '👍',
        option_b_emoji: option_b_emoji || '👎',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    app.logger.info({ pollId: newPoll[0].id }, 'Poll created successfully');
    return reply.status(201).send(formatPoll(newPoll[0]));
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
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
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
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
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
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
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
        is_active?: boolean;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { title, description, image_url, option_a_label, option_b_label, option_a_emoji, option_b_emoji, is_active } = request.body;
    app.logger.info({ pollId: id, is_active }, 'Updating poll');

    // If is_active is being set to true, set all other polls to inactive
    if (is_active === true) {
      await app.db
        .update(schema.polls)
        .set({ is_active: false, updated_at: new Date() })
        .where(and(eq(schema.polls.is_active, true), eq(schema.polls.id, id)));
    }

    const updates: Partial<typeof schema.polls.$inferSelect> = { updated_at: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (option_a_label !== undefined) updates.option_a_label = option_a_label;
    if (option_b_label !== undefined) updates.option_b_label = option_b_label;
    if (option_a_emoji !== undefined) updates.option_a_emoji = option_a_emoji;
    if (option_b_emoji !== undefined) updates.option_b_emoji = option_b_emoji;
    if (is_active !== undefined) updates.is_active = is_active;

    const updated = await app.db
      .update(schema.polls)
      .set(updates)
      .where(eq(schema.polls.id, id))
      .returning();

    app.logger.info({ pollId: id }, 'Poll updated successfully');
    return reply.status(200).send(formatPoll(updated[0]));
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
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ pollId: id }, 'Deleting poll');
    await app.db.delete(schema.polls).where(eq(schema.polls.id, id));
    app.logger.info({ pollId: id }, 'Poll deleted successfully');
    return { success: true };
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
          choice: { type: 'string', enum: ['a', 'b'] },
          voter_name: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Vote recorded successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            counts: {
              type: 'object',
              properties: {
                a: { type: 'integer' },
                b: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
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

    await app.db.insert(schema.votes).values({
      poll_id: id,
      choice,
      voter_name: voter_name || null,
      created_at: new Date(),
    });

    const counts = await getVoteCounts(app, id);
    app.logger.info({ pollId: id, counts }, 'Vote recorded successfully');
    return reply.status(201).send({ success: true, counts });
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
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ pollId: id }, 'Resetting poll votes');
    await app.db.delete(schema.votes).where(eq(schema.votes.poll_id, id));
    app.logger.info({ pollId: id }, 'Poll votes reset successfully');
    return { success: true };
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
      title: 'Do you like pizza? 🍕',
      description: 'Tell us how you feel about pizza!',
      image_url: 'https://picsum.photos/seed/pizza/600/400',
      option_a_label: 'Love it!',
      option_b_label: 'Not for me',
      option_a_emoji: '❤️',
      option_b_emoji: '😕',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222' as any,
      title: 'Do you like dogs? 🐶',
      description: 'Are you a dog person?',
      image_url: 'https://picsum.photos/seed/dogs/600/400',
      option_a_label: 'Yes!',
      option_b_label: 'Not really',
      option_a_emoji: '🐾',
      option_b_emoji: '😐',
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333' as any,
      title: 'Do you like ice cream? 🍦',
      description: 'What do you think about ice cream?',
      image_url: 'https://picsum.photos/seed/icecream/600/400',
      option_a_label: 'Yummy!',
      option_b_label: 'No thanks',
      option_a_emoji: '😋',
      option_b_emoji: '🙅',
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  await app.db.insert(schema.polls).values(pollsData);
  app.logger.info({ count: pollsData.length }, 'Polls seeded successfully');

  // Insert seed votes for the first poll
  const votesData = [
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Emma' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Liam' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Olivia' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Noah' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Ava' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Ethan' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Sophia' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'a', voter_name: 'Mason' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'b', voter_name: 'Isabella' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'b', voter_name: 'James' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'b', voter_name: 'Mia' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'b', voter_name: 'Lucas' },
    { poll_id: '11111111-1111-1111-1111-111111111111' as any, choice: 'b', voter_name: 'Charlotte' },
  ];

  const votesWithDates = votesData.map((vote) => ({
    ...vote,
    created_at: new Date(),
  }));

  await app.db.insert(schema.votes).values(votesWithDates);
  app.logger.info({ count: votesWithDates.length }, 'Votes seeded successfully');
}
