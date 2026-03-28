import { initTRPC } from '@trpc/server';

export interface TRPCContext {
  // Add context properties here if needed
}

// Create context function for tRPC
export const createContext = () => {
  return {} as TRPCContext;
};

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; // Add middleware here if needed
export const procedure = t.procedure; // Export procedure as well for compatibility