import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const SQLiteStore = connectSqlite3(session);
const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: new (SQLiteStore as any)({
    db: 'dev.db',
    dir: './',
    table: 'sessions', // Default, creates table if missing
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    maxAge: config.sessionMaxAgeMs,
    httpOnly: true, // Prevent XSS access to cookie
    secure: config.nodeEnv === 'production', // true in production
    sameSite: 'lax', // Protect against CSRF
  },
}));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// API Routes
app.use('/api', apiRouter);

// Root fallback / info
app.get('/', (req, res) => {
  res.json({
    name: 'StockSense API',
    status: 'online',
    stage: 'Stage 2',
    health: '/api/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found`,
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 StockSense Backend running at http://localhost:${config.port}`);
  console.log(`🩺 Health check available at http://localhost:${config.port}/api/health`);
});

export default app;
