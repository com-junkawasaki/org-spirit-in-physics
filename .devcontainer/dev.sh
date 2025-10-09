#!/bin/bash

# Spirit in Physics Dev Container Helper Script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
OVERRIDE_FILE="${PROJECT_ROOT}/.devcontainer/docker-compose.override.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop or Docker Engine."
        exit 1
    fi
}

# Check if VSCode is available
check_vscode() {
    if ! command -v code >/dev/null 2>&1; then
        log_warning "VSCode CLI (code) is not available. Please install it or use VSCode GUI to open the dev container."
        echo "Install VSCode CLI: https://code.visualstudio.com/docs/editor/command-line"
        return 1
    fi
    return 0
}

# Start development environment
start() {
    log_info "Starting Spirit in Physics development environment..."

    check_docker

    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" pull

    # Build development images
    log_info "Building development images..."
    docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" build dev-backend

    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d

    log_success "Development environment started successfully!"
    log_info "Services available at:"
    echo "  - Backend API: http://localhost:8080"
    echo "  - Patient App: http://localhost:3002"
    echo "  - Admin Dashboard: http://localhost:3001"
    echo "  - Visualizer: http://localhost:3003"
    echo "  - Temporal UI: http://localhost:8233"
    echo "  - Pact Broker: http://localhost:9292"
}

# Stop development environment
stop() {
    log_info "Stopping Spirit in Physics development environment..."
    docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" down
    log_success "Development environment stopped."
}

# Open in VSCode Dev Container
open_vscode() {
    if check_vscode; then
        log_info "Opening project in VSCode Dev Container..."
        code --new-window "$PROJECT_ROOT"
        log_info "Use 'Dev Containers: Reopen in Container' command in VSCode to enter the development environment."
    else
        log_info "Please open VSCode and use 'Dev Containers: Reopen in Container' command."
    fi
}

# Show status
status() {
    log_info "Development environment status:"
    docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" ps
}

# Clean up
clean() {
    log_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Cleaning up development environment..."
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" down -v --rmi all
        log_success "Cleanup completed."
    else
        log_info "Cleanup cancelled."
    fi
}

# Show logs
logs() {
    if [ -n "$2" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" logs -f "$2"
    else
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" logs -f
    fi
}

# Show help
help() {
    echo "Spirit in Physics Dev Container Helper Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the development environment"
    echo "  stop      Stop the development environment"
    echo "  vscode    Open project in VSCode Dev Container"
    echo "  status    Show status of services"
    echo "  logs      Show logs (optionally specify service name)"
    echo "  clean     Clean up containers, volumes, and images"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 vscode"
}

# Main command handling
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    vscode)
        open_vscode
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac
