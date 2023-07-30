import { RequestLike, Router } from 'itty-router';

import { Env } from '.';
import { CurrentlyReading, UpdateCurrentlyReading } from './handlers/currentlyreading';
import { Read } from './handlers/read';
import { BestEdition, EditBestEdition } from './handlers/bestedition';
import { CurrentlyReadingPageCounts } from './handlers/currentlyReadingPageCounts';

const router = Router();

router
	.get('/currentlyreading', CurrentlyReading)
	.get('/read', Read)
	.get('/bestedition/edit', EditBestEdition)
	.get('/bestedition/*', BestEdition)
	.get('/updateProgress', CurrentlyReadingPageCounts)
	.get('*', () => new Response('Not found', { status: 404 }));

export const handleRequest = (request: Request, env: Env) => router.handle(request, env);
