import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import receivingRoutes from './routes/receiving.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';

export const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint (Directly at /health as requested)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// Product Routes
app.use('/api/products', productRoutes);
app.use('/api/v1/products', productRoutes);

// Receiving Routes
// Supports both /api/receivings and /api/v1/receiving-documents
app.use('/api/receivings', receivingRoutes);
app.use('/api/v1/receiving-documents', receivingRoutes);

// Inventory & Audit Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// Dashboard Operational Stats
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// 404 Handler
app.use((_req, _res, next) => {
  next(new NotFoundError('The requested endpoint does not exist'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);
