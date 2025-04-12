import { RequestLike, Router } from 'itty-router';

import { Env } from '.';
import { CurrentlyReading, UpdateCurrentlyReading } from './handlers/currentlyreading';
import { Read } from './handlers/read';
import { CurrentlyReadingPageCounts } from './handlers/currentlyReadingPageCounts';
import { getHomepageInfo } from './handlers/homepageInfo';

const router = Router();

router
	.get('/currentlyreading', CurrentlyReading)
	.get('/homepageinfo', getHomepageInfo)
	.get('/read', Read)
	.get('/updateProgress', CurrentlyReadingPageCounts)
	.get('*', () => new Response('Not found', { status: 404 }));

export const handleRequest = (request: Request, env: Env) => router.handle(request, env);
