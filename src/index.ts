import { handleRequest } from './handler';
import { UpdateCurrentlyReading } from './handlers/currentlyreading';

export interface Env {
	//This will be auto-populated with the KV Namespace that is bound in the wrangler.toml
	//and exposes all the methods you'll need (get, put, list etc.)
	BOOKS: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env) {
		return handleRequest(request, env);
	},
	async get(request: Request, env: Env) {
		return handleRequest(request, env);
	},
	async scheduled(event: Request, env: Env, ctx : ExecutionContext) {
		ctx.waitUntil(UpdateCurrentlyReading(env));
	}
};
