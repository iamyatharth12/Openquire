import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createSupabaseContext } from '@supabase/server';
import { getActiveSearchProvider } from './src/services/search/index.ts';
import { retrieveBatchSources } from './src/server/sourceRetriever.ts';

dotenv.config();

// Strictly enforce intended Supabase project: nfyrssyydowzsyicxkzn
const INTENDED_SUPABASE_PROJECT = 'nfyrssyydowzsyicxkzn';
const INTENDED_SUPABASE_URL = 'https://nfyrssyydowzsyicxkzn.supabase.co';
const INTENDED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wKb2gan2Bs0YTfYcPri6tA_xKUU5fET';
const INTENDED_SUPABASE_JWKS_URL = 'https://nfyrssyydowzsyicxkzn.supabase.co/auth/v1/.well-known/jwks.json';

// Normalize all backend & frontend Supabase environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.includes(INTENDED_SUPABASE_PROJECT)) {
  process.env.SUPABASE_URL = INTENDED_SUPABASE_URL;
}
if (!process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY.includes('vfbzmpocffggmznjsabo')) {
  process.env.SUPABASE_PUBLISHABLE_KEY = INTENDED_SUPABASE_PUBLISHABLE_KEY;
}
if (!process.env.SUPABASE_JWKS_URL || !process.env.SUPABASE_JWKS_URL.includes(INTENDED_SUPABASE_PROJECT)) {
  process.env.SUPABASE_JWKS_URL = INTENDED_SUPABASE_JWKS_URL;
}
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_URL.includes(INTENDED_SUPABASE_PROJECT)) {
  process.env.VITE_SUPABASE_URL = INTENDED_SUPABASE_URL;
}
// Overwrite any legacy anon key (such as JWTs containing obsolete project ref vfbzmpocffggmznjsabo)
if (
  !process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY.includes('vfbzmpocffggmznjsabo') ||
  process.env.VITE_SUPABASE_ANON_KEY.startsWith('eyJ')
) {
  process.env.VITE_SUPABASE_ANON_KEY = INTENDED_SUPABASE_PUBLISHABLE_KEY;
}
if (process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.includes('-4qrVZxvhvyk')) {
  delete process.env.SUPABASE_SECRET_KEY;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Request limits & body parsing
  app.use(express.json({ limit: '256kb' }));

  // Request logger (redacting sensitive headers/keys)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api/')) {
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // =========================================================================
  // API ROUTE 1: Search Endpoint (/api/search)
  // =========================================================================
  app.post('/api/search', async (req, res) => {
    try {
      const { query, limit, language } = req.body || {};

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required and cannot be empty.' });
      }

      if (query.length > 300) {
        return res.status(400).json({ error: 'Query exceeds maximum length of 300 characters.' });
      }

      const safeLimit = Math.min(Math.max(parseInt(limit || '6', 10), 1), 15);
      const searchProvider = getActiveSearchProvider();

      const searchResult = await searchProvider.search(query.trim(), {
        limit: safeLimit,
        language: typeof language === 'string' ? language : undefined,
      });

      return res.json(searchResult);
    } catch (err: any) {
      console.error('[Search Error]', err.message);
      return res.status(502).json({
        error: err.message || 'Failed to retrieve search results.',
      });
    }
  });

  // =========================================================================
  // API ROUTE 2: Bounded Safe Source Retrieval Endpoint (/api/retrieve-sources)
  // =========================================================================
  app.post('/api/retrieve-sources', async (req, res) => {
    try {
      const { urls } = req.body || {};

      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Array of URLs is required.' });
      }

      // Maximum 5 URLs per batch request to prevent abuse
      const safeUrls = urls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .slice(0, 5);

      const retrievedSources = await retrieveBatchSources(safeUrls, 3);
      return res.json({ sources: retrievedSources });
    } catch (err: any) {
      console.error('[Retrieval Error]', err.message);
      return res.status(500).json({
        error: err.message || 'Failed to process source retrievals.',
      });
    }
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Openquire Research Engine',
      supabase: Boolean(process.env.SUPABASE_URL),
    });
  });

  // =========================================================================
  // API ROUTE 3: Supabase User Verification (/api/auth/verify) via @supabase/server
  // =========================================================================
  app.get('/api/auth/verify', async (req, res) => {
    try {
      if (!process.env.SUPABASE_URL) {
        return res.status(503).json({
          authenticated: false,
          error: 'Supabase server is not configured. Set SUPABASE_URL and keys.',
        });
      }

      // Convert Express request to standard Web Request for @supabase/server
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        }
      }

      const standardReq = new Request(fullUrl, {
        method: req.method,
        headers,
      });

      const { data: ctx, error } = await createSupabaseContext(standardReq, {
        auth: 'user',
      });

      if (error) {
        return res.status(error.status || 401).json({
          authenticated: false,
          code: error.code,
          message: error.message,
        });
      }

      return res.json({
        authenticated: true,
        user: ctx?.userClaims || null,
        authMode: ctx?.authMode,
      });
    } catch (err: any) {
      console.error('[Supabase Auth Error]', err);
      return res.status(500).json({
        authenticated: false,
        error: err.message || 'Internal user verification failure',
      });
    }
  });

  // =========================================================================
  // Vite Dev Middleware / Static Production Assets
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Openquire server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
