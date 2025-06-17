# Production stage
FROM node:18-alpine


# Create app directory
WORKDIR /app

COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S chatapp -u 1001

# Install only production dependencies
RUN npm ci  && npm cache clean --force

# Copy any other necessary files (config, etc.)
COPY --chown=chatapp:nodejs drizzle ./drizzle

# Change ownership of the app directory
RUN chown -R chatapp:nodejs /app

# Switch to non-root user
USER chatapp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Start the application
CMD ["npm", "run", "dev"] 