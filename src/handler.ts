import { RequestLike, Router } from 'itty-router';

import { Env } from '.';
import { CurrentlyReading } from './handlers/currentlyreading';

const router = Router();

router
  .get('/currentlyreading', CurrentlyReading)
  .get('*', () => new Response('Not found', { status: 404 }));

export const handleRequest = (request: Request, env : Env) => router.handle(request, env);