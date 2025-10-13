# Multi-stage build for Bindizr UI
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/ui

# Copy package files
COPY ui/package*.json ./

# Install dependencies
RUN npm ci --only=production \
 && npm install --force

# Copy source code
COPY ui/ ./

# Build frontend
RUN npm run build

# Stage 2: Build Go application
FROM golang:1.25-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Build Go binary with static linking
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o bindizr-ui main.go

# Stage 3: Final runtime image
FROM alpine:latest

WORKDIR /app

# Copy binary from builder stage
COPY --from=backend-builder /app/bindizr-ui .

# Expose port
EXPOSE 9000

# Set environment variables
ENV GO_ENV=production
ENV PORT=9000

# Run the binary
CMD ["./bindizr-ui"]