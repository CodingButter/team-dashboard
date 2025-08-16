#!/bin/bash

echo "======================================"
echo "Port Configuration Test"
echo "======================================"

# Check if ports are in use
check_port() {
    port=$1
    service=$2
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✗ Port $port ($service) is already in use!"
        lsof -i :$port | grep LISTEN
    else
        echo "✓ Port $port ($service) is available"
    fi
}

echo ""
echo "Checking port availability..."
echo "------------------------------"
check_port 3000 "Next.js Dashboard"
check_port 3001 "WebSocket Server"
check_port 3002 "Documentation Site"
check_port 3003 "Agent Manager API"
check_port 3010 "Grafana"
check_port 8000 "System Monitor"
check_port 9090 "Prometheus"

echo ""
echo "======================================"
echo "Testing WebSocket Server Configuration"
echo "======================================"

# Check WebSocket server default port
echo ""
echo "Checking WebSocket server configuration files..."
echo "------------------------------------------------"

# Check start-server.ts
ws_port=$(grep "WS_PORT" services/agent-manager/src/start-server.ts | grep -o "'[0-9]*'" | tr -d "'")
echo "start-server.ts default port: $ws_port"
if [ "$ws_port" = "3001" ]; then
    echo "✓ start-server.ts correctly uses port 3001"
else
    echo "✗ start-server.ts uses wrong port: $ws_port"
fi

# Check test port
test_port=$(grep "TEST_PORT" services/agent-manager/tests/websocket-integration.test.ts | grep -o "[0-9]*")
echo "Test port: $test_port"
if [ "$test_port" != "3001" ] && [ "$test_port" != "3000" ] && [ "$test_port" != "3002" ] && [ "$test_port" != "3003" ]; then
    echo "✓ Test uses isolated port: $test_port"
else
    echo "✗ Test port conflicts with production services: $test_port"
fi

echo ""
echo "======================================"
echo "Environment Variable Check"
echo "======================================"

if [ -f .env ]; then
    echo "Found .env file. Checking configuration..."
    ws_env_port=$(grep "^WS_PORT=" .env | cut -d'=' -f2)
    if [ "$ws_env_port" = "3001" ]; then
        echo "✓ .env WS_PORT correctly set to 3001"
    else
        echo "✗ .env WS_PORT is set to: $ws_env_port"
    fi
else
    echo "No .env file found. Will use defaults from code."
fi

echo ""
echo "======================================"
echo "Test Complete"
echo "======================================"