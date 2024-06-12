import { neon } from '@neondatabase/serverless';
import { Hono } from 'hono'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { createHonoMiddleware } from '@mizu-dev/hono'
import * as schema from "./db/schema";

class BugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BugError';
    Error.captureStackTrace(this, BugError);
  }
}

type Bindings = {
  DATABASE_URL: string;
  DATABASE_URL_BLANK: string;
  MIZU_ENDPOINT: string;
};

const app = new Hono<{ Bindings: Bindings }>()

// @ts-ignore
app.use(createHonoMiddleware(app));

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/bugs', async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql);
  const bugs = await db.select().from(schema.bugs);
  return c.json({ bugs })
})

app.get('/bugs/:id', async (c) => {
  const { id: idString } = c.req.param();
  const id = Number.parseInt(idString, 10);
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql, { schema });
  const bug = await db.select().from(schema.bugs).where(eq(schema.bugs.id, id));

  return c.json(bug)
})

// ERROR SCENARIO: Accidentally defining an unreachable route
//
app.get('/bugs/unreachable', async (c) => {
  return c.json({ message: "You should not see this message" })
})

// ERROR SCENARIO: Accidentally accessing process.env
// 
app.get('/insects/:id', async (c) => {
  const { id: idString } = c.req.param();
  const id = Number.parseInt(idString, 10);
  const sql = neon(process.env.DATABASE_URL ?? "");
  const db = drizzle(sql, { schema });
  const bug = await db.select().from(schema.bugs).where(eq(schema.bugs.id, id));

  return c.json(bug)
})

// ERROR SCENARIO: Accessing table or column that does not exist (e.g., before running migrations)
//
app.get('/insects', (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql);
  return c.text('Hello Hono!')
})

// ERROR SCENARIO: Accessing an env var before reloading dev
//
app.get('/no-db', (c) => {
  const sql = neon(c.env.DATABASE_URL_BLANK);
  const db = drizzle(sql);
  return c.text('Hello Hono!')
})

// ERROR SCENARIO: Inserting into database, but the query is wrong...
//
app.get('/bad-insert-neon', async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  // const db = drizzle(sql);
  const insertResponse = await sql("insert into bugs (name, description, price, attributes) values ($1, $2, $3)", ["Mantis", "...", 10.99, { pincers: true }]);

  return c.text('Hello Hono!')
})

app.get('/stack-trace', (c) => {
  const err = new BugError('This is a bug error');
  return c.text(err.stack ?? 'No stack trace available')
});

app.get('/fetch', async (c) => {
  const todo = await fetch('https://jsonplaceholder.typicode.com/todos/1')
    .then(response => response.json())
    
  return c.json({ todo })
});

app.get('/bad-fetch', async (c) => {
  const todo = await fetch('https://jsonplaceholderrrr.typicode.com/todos/1').then(response => response.json())

  return c.json({ todo })
});

// TODO - Add favicon
// app.get('/favicon.ico', (c) => c.text('No favicon')) 

export default app
