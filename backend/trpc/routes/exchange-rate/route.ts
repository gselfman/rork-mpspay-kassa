import { z } from 'zod';
import { publicProcedure } from '../../create-context';

// Cache for exchange rate
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 90 * 1000; // 90 seconds

/**
 * Fetch USDT/RUB rate from CoinGecko API
 */
async function fetchUSDTRate(): Promise<number> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=rub';
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Add API key if available
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.tether || !data.tether.rub) {
      throw new Error('Invalid response format from CoinGecko');
    }
    
    // Apply 1.03 coefficient as requested
    const baseRate = data.tether.rub;
    const clientRate = baseRate * 1.03;
    
    console.log(`CoinGecko rate: ${baseRate}, Client rate: ${clientRate}`);
    
    return clientRate;
  } catch (error) {
    console.error('Error fetching USDT rate:', error);
    throw error;
  }
}

/**
 * Get cached rate or fetch new one
 */
async function getExchangeRate(): Promise<number> {
  const now = Date.now();
  
  // Check if we have valid cached data
  if (cachedRate && (now - cachedRate.timestamp) < CACHE_DURATION) {
    console.log('Using cached exchange rate:', cachedRate.rate);
    return cachedRate.rate;
  }
  
  // Fetch new rate
  const rate = await fetchUSDTRate();
  
  // Update cache
  cachedRate = {
    rate,
    timestamp: now
  };
  
  return rate;
}

export const exchangeRateProcedure = publicProcedure
  .query(async () => {
    try {
      const rate = await getExchangeRate();
      
      return {
        success: true,
        rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Exchange rate procedure error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rate: null,
        timestamp: new Date().toISOString()
      };
    }
  });