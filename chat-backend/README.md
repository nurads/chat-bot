# Chat Backend

Express.js server with TypeScript and Drizzle ORM using PostgreSQL.

## Features

- 🚀 Express.js with TypeScript
- 🗄️ Drizzle ORM with PostgreSQL
- 🔒 Security middleware (Helmet, CORS)
- 📝 Request logging (Morgan)
- 🔄 Hot reload in development (Nodemon)
- 🏗️ Type-safe database operations

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL database credentials
   ```

3. **Set up the database:**
   ```bash
   # Generate migration files
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API information
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user

## Database Schema

The application includes three main tables:
- **users** - User accounts
- **conversations** - Chat conversations
- **messages** - Individual messages in conversations

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `password` |
| `DB_NAME` | PostgreSQL database name | `chatbot` | 