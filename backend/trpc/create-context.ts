import { initTRPC } from '@trpc/server';

export interface TRPCContext {
  // Add context properties here if needed
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; // Add middleware here if needed