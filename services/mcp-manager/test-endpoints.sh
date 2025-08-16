#!/bin/bash

# MCP Manager Endpoint Test Script
BASE_URL="http://127.0.0.1:3003/api/mcp"

echo "Testing MCP Manager REST Endpoints"
echo "==================================="

# Test 1: List all servers
echo -e "\n1. GET /api/mcp/servers - List all servers"
curl -X GET "$BASE_URL/servers" -H "Content-Type: application/json" | python3 -m json.tool

# Test 2: Create a new server
echo -e "\n2. POST /api/mcp/servers - Create server"
SERVER_DATA='{
  "name": "Test MCP Server",
  "description": "A test server for endpoint validation",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "enabled": true,
  "tags": ["test", "filesystem"]
}'

RESPONSE=$(curl -s -X POST "$BASE_URL/servers" \
  -H "Content-Type: application/json" \
  -d "$SERVER_DATA")

echo "$RESPONSE" | python3 -m json.tool

# Extract server ID if created successfully
SERVER_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -n "$SERVER_ID" ]; then
  echo -e "\nCreated server with ID: $SERVER_ID"
  
  # Test 3: Get server by ID
  echo -e "\n3. GET /api/mcp/servers/:id - Get server by ID"
  curl -X GET "$BASE_URL/servers/$SERVER_ID" -H "Content-Type: application/json" | python3 -m json.tool
  
  # Test 4: Get server status
  echo -e "\n4. GET /api/mcp/servers/:id/status - Get server status"
  curl -X GET "$BASE_URL/servers/$SERVER_ID/status" -H "Content-Type: application/json" | python3 -m json.tool
  
  # Test 5: Update server
  echo -e "\n5. PUT /api/mcp/servers/:id - Update server"
  UPDATE_DATA='{
    "description": "Updated test server description",
    "enabled": false
  }'
  curl -X PUT "$BASE_URL/servers/$SERVER_ID" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA" | python3 -m json.tool
  
  # Test 6: Delete server
  echo -e "\n6. DELETE /api/mcp/servers/:id - Delete server"
  curl -X DELETE "$BASE_URL/servers/$SERVER_ID" -H "Content-Type: application/json" | python3 -m json.tool
fi

# Test 7: Get status overview
echo -e "\n7. GET /api/mcp/status - Get all server statuses"
curl -X GET "$BASE_URL/status" -H "Content-Type: application/json" | python3 -m json.tool

echo -e "\n==================================="
echo "All endpoint tests completed!"