#!/bin/bash
# Development startup script
# Starts API server, worker, and React client concurrently

echo "🚀 Starting AEO Platform development environment..."
echo ""

# Kill existing processes on ports
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Start API server in background
echo "📡 Starting API server on port 3001..."
npm run server:dev > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Start worker in background
echo "⚙️  Starting background worker..."
npm run worker:dev > /tmp/worker.log 2>&1 &
WORKER_PID=$!

# Start React client in background
echo "🎨 Starting React client on port 3000..."
cd client && npm start > /tmp/client.log 2>&1 &
CLIENT_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "   API Server: http://localhost:3001"
echo "   React Client: http://localhost:3000"
echo "   Worker: Running in background"
echo ""
echo "   Server PID: $SERVER_PID"
echo "   Worker PID: $WORKER_PID"
echo "   Client PID: $CLIENT_PID"
echo ""
echo "📝 Logs:"
echo "   Server: tail -f /tmp/server.log"
echo "   Worker: tail -f /tmp/worker.log"
echo "   Client: tail -f /tmp/client.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $SERVER_PID $WORKER_PID $CLIENT_PID 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    echo "✅ Shutdown complete"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Wait for all background processes
wait
