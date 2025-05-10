import { Router } from 'itty-router';
import { OracleKeeperService } from './service';
import type { Env } from './types';

// Create router
const router = Router();

// Create response headers with CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Helper to create JSON response
const jsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
};

// Handle OPTIONS requests (CORS preflight)
router.options('*', () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
});

// Health check endpoint
router.get('/health', async (request, env: Env) => {
  const service = new OracleKeeperService(env);
  const health = await service.getHealth();
  return jsonResponse(health);
});

// Metrics endpoint
router.get('/metrics', async (request, env: Env) => {
  const service = new OracleKeeperService(env);
  const metrics = await service.getMetrics();
  return jsonResponse(metrics);
});

// Get all prices
router.get('/prices', async (request, env: Env) => {
  const service = new OracleKeeperService(env);
  const prices = await service.getPrices();
  return jsonResponse(prices);
});

// Get price for specific token
router.get('/price/:symbol', async (request, env: Env) => {
  const { symbol } = request.params || {};
  
  if (!symbol) {
    return jsonResponse({ error: 'Symbol is required' }, 400);
  }
  
  const service = new OracleKeeperService(env);
  const price = await service.getPrice(symbol);
  
  if (!price) {
    return jsonResponse({
      error: `Price for ${symbol} not available or symbol not supported`,
      supportedTokens: env.SUPPORTED_TOKENS.split(','),
      timestamp: new Date().toISOString()
    }, 404);
  }
  
  return jsonResponse(price);
});

// 404 handler
router.all('*', () => {
  return jsonResponse({
    error: 'Not found',
    endpoints: ['/health', '/metrics', '/prices', '/price/:symbol']
  }, 404);
});

// Event handlers
export default {
  // Handle fetch events (HTTP requests)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
  
  // Handle scheduled events (cron)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(async () => {
      const service = new OracleKeeperService(env);
      await service.updatePriceCache();
    }());
  }
};
