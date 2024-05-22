import type { Context } from "hono";
import { v4 as uuidv4 } from 'uuid';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const getTraceId = (c: Context<any, string, {}>) => {
  return c.get("x-mizu-trace-id");
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const setTraceId = (c: Context<any, string, {}>) => {
  // let traceId = c.req.raw.headers.get("x-mizu-trace-id");
  let traceId = c.get("x-mizu-trace-id");
  if (!traceId) {
    traceId = uuidv4();
    c.set("x-mizu-trace-id", traceId);
  } else {
    console.debug('There was already a trace id in context, skipping setTraceId')
  }
};
