import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import usersRouter from './routes/users';
import chatRouter from './routes/chat';
import { db } from './db';
import { initializeWebSocketService } from './services/websocketService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket service
const wsService = initializeWebSocketService(server);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
})); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        websocket: 'enabled'
    });
});

// API routes
app.get('/api', (req, res) => {
    res.json({
        message: 'Chat Backend API',
        version: '1.0.0',
        features: ['REST API', 'WebSocket', 'OpenAI Streaming'],
        endpoints: {
            health: '/health',
            api: '/api',
            users: '/api/users',
            chat: '/api/chat',
            websocket: 'ws://localhost:' + PORT
        }
    });
});

// Mount routes
app.use('/api/users', usersRouter);
app.use('/api/chat', chatRouter);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
if (require.main === module) {
    server.listen(PORT, async () => {
        try {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🔌 WebSocket server ready`);
            console.log(`🤖 OpenAI integration enabled`);
        } catch (error) {
            console.error('Error connecting to database:', error);
            process.exit(1);
        }
    });
}

export default app; 