import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// tRPC endpoint - Fixed URL to match client
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  onError({ error }) {
    console.error('tRPC error:', error);
  }
}));

export default app;