import { router } from './create-context';
import { exchangeRateQuery } from './routes/exchange-rate/route';

export const appRouter = router({
  exchangeRate: exchangeRateQuery,
});

export type AppRouter = typeof appRouter;