import type { HonoBase } from "hono/hono-base";
import type { MiddlewareHandler, RouterRoute } from "hono/types";
import { getPath } from "hono/utils/url";
import { getTraceId, setTraceId } from "./stupid-trace";

const humanize = (times: string[]) => {
	const [delimiter, separator] = [",", "."];

	const orderTimes = times.map((v) =>
		// biome-ignore lint/style/useTemplate: copied from hono source
		v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter),
	);

	return orderTimes.join(separator);
};

const time = (start: number) => {
	const delta = Date.now() - start;
	return humanize([
		// biome-ignore lint/style/useTemplate: copied from hono source
		delta < 1000 ? delta + "ms" : Math.round(delta / 1000) + "s",
	]);
};

const colorStatus = (status: number) => {
	const colorEnabled = getColorEnabled();
	const out: { [key: string]: string } = {
		7: colorEnabled ? `\x1b[35m${status}\x1b[0m` : `${status}`,
		5: colorEnabled ? `\x1b[31m${status}\x1b[0m` : `${status}`,
		4: colorEnabled ? `\x1b[33m${status}\x1b[0m` : `${status}`,
		3: colorEnabled ? `\x1b[36m${status}\x1b[0m` : `${status}`,
		2: colorEnabled ? `\x1b[32m${status}\x1b[0m` : `${status}`,
		1: colorEnabled ? `\x1b[32m${status}\x1b[0m` : `${status}`,
		0: colorEnabled ? `\x1b[33m${status}\x1b[0m` : `${status}`,
	};

	const calculateStatus = (status / 100) | 0;

	return out[calculateStatus];
};

type PrintFunc = (str: string, ...rest: string[]) => void;

function logReq(
	fn: PrintFunc,
	method: string,
	path: string,
	env: Record<string, string>,
	params: Record<string, string>,
	query: Record<string, string>,
) {
	const out = {
		method,
		lifecycle: "request",
		path,
		env,
		params,
		query
	};

	// TODO - Add message here?
	fn(JSON.stringify(out));
}

function logRes(
	fn: PrintFunc,
	method: string,
	path: string,
	matchedPathPattern?: string,
	matchedPathHandler?: string,
	status = 0,
	elapsed?: string,
) {
	const out = {
		method,
		lifecycle: "response",
		path,
		route: matchedPathPattern,
		handler: matchedPathHandler,
		status: colorStatus(status),
		elapsed,
	};

	// TODO - Add message here?
	fn(JSON.stringify(out));
}

export const logger = (
	fn: PrintFunc = console.log,
	errFn: PrintFunc = console.error,
): MiddlewareHandler => {
	return async function logger(c, next) {
		// HACK - Set trace id, which is used in monkey patched console.* methods!
		setTraceId(c);

		const { method } = c.req;
		const path = getPath(c.req.raw);

		logReq(fn, method, path, c.env, c.req.param(), c.req.query);

		const start = Date.now();

		await next();

		const matchedPathPattern = c.req.routePath;
		console.log("MATCHED PATH ", matchedPathPattern);
		// app.use(async function logger(c, next) {
		// 	await next()
		// 	c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
		// 		const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
		// 		console.log(
		// 			method,
		// 			' ',
		// 			path,
		// 			' '.repeat(Math.max(10 - path.length, 0)),
		// 			name,
		// 			i === c.req.routeIndex ? '<- respond from here' : ''
		// 		)
		// 	})
		// })

		// HACK - We know this will match, so coerce the type to RouterRoute
		const matchedRoute: RouterRoute = c.req.matchedRoutes.find((route) => {
			return route.path === c.req.routePath
		}) as RouterRoute;

		const matchedPathHandler = matchedRoute?.handler;

		const handlerType = matchedPathHandler.length < 2 ? 'handler' :'middleware'
		console.log("MATCHED ROUTE HANDLER TYPE", handlerType);
		console.log("MATCHED ROUTE HANDLER ", matchedPathHandler);

		const loggerFn = c.res.status >= 400? errFn : fn;

		logRes(loggerFn, method, path, matchedPathPattern, matchedPathHandler?.toString(), c.res.status, time(start));
	};
};

function getColorEnabled(): boolean {
	return false;
	// return typeof process !== 'undefined' && process.stdout && process.stdout.isTTY;
}
