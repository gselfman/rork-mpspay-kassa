import { router } from './create-context';
import { exchangeRateProcedure } from './routes/exchange-rate/route';

export const appRouter = router({
  exchangeRate: exchangeRateProcedure,
});

export type AppRouter = typeof appRouter;