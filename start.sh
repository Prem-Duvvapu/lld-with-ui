#!/usr/bin/env bash

# Function to handle clean shutdown of background jobs
cleanup() {
    echo -e "\nShutting down Frontend and Backend..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "========================================="
echo " Starting Backend (Spring Boot: 9090)   "
echo " Starting Frontend (Vite: 3000)         "
echo " Press Ctrl+C to stop both              "
echo "========================================="

(cd backend && mvn spring-boot:run) &
(cd frontend && npm run dev) &

wait
