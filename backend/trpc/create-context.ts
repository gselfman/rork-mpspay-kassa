import { Context } from 'hono';

export interface TRPCContext {
  req: Request;
  honoContext: Context;
}

export const createContext = (honoContext: Context): TRPCContext => {
  return {
    req: honoContext.req,
    honoContext
  };
};