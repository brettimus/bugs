import type { Context } from "hono";

let STUPID_TRACE_ID: null | string = null;

export const getStupidTraceId = () => STUPID_TRACE_ID;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const getTraceId = (c: Context<any, string, {}>) => {
  return c.get("mizuTraceId");
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export const setTraceId = (c: Context<any, string, {}>) => {
  STUPID_TRACE_ID = randomId();
  return c.set("mizuTraceId", STUPID_TRACE_ID)
};

function randomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}