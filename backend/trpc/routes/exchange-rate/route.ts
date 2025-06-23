import { z } from 'zod';
import { procedure } from '../../create-context';

// Cache for exchange rate
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

export const exchangeRateQuery = procedure
  .query(async () => {
    try {
      // Check if we have cached data that's still valid
      if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
        return {
          success: true,
          rate: cachedRate.rate,
          timestamp: new Date(cachedRate.timestamp).toISOString()
        };
      }

      // Get API key from environment
      const apiKey = process.env.COINGECKO_API_KEY;
      if (!apiKey) {
        console.error('COINGECKO_API_KEY not found in environment variables');
        return {
          success: false,
          rate: null,
          timestamp: new Date().toISOString(),
          error: 'API key not configured'
        };
      }

      // Fetch exchange rate from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=rub&x_cg_demo_api_key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('CoinGecko API error:', response.status, response.statusText);
        return {
          success: false,
          rate: null,
          timestamp: new Date().toISOString(),
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json();
      
      if (!data.tether || !data.tether.rub) {
        console.error('Invalid response format from CoinGecko:', data);
        return {
          success: false,
          rate: null,
          timestamp: new Date().toISOString(),
          error: 'Invalid response format'
        };
      }

      // Apply 1.03 multiplier to the rate
      const baseRate = data.tether.rub;
      const finalRate = baseRate * 1.03;

      // Cache the result
      cachedRate = {
        rate: finalRate,
        timestamp: Date.now()
      };

      console.log(`Exchange rate fetched: ${baseRate} -> ${finalRate} (with 1.03 multiplier)`);

      return {
        success: true,
        rate: finalRate,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return {
        success: false,
        rate: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });