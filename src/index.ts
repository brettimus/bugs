import { neon } from '@neondatabase/serverless';
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/neon-http';

import { Mizu } from "./mizu/mizu";
import { logger } from "./mizu/mizu-logger";

type Bindings = {
  DATABASE_URL: string;
  MIZU_ENDPOINT: string;
};

const app = new Hono<{ Bindings: Bindings }>()

// Set up request logging
//
// HACK - Use a custom print function that just invokes console.log
//        We do this since console.log is monkeypatched later in the mizu middleware
// NOTE - This will log every piece of matched middleware for each request
// NOTE - We need to pass in the app object so that we can access the router
app.use(
  logger(app, (message: string, ...args: unknown[]) => console.log(message, args)),
);

// Mizu Tracing Middleware
app.use(async (c, next) => {
  const rawRequest = c.req.raw;
  const ctx = c.executionCtx;
  Mizu.init(
    rawRequest,
    {
      MIZU_ENDPOINT: "http://localhost:8788/v0/logs",
    },
    ctx,
  );

  await next();

  if (c.error) {
    console.error("Exception in Hono App", c.error);
  } else {
    console.log("Response Success");
  }
});

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// ERROR SCENARIO: Accidentally accessing process.env
//
// app.get('/bugs', (c) => {
//   const sql = neon(process.env.DATABASE_URL);
//   const db = drizzle(sql);
//   return c.text('Hello Hono!')
// })

app.get('/bugs', async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const db = drizzle(sql);
  const bugs = await db.select().from("bugs");
  return c.text('Hello Hono!')
})

export default app
