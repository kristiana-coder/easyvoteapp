import { pgTable, uuid, text, boolean, timestamp, foreignKey } from 'drizzle-orm/pg-core';

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  image_url: text('image_url'),
  option_a_label: text('option_a_label').notNull().default('Like'),
  option_b_label: text('option_b_label').notNull().default('Dislike'),
  option_a_emoji: text('option_a_emoji').notNull().default('👍'),
  option_b_emoji: text('option_b_emoji').notNull().default('👎'),
  option_c_label: text('option_c_label'),
  option_c_emoji: text('option_c_emoji'),
  option_d_label: text('option_d_label'),
  option_d_emoji: text('option_d_emoji'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    poll_id: uuid('poll_id').notNull(),
    choice: text('choice').notNull(),
    voter_name: text('voter_name'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.poll_id],
      foreignColumns: [polls.id],
      name: 'votes_poll_id_fk',
    }).onDelete('cascade'),
  ]
);
