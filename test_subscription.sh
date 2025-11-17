#!/bin/bash
# Test GraphQL Subscription and WebSocket connection

set -e

GRAPHQL_URL="http://localhost:8081/graphql"
WS_URL="ws://localhost:8081/graphql/ws"

echo "=== Testing GraphQL Server Health ==="
curl -s "$GRAPHQL_URL/../health" | jq '.' || echo "Health check failed"

echo ""
echo "=== Creating Force Graph Simulation ==="
SIMULATION_INPUT='{
  "nodes": [
    {"id": "node1", "label": "Node 1", "scale": 1.0},
    {"id": "node2", "label": "Node 2", "scale": 1.5},
    {"id": "node3", "label": "Node 3", "scale": 2.0}
  ],
  "links": [
    {"source": 0, "target": 1, "weight": 1.0},
    {"source": 1, "target": 2, "weight": 1.5}
  ],
  "physics": {
    "springK": 2.0,
    "repulsionK": 2000.0,
    "damping": 0.92,
    "restLength": 80,
    "maxSpeed": 200
  },
  "maxFps": 30
}'

CREATE_MUTATION='mutation CreateForceGraphSimulation($input: ForceGraphSimulationInput!) {
  createForceGraphSimulation(input: $input)
}'

RESULT=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$CREATE_MUTATION\",
    \"variables\": {
      \"input\": $SIMULATION_INPUT
    }
  }")

echo "$RESULT" | jq '.' || echo "$RESULT"

SIMULATION_ID=$(echo "$RESULT" | jq -r '.data.createForceGraphSimulation' 2>/dev/null || echo "")

if [ -z "$SIMULATION_ID" ] || [ "$SIMULATION_ID" = "null" ]; then
  echo "Failed to create simulation"
  exit 1
fi

echo ""
echo "Simulation ID: $SIMULATION_ID"
echo ""
echo "=== WebSocket URL ==="
echo "$WS_URL"
echo ""
echo "=== Testing Subscription ==="
echo "You can test the subscription using a GraphQL client that supports WebSocket"
echo "For example, using wscat:"
echo "  wscat -c $WS_URL"
echo ""
echo "Or using a GraphQL Playground at:"
echo "  http://localhost:8081/graphql/playground"
echo ""
echo "Subscription query:"
echo "subscription ForceGraphUpdates {"
echo "  forceGraphUpdates(simulationId: \"$SIMULATION_ID\", maxFps: 30) {"
echo "    simulationId"
echo "    timestamp"
echo "    iteration"
echo "    nodes {"
echo "      id"
echo "      position { x y z }"
echo "    }"
echo "  }"
echo "}"

