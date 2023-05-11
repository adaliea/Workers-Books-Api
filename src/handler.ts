import { Router } from 'itty-router';

import CurrentlyReading from './handlers/currentlyreading';

const router = Router();

router
  .get('/currentlyreading', CurrentlyReading)
  .get('*', () => new Response('Not found', { status: 404 }));

export const handleRequest = request => router.handle(request);