import { errorToJson, polyfillWaitUntil } from "./utils";

declare module 'hono' {
	interface ContextVariableMap {
		mizuTraceId: string
	}
}

export const RECORDED_CONSOLE_METHODS = [
	"debug",
	"error",
	"info",
	"log",
	"warn",
] as const;

type MizuEnv = {
	MIZU_ENDPOINT: string;
};

export const Mizu = {
	init: (
		traceId: string,
		{ MIZU_ENDPOINT: mizuEndpoint }: MizuEnv,
		ctx: ExecutionContext,
		service?: string,
	) => {
		// @NOTE - Probably not necessary for cloudflare workers
		// https://github.com/highlight/highlight/pull/6480
		polyfillWaitUntil(ctx);

		// Monkeypatch console.log (etc) because it's the only way to send consumable logs locally without setting up an otel colletor
		for (const level of RECORDED_CONSOLE_METHODS) {
			const originalConsoleMethod = console[level];

			// TODO - Fix type of `originalMessage`, since Hono automatically calls `console.error` with an `Error` when a handler throws an uncaught error locally!!!
			//        and devs could really put anything in there...
			console[level] = (originalMessage: string | Error, ...args: unknown[]) => {
				const timestamp = new Date().toISOString();
				let message = originalMessage;
				if (message instanceof Error) {
					message = JSON.stringify(errorToJson(message));
					console.log("JSONIFIED ERROR MESSAGE", message);
				}
				ctx.waitUntil(
					fetch(mizuEndpoint, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							level,
							traceId,
							service,
							message,
							args,
							timestamp,
						}),
					}),
				);
				originalConsoleMethod.apply(originalConsoleMethod, [message, ...args]);
			};
		}
	},
};

