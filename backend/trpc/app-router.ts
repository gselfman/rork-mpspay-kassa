import { initTRPC } from '@trpc/server';
import { TRPCContext } from './create-context';
import { z } from 'zod';

// Initialize tRPC
const t = initTRPC.context<TRPCContext>().create();

// Create a router
export const appRouter = t.router({
  // Example procedure
  hello: t.procedure
    .query(() => {
      return {
        greeting: 'Hello from tRPC backend!'
      };
    }),
  
  // Add more procedures here
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;