#!/bin/bash

# Spirit in Physics - Local Development Pact CDCI Script
# This script starts Pact Broker and runs contract tests automatically

set -e

echo "🚀 Starting Spirit in Physics Local Pact CDCI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Starting Pact Broker..."

# Start only Pact Broker and its dependencies
docker-compose up -d pact-postgres pact-broker

# Wait for Pact Broker to be ready
print_status "Waiting for Pact Broker to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:9292/diagnostic/status/heartbeat > /dev/null 2>&1; then
        print_success "Pact Broker is ready!"
        break
    fi

    print_status "Waiting for Pact Broker... (attempt $attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    print_error "Pact Broker failed to start within expected time"
    exit 1
fi

# Function to run Pact tests for a specific app
run_pact_tests() {
    local app_name=$1
    local app_dir=$2

    print_status "Running Pact consumer tests for $app_name..."

    if [ ! -d "$app_dir" ]; then
        print_warning "App directory $app_dir not found, skipping $app_name"
        return 0
    fi

    cd "$app_dir"

    # Install dependencies if needed
    if [ -f "pnpm-lock.yaml" ]; then
        if ! pnpm install --frozen-lockfile > /dev/null 2>&1; then
            print_warning "Failed to install dependencies for $app_name"
            cd - > /dev/null
            return 1
        fi
    elif [ -f "package-lock.json" ]; then
        if ! npm ci > /dev/null 2>&1; then
            print_warning "Failed to install dependencies for $app_name"
            cd - > /dev/null
            return 1
        fi
    fi

    # Run Pact tests
    if [ -f "pnpm-lock.yaml" ]; then
        if pnpm test:pact > /dev/null 2>&1; then
            print_success "$app_name Pact tests passed"
            cd - > /dev/null
            return 0
        else
            print_error "$app_name Pact tests failed"
            cd - > /dev/null
            return 1
        fi
    elif [ -f "package-lock.json" ]; then
        if npm run test:pact > /dev/null 2>&1; then
            print_success "$app_name Pact tests passed"
            cd - > /dev/null
            return 0
        else
            print_error "$app_name Pact tests failed"
            cd - > /dev/null
            return 1
        fi
    else
        print_warning "No package manager found for $app_name"
        cd - > /dev/null
        return 0
    fi
}

# Run consumer tests
print_status "Running Pact Consumer Tests..."

consumer_test_results=0

# Test each frontend app
run_pact_tests "Patient App" "apps/patient" || consumer_test_results=$((consumer_test_results + 1))
run_pact_tests "Admin App" "apps/admin" || consumer_test_results=$((consumer_test_results + 1))
run_pact_tests "Visualizer App" "apps/visualizer" || consumer_test_results=$((consumer_test_results + 1))

# Publish pacts if consumer tests passed
if [ $consumer_test_results -eq 0 ]; then
    print_success "All consumer tests passed! Publishing pacts..."

    # Publish from patient app (primary consumer)
    if [ -d "apps/patient" ]; then
        cd apps/patient
        if [ -f "pnpm-lock.yaml" ]; then
            pnpm run test:pact:publish > /dev/null 2>&1 && print_success "Pacts published successfully" || print_warning "Failed to publish pacts"
        fi
        cd - > /dev/null
    fi
else
    print_error "$consumer_test_results consumer test(s) failed"
fi

# Run provider tests if backend exists
print_status "Running Pact Provider Tests..."

if [ -d "apps/backend" ]; then
    cd apps/backend

    # Start backend service for provider tests
    print_status "Starting backend service for provider verification..."
    docker-compose up -d backend > /dev/null 2>&1

    # Wait for backend to be ready
    backend_attempts=20
    backend_attempt=1

    while [ $backend_attempt -le $backend_attempts ]; do
        if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
            print_success "Backend service is ready!"
            break
        fi

        print_status "Waiting for backend service... (attempt $backend_attempt/$backend_attempts)"
        sleep 3
        ((backend_attempt++))
    done

    if [ $backend_attempt -le $backend_attempts ]; then
        # Run provider tests
        if ./gradlew test --tests "*PactProviderTest*" --info > /dev/null 2>&1; then
            print_success "Provider tests passed!"
        else
            print_error "Provider tests failed"
            provider_failed=1
        fi
    else
        print_error "Backend service failed to start"
        provider_failed=1
    fi

    cd - > /dev/null
else
    print_warning "Backend directory not found, skipping provider tests"
fi

# Summary
echo ""
echo "=========================================="
echo "🧪 Pact CDCI Results Summary"
echo "=========================================="

if [ $consumer_test_results -eq 0 ]; then
    print_success "✅ Consumer tests: PASSED"
else
    print_error "❌ Consumer tests: FAILED ($consumer_test_results failed)"
fi

if [ "${provider_failed:-0}" -eq 0 ]; then
    print_success "✅ Provider tests: PASSED"
else
    print_error "❌ Provider tests: FAILED"
fi

echo ""
print_status "Pact Broker available at: http://localhost:9292"
print_status "Pact Broker credentials: admin/password"

if [ $consumer_test_results -eq 0 ] && [ "${provider_failed:-0}" -eq 0 ]; then
    print_success "🎉 All Pact tests passed! Contracts are verified."
    exit 0
else
    print_error "💥 Some Pact tests failed. Check contract compatibility."
    exit 1
fi
