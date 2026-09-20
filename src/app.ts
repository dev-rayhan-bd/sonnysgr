import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import helmet from 'helmet';
import router from './app/routes/index';
import docsRouter from './app/docs/docs.routes';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import mongoSanitizeMiddleware from './app/middleware/mongosanitize';
import { globalLimiter } from './app/middleware/rateLimiter';
import { orderPaymentWebhookRouter } from './app/modules/OrderPayment/OrderPayment.routes';

const app: Application = express();

// --- CRITICAL FOR PROXY / NGINX / AWS ---
app.set('trust proxy', 1);

// --- HIGH SECURITY MIDDLEWARES ---
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(mongoSanitizeMiddleware);

// --- STRIPE WEBHOOK (BEFORE express.json) ---
app.use('/api/v1/order-payment/webhook', orderPaymentWebhookRouter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle JSON parse errors gracefully
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err && (err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  } else {
    next(err);
  }
});

app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);

// --- RATE LIMITING ---
app.use('/api/v1', globalLimiter);

// --- TEST IP ENDPOINT ---
app.get('/api/v1/test-ip', (req: Request, res: Response) => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const clientIp = xForwardedFor
    ? (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress;

  res.json({
    success: true,
    message: 'Client IP Details',
    data: {
      reqIp: req.ip,
      clientIp: clientIp,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      xRealIp: req.headers['x-real-ip'] || null,
    },
  });
});

// --- API DOCUMENTATION (REDOCLY) ---
app.use('/docs', docsRouter);
app.use('/api/v1/docs', docsRouter);

// --- APPLICATION ROUTES ---
app.use('/api/v1', router);

// Root Health Endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Sneaker Hub - Server is Breathing...');
});

// --- GLOBAL ERROR & NOT FOUND ---
app.use(globalErrorHandler);
app.use(notFound);

export default app;
