export const RECORDED_CONSOLE_METHODS = [
	"debug",
	"error",
	"info",
	"log",
	"warn",
] as const;

export type ExtendedExecutionContext = ExecutionContext & {
	__waitUntilTimer?: ReturnType<typeof setInterval>;
	__waitUntilPromises?: Promise<void>[];
	waitUntilFinished?: () => Promise<void>;
};

type MizuEnv = {
	MIZU_ENDPOINT: string;
};

export const Mizu = {
	init: (
		request: Request,
		{ MIZU_ENDPOINT: mizuEndpoint }: MizuEnv,
		ctx: ExecutionContext,
		service?: string,
	) => {
		// @NOTE - Probably not necessary for cloudflare workers
		// https://github.com/highlight/highlight/pull/6480
		polyfillWaitUntil(ctx);

		// Monkeypatch console.log because it's the only way to send consumable logs locally without setting up an otel colletor
		for (const m of RECORDED_CONSOLE_METHODS) {
			const originalConsoleMethod = console[m];

			console[m] = (message: string, ...args: unknown[]) => {
				// sdk.logger[m].apply(sdk.logger, [message, ...args]);
				ctx.waitUntil(
					fetch(mizuEndpoint, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							service,
							// NOTE - mizu service expects valid json
							message,
							args,
						}),
					}),
				);
				originalConsoleMethod.apply(originalConsoleMethod, [message, ...args]);
			};
		}
	},
};

function polyfillWaitUntil(ctx: ExtendedExecutionContext) {
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
