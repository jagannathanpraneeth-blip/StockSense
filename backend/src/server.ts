import express from 'express';
import { writeQueue } from './middleware/writeQueue';
import cors from 'cors';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const SQLiteStore = connectSqlite3(session);
const app = express();
app.disable('x-powered-by');

// Trust reverse proxy in production (for HTTPS, secure cookies, and client IP)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || '0'));

// CORS configuration (only needed in split dev mode)
app.use(
  cors({
    origin: config.corsOrigin || '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store with configurable storage path
const sessionDbDir = process.env.SESSION_DB_DIR || './';
const sessionDbName = process.env.SESSION_DB_NAME || 'sessions.sqlite';
fs.mkdirSync(sessionDbDir, { recursive: true });

app.use(
  session({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: new (SQLiteStore as any)({
      db: sessionDbName,
      dir: sessionDbDir,
      table: 'sessions',
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: config.sessionMaxAgeMs,
      httpOnly: true, // Mitigate XSS
      secure: config.nodeEnv === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
    },
  })
);

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Reject browser cross-origin writes, including login CSRF. Non-browser clients
// may omit Origin; session credentials still remain mandatory for business APIs.
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('sec-fetch-site') === 'cross-site' || (req.get('origin') && req.get('origin') !== config.corsOrigin)) {
      return res.status(403).json({ success: false, message: 'Untrusted request origin' });
    }
  }
  next();
});
app.use('/api', writeQueue, apiRouter);

// Unknown API routes MUST return JSON 404 (never HTML fallback)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found`,
  });
});

// Single-Origin Static Frontend Serving (in production or when dist exists)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback for non-API client routes
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Dev info endpoint when frontend is running separately
  app.get('/', (req, res) => {
    res.json({
      name: 'StockSense API',
      status: 'online',
      stage: 'Stage 4',
      health: '/api/health',
    });
  });
}

// Centralized error handler
app.use(errorHandler);

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port;
const server = app.listen(port, () => {
  console.log(`🚀 StockSense Backend running at http://localhost:${port}`);
  console.log(`🩺 Health check available at http://localhost:${port}/api/health`);
});

export default app;
