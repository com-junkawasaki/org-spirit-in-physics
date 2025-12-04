#!/bin/bash
# Docker disk cleanup script

set -e

echo "=== Docker Disk Cleanup ==="
echo ""

# Show current disk usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Remove all stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove all unused images (not just dangling)
echo "Removing unused images..."
docker image prune -a -f

# Remove all unused volumes
echo "Removing unused volumes..."
docker volume prune -f

# Remove all unused networks
echo "Removing unused networks..."
docker network prune -f

# Remove build cache
echo "Removing build cache..."
docker builder prune -a -f

# Show final disk usage
echo ""
echo "Final Docker disk usage:"
docker system df

echo ""
echo "✅ Docker cleanup complete!"

