import { handleRequest } from './handler';
import { UpdateCurrentlyReading } from './handlers/currentlyreading';
import { UpdateRead } from './handlers/read';
import { updateHomepageInfo } from './handlers/homepageInfo';

export interface Env {
	//This will be auto-populated with the KV Namespace that is bound in the wrangler.toml
	//and exposes all the methods you'll need (get, put, list etc.)
	BOOKS: KVNamespace;
	GOOGLE_API_KEY: string;
	LAST_FM_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {
		return handleRequest(request, env);
	},
	async get(request: Request, env: Env) {
		return handleRequest(request, env);
	},
	async scheduled(event: Request, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(UpdateRead(env));
		// ctx.waitUntil(UpdateCurrentlyReading(env));
		ctx.waitUntil(updateHomepageInfo(env))
	},
};
