import { handleRequest } from "./handler";

export default {
	async fetch(request: Request) {
		return handleRequest(request);
	},
	async get(request: Request) {
		return handleRequest(request);
	},
};
