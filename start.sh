#!/usr/bin/env bash

# Function to handle clean shutdown of background jobs
cleanup() {
    echo -e "\nShutting down Frontend and Backend..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Override with BACKEND_PORT / FRONTEND_PORT env vars, e.g.:
#   BACKEND_PORT=8081 FRONTEND_PORT=8080 ./start.sh
: "${BACKEND_PORT:=59190}"
: "${FRONTEND_PORT:=53000}"
export BACKEND_PORT FRONTEND_PORT

echo "========================================="
echo " Starting Backend (Spring Boot: $BACKEND_PORT)"
echo " Starting Frontend (Vite: $FRONTEND_PORT)"
echo " Press Ctrl+C to stop both              "
echo "========================================="

(cd backend && mvn spring-boot:run) &
(cd frontend && npm run dev) &

wait
