# 🤖 AI Chat Bot Application

A modern, full-stack AI chat application built with React, Node.js, and OpenAI. Features real-time messaging, user authentication, conversation management, and a beautiful, responsive UI.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Local Development Setup](#-local-development-setup)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 **Authentication & User Management**
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Session persistence with localStorage
- Secure logout functionality

### 💬 **Real-time Chat Interface**
- WebSocket-based real-time messaging using Socket.IO
- Multiple AI model selection (GPT-4, GPT-3.5, Claude)
- Streaming AI responses with typing indicators
- Message history and conversation persistence
- Auto-conversation creation on first message

### 🎨 **Modern UI/UX**
- Beautiful gradient backgrounds and glass morphism effects
- Responsive design for all screen sizes
- Dark theme sidebar with conversation management
- Quick prompt cards for common tasks
- Smooth animations and hover effects
- Model selection with visual indicators

### 📁 **Conversation Management**
- Create, view, and delete conversations
- Conversation titles based on first message
- Persistent conversation history
- Sidebar navigation between conversations
- Real-time conversation updates

### 🔧 **Developer Experience**
- TypeScript for type safety
- Hot reload in development
- Comprehensive error handling
- Debug logging and monitoring
- Docker support for easy deployment

## 🏗️ Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │   OpenAI API    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (AI Service)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        
         │                        │                        
┌─────────────────┐    ┌─────────────────┐              
│     Nginx       │    │   PostgreSQL    │              
│  (Production)   │    │   (Database)    │              
└─────────────────┘    └─────────────────┘              
         │                                     
         │                                    
┌─────────────────┐                 
│     Docker      │                  
│  (Container)    │              
└─────────────────┘                
```

### **Communication Flow:**

1. **Client ↔ Server:** RESTful APIs for CRUD operations
2. **Client ↔ Server:** WebSocket (Socket.IO) for real-time messaging
3. **Server ↔ Database:** Drizzle ORM for database operations
4. **Server ↔ OpenAI:** HTTP requests for AI responses
5. **Server ↔ Redis:** Session storage and caching

## 🛠️ Tech Stack

### **Frontend (`chat-frontend/`)**
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite for fast development and optimized builds
- **Styling:** Tailwind CSS with custom components
- **Routing:** React Router for SPA navigation
- **State Management:** React Context for global state
- **Real-time:** Socket.IO Client for WebSocket communication
- **UI Components:** Custom components with Radix UI primitives
- **Icons:** Lucide React for modern icons

### **Backend (`chat-backend/`)**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js for REST API
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** JWT tokens with bcrypt password hashing
- **Real-time:** Socket.IO for WebSocket server
- **AI Integration:** OpenAI API for chat completions
- **Caching:** Redis for session storage
- **Security:** Helmet, CORS, and rate limiting

### **Database Schema**
```sql
-- Users table
users (
  id: string (primary key)
  name: string
  email: string (unique)
  password_hash: string
  created_at: timestamp
  updated_at: timestamp
)

-- Conversations table
conversations (
  id: string (primary key)
  title: string
  user_id: string (foreign key)
  created_at: timestamp
  updated_at: timestamp
)

-- Messages table
messages (
  id: string (primary key)
  content: text
  role: enum ('user', 'assistant')
  conversation_id: string (foreign key)
  created_at: timestamp
)
```

## 📋 Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **PostgreSQL:** 14.x or higher
- **Redis:** 6.x or higher (optional, for caching)
- **OpenAI API Key:** Required for AI functionality

## 🚀 Local Development Setup

### **1. Clone the Repository**
```bash
git clone git@github.com:nurads/chat-bot.git
cd chat-bot
```

### **2. Backend Setup**
```bash
# Navigate to backend directory
cd chat-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your configuration:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Random secure string
# - OPENAI_API_KEY: Your OpenAI API key
# - REDIS_URL: Redis connection string (optional)

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

**Backend Environment Variables (.env):**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/chatbot_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key-here
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
```

### **3. Frontend Setup**
```bash
# Navigate to frontend directory (new terminal)
cd chat-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your configuration
# Start development server
npm run dev
```

**Frontend Environment Variables (.env):**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

### **4. Database Setup**
```bash
# Create PostgreSQL database
createdb chatbot_db

# Or using psql
psql -c "CREATE DATABASE chatbot_db;"

# Run migrations (from backend directory)
npm run db:push
```

### **5. Access the Application**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432

## 🐳 Docker Deployment

For production deployment using Docker, see the [Docker README](./DOCKER_README.md) for detailed instructions.

**Quick Docker Start:**
```bash
# Set up environment
cp .env.example .env
# Edit .env with your values

# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:8080
# Backend: http://localhost:3001
```

## 📚 API Documentation

### **Authentication Endpoints**
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/logout      # User logout
GET  /api/auth/me          # Get current user
```

### **Conversation Endpoints**
```
GET    /api/chat/c                    # Get user conversations
POST   /api/chat/c                    # Create new conversation
GET    /api/chat/c/:id                # Get conversation details
DELETE /api/chat/c/:id                # Delete conversation
GET    /api/chat/c/:id/messages       # Get conversation messages
```

### **WebSocket Events**
```
# Client → Server
'join_conversation'     # Join conversation room
'leave_conversation'    # Leave conversation room
'send_message'          # Send chat message

# Server → Client
'message_received'      # New message received
'ai_response_chunk'     # Streaming AI response
'ai_response_complete'  # AI response finished
'ai_typing'             # AI typing status
'error'                 # Error occurred
```

## 📁 Project Structure

```
chat-bot/
├── chat-frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   ├── AuthPage.tsx     # Authentication page
│   │   │   ├── ChatArea.tsx     # Main chat interface
│   │   │   ├── ChatLayout.tsx   # Layout component
│   │   │   └── Sidebar.tsx      # Conversation sidebar
│   │   ├── contexts/            # React contexts
│   │   │   ├── AuthContext.tsx  # Authentication state
│   │   │   └── ChatContext.tsx  # Chat state management
│   │   ├── services/            # API and socket services
│   │   │   └── socketService.ts # Socket.IO client
│   │   ├── App.tsx              # Main app component
│   │   └── main.tsx             # Application entry point
│   ├── public/                  # Static assets
│   ├── Dockerfile               # Frontend Docker configuration
│   ├── nginx.conf               # Nginx configuration
│   ├── package.json             # Dependencies and scripts
│   └── vite.config.ts           # Vite configuration
│
├── chat-backend/                 # Node.js backend application
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   │   ├── auth.ts          # Authentication routes
│   │   │   └── chat.ts          # Chat routes
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.ts          # JWT authentication
│   │   │   └── validation.ts    # Request validation
│   │   ├── services/            # Business logic services
│   │   │   ├── openai.ts        # OpenAI integration
│   │   │   └── socket.ts        # Socket.IO server
│   │   ├── db/                  # Database configuration
│   │   │   ├── schema.ts        # Drizzle schema definitions
│   │   │   └── connection.ts    # Database connection
│   │   └── app.ts               # Express app configuration
│   ├── drizzle/                 # Database migrations
│   ├── Dockerfile               # Backend Docker configuration
│   ├── package.json             # Dependencies and scripts
│   └── drizzle.config.ts        # Drizzle ORM configuration
│
├── docker/                      # Docker configuration
│   └── init.sql                 # Database initialization
├── docker-compose.yml           # Multi-container setup
├── .env.example                 # Environment template
├── README.md                    # This file
└── DOCKER_README.md             # Docker deployment guide
```

## 🔧 Development Commands

### **Frontend Commands**
```bash
cd chat-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Backend Commands**
```bash
cd chat-backend
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start            # Start production server
npm run db:generate  # Generate database migrations
npm run db:push      # Apply database migrations
npm run db:studio    # Open Drizzle Studio
```

## 🚨 Troubleshooting

### **Common Issues:**

1. **Database Connection Errors:**
   ```bash
   # Check PostgreSQL is running
   pg_ctl status
   
   # Verify database exists
   psql -l | grep chatbot_db
   ```

2. **Port Already in Use:**
   ```bash
   # Kill process on port 3001
   lsof -ti:3001 | xargs kill -9
   
   # Kill process on port 5173
   lsof -ti:5173 | xargs kill -9
   ```

3. **OpenAI API Errors:**
   - Verify your API key is valid
   - Check your OpenAI account has credits
   - Ensure the API key has the correct permissions

4. **WebSocket Connection Issues:**
   - Check CORS settings in backend
   - Verify firewall settings
   - Ensure both frontend and backend are running

## 🔒 Security Features

- **Authentication:** JWT tokens with secure HTTP-only cookies option
- **Socket.IO Authentication:** Real-time connections secured with JWT verification
- **Password Security:** bcrypt hashing with salt rounds
- **API Security:** Rate limiting, CORS, and Helmet security headers
- **Input Validation:** Comprehensive request validation
- **SQL Injection Prevention:** Parameterized queries with Drizzle ORM
- **XSS Protection:** Content Security Policy headers
- **Authorization:** User-specific conversation access control
- **Session Management:** Automatic token validation and forced logout on security violations

### **Enhanced Socket.IO Security:**

The WebSocket connections are secured with JWT authentication that includes:

- **Token Verification:** Every socket connection requires a valid JWT token
- **User Authentication:** Tokens are verified against the database on each connection
- **Automatic Disconnection:** Invalid or expired tokens immediately disconnect the socket
- **Conversation Access Control:** Users can only join conversations they own
- **Message Authorization:** All messages are validated against the authenticated user
- **Security Violation Detection:** Automatic logout on suspicious activity
- **Token Refresh Support:** Graceful handling of token expiration

**Authentication Flow:**
1. Client connects with JWT token in socket auth headers
2. Server verifies token signature and expiration
3. Server validates user exists in database
4. User info is attached to socket for authorization
5. All subsequent socket events verify user permissions
6. Invalid tokens or security violations trigger immediate disconnection

## 🎯 Performance Optimizations

- **Frontend:** Code splitting, lazy loading, and Vite optimization
- **Backend:** Connection pooling, Redis caching, and async operations
- **Database:** Indexed queries and optimized schema design
- **Real-time:** Efficient WebSocket room management
- **Production:** Nginx reverse proxy with gzip compression

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the logs: `npm run dev` in both frontend and backend
3. Ensure all environment variables are set correctly
4. Check database and Redis connections
5. Verify your OpenAI API key is valid

For Docker-related issues, see the [Docker README](./DOCKER_README.md).

---

**Happy Chatting! 🚀** 