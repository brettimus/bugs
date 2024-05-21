import { pgTable, serial, text, doublePrecision, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const bugs = pgTable('bugs', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  price: doublePrecision('price'),
  attributes: jsonb('attributes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});