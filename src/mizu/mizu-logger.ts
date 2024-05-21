import type { HonoBase } from "hono/hono-base";
import type { MiddlewareHandler } from "hono/types";
import { getPath } from "hono/utils/url";

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

function log(
	fn: PrintFunc,
	lifecycle: "request" | "response",
	method: string,
	path: string,
	// NOTE - only matches for response right now
	matchedPathPattern?: string,
  matchedPathHandler?: string,
	status = 0,
	elapsed?: string,
) {
	const out = {
		method,
		lifecycle,
		path,
		route: matchedPathPattern,
    handler: matchedPathHandler,
		status: colorStatus(status),
		elapsed,
	};
	fn(JSON.stringify(out));
}

export const logger = (
	app: { router: HonoBase["router"] },
	fn: PrintFunc = console.log,
): MiddlewareHandler => {
	return async function logger(c, next) {
		const { method } = c.req;
		const path = getPath(c.req.raw);

		log(fn, "request", method, path);

		const start = Date.now();

		await next();

		// Code to get the path *pattern* that was matched
		//
		// THIS IS BASED OFF OF SOURCE CODE OF HONO
		const routerMatchFoResponse = app.router.match(c.req.method, c.req.path);
		const matchedPathFromRouter = routerMatchFoResponse[0].map(
			([[, route]]) => route,
		)[c.req.routeIndex];

    const matchedPathPattern = matchedPathFromRouter.path;
    const matchedPathHandler = matchedPathFromRouter.handler.toString();
		
		log(fn, "response", method, path, matchedPathPattern, matchedPathHandler, c.res.status, time(start));
	};
};

function getColorEnabled(): boolean {
	return false;
	// return typeof process !== 'undefined' && process.stdout && process.stdout.isTTY;
}
