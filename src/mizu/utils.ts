import type { NeonDbError } from "@neondatabase/serverless";
import type { ExtendedExecutionContext } from "./types";

export function errorToJson(error: Error) {
  return {
    name: error.name,       // Includes the name of the error, e.g., 'TypeError'
    message: error.message, // The message string of the error
    stack: error.stack      // Stack trace of where the error occurred (useful for debugging)
    // Optionally add more properties here if needed
  };
}

export function neonDbErrorToJson(error: NeonDbError) {
  console.log('hahaaa', error)
  console.log('SOURCE', error.sourceError)

  // export class NeonDbError extends Error {
  //   name = 'NeonDbError' as const;

  //   severity: string | undefined;
  //   code: string | undefined;
  //   detail: string | undefined;
  //   hint: string | undefined;
  //   position: string | undefined;
  //   internalPosition: string | undefined;
  //   internalQuery: string | undefined;
  //   where: string | undefined;
  //   schema: string | undefined;
  //   table: string | undefined;
  //   column: string | undefined;
  //   dataType: string | undefined;
  //   constraint: string | undefined;
  //   file: string | undefined;
  //   line: string | undefined;
  //   routine: string | undefined;

  //   sourceError: Error | undefined;
  // }

  return {
    name: error.name,
    message: error.message,
    sourceError: error.sourceError ? errorToJson(error.sourceError) : undefined,
    // detail: error.detail,

    // NOTE - NeonDbError does not include a stack trace! https://github.com/neondatabase/serverless/issues/82
    stack: error?.sourceError?.stack,
    stack2: error?.sourceError?.sourceError?.stack,

    where: error?.sourceError?.where,
    table: error?.sourceError?.table,
    column: error?.sourceError?.column,
    dataType: error?.sourceError?.dataType,
    internalQuery: error?.sourceError?.internalQuery,
  }
}
export function polyfillWaitUntil(ctx: ExtendedExecutionContext) {
  if (typeof ctx.waitUntil !== "function") {
    if (!Array.isArray(ctx.__waitUntilPromises)) {
      ctx.__waitUntilPromises = [];
    }

    ctx.waitUntil = function waitUntil(promise: Promise<void>) {
      // biome-ignore lint/style/noNonNullAssertion: https://github.com/highlight/highlight/pull/6480
      ctx.__waitUntilPromises!.push(promise);
      ctx.__waitUntilTimer = setInterval(() => {
        Promise.allSettled(ctx.__waitUntilPromises || []).then(() => {
          if (ctx.__waitUntilTimer) {
            clearInterval(ctx.__waitUntilTimer);
            ctx.__waitUntilTimer = undefined;
          }
        });
      }, 200);
    };
  }

  ctx.waitUntilFinished = async function waitUntilFinished() {
    if (ctx.__waitUntilPromises) {
      await Promise.allSettled(ctx.__waitUntilPromises);
    }
  };
}
