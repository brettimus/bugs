import { neon } from '@neondatabase/serverless';
import { Hono } from 'hono'
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { Mizu } from "./mizu/mizu";
import { logger } from "./mizu/mizu-hono-logger";
import * as schema from "./db/schema";
import { getTraceId } from './mizu/stupid-trace';

type Bindings = {
  DATABASE_URL: string;
  MIZU_ENDPOINT: string;
};

const app = new Hono<{ Bindings: Bindings }>()


// Mizu Tracing Middleware - Must be called first!
app.use(async (c, next) => {
  const config = { MIZU_ENDPOINT: c.env.MIZU_ENDPOINT };
  const ctx = c.executionCtx;

  Mizu.init(
    config,
    ctx,
  );

  await next();

  if (c.error) {
    // console.error("Exception in Hono App", c.error);
  } else {
    // TODO - Uncomment for success logs...
    // console.log("Response Success");
  }
});

// Set up request logging
//
// NOTE - Could also pass in app to get entire app state and log that as well (if we go full "kitchen sink")
app.use(
  logger(
    // // HACK - Use a custom print function that just invokes console.log
    // //        We do this since console.log is monkeypatched later in the mizu middleware
    // (message: string, ...args: unknown[]) => console.log(message, args),
    // // HACK - Use a custom error print function that just invokes console.error
    // //        We do this since console.error is monkeypatched later in the mizu middleware
    // (message: string, ...args: unknown[]) => console.error(message, args)
  )
);


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

export default app
