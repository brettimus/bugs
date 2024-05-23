import type { MiddlewareHandler, RouterRoute } from "hono/types";
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

function logReq(
	fn: PrintFunc,
	method: string,
	headers: Record<string, string>,
	path: string,
	env: Record<string, string>,
	params: Record<string, string>,
	query: Record<string, string>,
	file?: string | null
) {
	const out = {
		lifecycle: "request",
		method,
		headers,
		path,
		env,
		params,
		query,
		file,
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
	handlerType?: string,
	status = 0,
	headers?: Record<string, string>,
	body?: string,
	elapsed?: string,
) {
	const out = {
		method,
		lifecycle: "response",
		path,
		route: matchedPathPattern,
		handler: matchedPathHandler,
		handlerType, // Unsure if this is useful... or how
		status: colorStatus(status),
		headers,
		body,
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
		const stack = new Error().stack;
		const file = getFileFromStackTrace(stack ?? "");
		// TODO - parse file from stack
		const { method } = c.req;
		const path = getPath(c.req.raw);

		const reqHeaders: Record<string, string> = {}
		c.req.raw.headers.forEach((value, key) => {
			reqHeaders[key] = value;
		})

		logReq(fn, method, reqHeaders, path, c.env, c.req.param(), c.req.query, file);

		const start = Date.now();

		await next();

		const matchedPathPattern = c.req.routePath;

		// HACK - We know this will match, so coerce the type to RouterRoute
		const matchedRoute: RouterRoute = c.req.matchedRoutes.find((route) => {
			return route.path === c.req.routePath
		}) as RouterRoute;

		const matchedPathHandler = matchedRoute?.handler;

		const handlerType = matchedPathHandler.length < 2 ? 'handler' :'middleware'


		// Clone the response so the original isn't affected
  	const clonedResponse = c.res.clone();

		const resHeaders: Record<string, string> = {}
		c.res.headers.forEach((value, key) => {
			resHeaders[key] = value;
		})

		// Use text() to read the body. This does not affect the original response.
		let body: string;
		try {
			// TODO - Read based off of content-type header
			body = await clonedResponse.text()
		} catch (error) {
			// TODO - Check when this fails
			console.error('Error reading response body:', error);
			body = "__COULD_NOT_PARSE_BODY__";
		}

		const loggerFn = c.res.status >= 400? errFn : fn;

		logRes(loggerFn, method, path, matchedPathPattern, matchedPathHandler?.toString(), handlerType, c.res.status, resHeaders, body, time(start));
	};
};

function getColorEnabled(): boolean {
	return false;
	// return typeof process !== 'undefined' && process.stdout && process.stdout.isTTY;
}

function getFileFromStackTrace(stack: string) {
	// Regular expression to match the pattern "file://path:line:column"
	const regex = /file:\/\/(\/[\w\-. /]+):(\d+):(\d+)/;

	// Attempt to match the regex pattern against the provided stack trace
	const match = stack.match(regex);

	if (match) {
		// if (stack.includes("neon")) {
		//   debugger
		// }
		// Extract the file path, line, and column from the regex match
		const [, source] = match;
		return source
	}

	// Return null or throw an error if no match is found
	return null;
}