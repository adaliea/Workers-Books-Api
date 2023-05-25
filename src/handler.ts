import { RequestLike, Router } from 'itty-router';

import { Env } from '.';
import { CurrentlyReading } from './handlers/currentlyreading';
import {Read} from './handlers/read';
import { BestEdition, EditBestEdition } from './handlers/bestedition';

const router = Router();

router
	.get('/currentlyreading', CurrentlyReading)
	.get('/read', Read)
	.get('/bestedition/edit', EditBestEdition)
	.get('/bestedition/*', BestEdition)
	.get('*', () => new Response('Not found', { status: 404 }));

export const handleRequest = (request: Request, env: Env) => router.handle(request, env);
