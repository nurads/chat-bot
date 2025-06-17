# 🐳 Docker Deployment Guide

This guide explains how to deploy the Chat Bot application using Docker and Docker Compose.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd chat-bot
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - **Frontend:** http://localhost:8080
   - **Backend API:** http://localhost:3001
   - **Database:** localhost:5480
   - **Redis:** localhost:6380

## 🏗️ Architecture

The application consists of four main services:

### 🎯 **Frontend Service (`chat-frontend`)**
- **Technology:** React + TypeScript + Vite
- **Server:** Nginx (Alpine)
- **Port:** 8080
- **Features:**
  - Multi-stage build for optimized image size
  - Nginx with SPA routing support
  - Gzip compression and caching
  - Security headers
  - API and WebSocket proxying

### ⚙️ **Backend Service (`chat-backend`)**
- **Technology:** Node.js + Express + TypeScript
- **Port:** 3001
- **Features:**
  - Multi-stage build
  - Non-root user for security
  - Health checks
  - Socket.IO for real-time communication
  - JWT authentication

### 🗄️ **Database Service (`pg`)**
- **Technology:** PostgreSQL (Alpine)
- **Port:** 5480
- **Features:**
  - Persistent data storage
  - Health checks
  - Auto-initialization with schema

### 🔴 **Cache Service (`redis`)**
- **Technology:** Redis (Alpine)
- **Port:** 6380
- **Features:**
  - Session storage
  - Caching layer
  - Health checks

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key-here

# Optional (defaults provided)
POSTGRES_USER=bita-dev
POSTGRES_PASSWORD=bita-dev-admin
POSTGRES_DB=test-db
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:8080
```

### Port Configuration

Default ports can be changed in `docker-compose.yml`:

```yaml
services:
  chat-frontend:
    ports:
      - "8080:8080"  # Change first port for external access
  chat-backend:
    ports:
      - "3001:3001"
  pg:
    ports:
      - "5480:5432"
  redis:
    ports:
      - "6380:6379"
```

## 🛠️ Development Commands

### Start all services:
```bash
docker-compose up
```

### Start in background:
```bash
docker-compose up -d
```

### Rebuild specific service:
```bash
docker-compose up --build chat-frontend
docker-compose up --build chat-backend
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f chat-frontend
docker-compose logs -f chat-backend
```

### Stop all services:
```bash
docker-compose down
```

### Stop and remove volumes:
```bash
docker-compose down -v
```

## 🔍 Health Checks

All services include health checks:

### Check service status:
```bash
docker-compose ps
```

### Manual health checks:
```bash
# Frontend
curl http://localhost:8080/health

# Backend
curl http://localhost:3001/health

# Database
docker-compose exec pg pg_isready -U bita-dev -d test-db

# Redis
docker-compose exec redis redis-cli ping
```

## 📊 Monitoring & Logs

### Container Stats:
```bash
docker stats
```

### Service Logs:
```bash
# Real-time logs
docker-compose logs -f --tail=100

# Specific service logs
docker-compose logs chat-backend
docker-compose logs chat-frontend
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port conflicts:**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :8080
   netstat -tulpn | grep :3001
   ```

2. **Build failures:**
   ```bash
   # Clean rebuild
   docker-compose down
   docker system prune -f
   docker-compose up --build --force-recreate
   ```

3. **Database connection issues:**
   ```bash
   # Check database logs
   docker-compose logs pg
   
   # Connect to database
   docker-compose exec pg psql -U bita-dev -d test-db
   ```

4. **Frontend not loading:**
   ```bash
   # Check nginx logs
   docker-compose logs chat-frontend
   
   # Verify build output
   docker-compose exec chat-frontend ls -la /usr/share/nginx/html
   ```

### Reset Everything:
```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all containers and images
docker system prune -a -f

# Rebuild from scratch
docker-compose up --build
```

## 🔒 Security Notes

- All services run as non-root users
- Security headers configured in Nginx
- Rate limiting enabled
- Environment variables for sensitive data
- Database and Redis not exposed publicly (only through docker network)

## 📈 Performance Optimization

### Frontend:
- Nginx gzip compression enabled
- Static asset caching (1 year)
- Multi-stage build reduces image size
- Asset optimization through Vite

### Backend:
- Multi-stage build with production dependencies only
- Health checks for service reliability
- Redis caching layer
- Connection pooling with PostgreSQL

## 🌐 Production Deployment

For production deployment:

1. **Use environment-specific configurations:**
   ```bash
   cp .env.example .env.production
   # Configure production values
   ```

2. **Use production compose file:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Enable SSL/TLS** (add reverse proxy like Traefik or nginx-proxy)

4. **Set up monitoring** (Prometheus, Grafana, etc.)

5. **Configure backups** for PostgreSQL data

## 📝 Additional Notes

- All services are connected through a custom Docker network (`chat-network`)
- Data persistence is handled through Docker volumes
- Hot reloading is not enabled in Docker (use local development for that)
- Database migrations are handled automatically on startup
- Frontend routing is handled by Nginx for SPA support

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions 