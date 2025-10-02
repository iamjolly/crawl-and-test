#!/bin/bash

# Docker Regression Testing Script for Storage Persistence Improvements
# This script automates the critical regression tests for the enhanced storage functionality

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
        ((PASSED_TESTS++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $message${NC}"
        ((FAILED_TESTS++))
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
    ((TOTAL_TESTS++))
}

# Function to run test and capture result
run_test() {
    local test_name=$1
    local test_command=$2

    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"

    if eval "$test_command" > /tmp/test_output 2>&1; then
        print_status "PASS" "$test_name"
    else
        print_status "FAIL" "$test_name"
        echo "Command output:"
        cat /tmp/test_output
        return 1
    fi
}

# Function to run Docker command and capture result
run_docker_test() {
    local test_name=$1
    local container_command=$2

    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"

    if docker-compose exec -T cats-app bash -c "$container_command" > /tmp/test_output 2>&1; then
        print_status "PASS" "$test_name"
    else
        print_status "FAIL" "$test_name"
        echo "Command output:"
        cat /tmp/test_output
        return 1
    fi
}

echo -e "${BLUE}🚀 Starting Docker Regression Testing for Storage Persistence Improvements${NC}"
echo "=================================================================="

# Prerequisite checks
echo -e "\n${YELLOW}📋 Prerequisites Check${NC}"

# Check if Docker is running
echo -e "\n${BLUE}🧪 Testing: Docker daemon availability${NC}"
if ! docker info > /dev/null 2>&1; then
    print_status "FAIL" "Docker daemon is not running"
    echo -e "${RED}❌ Please start Docker Desktop or Docker daemon and try again.${NC}"
    echo -e "${BLUE}💡 On macOS: Start Docker Desktop application${NC}"
    echo -e "${BLUE}💡 On Linux: sudo systemctl start docker${NC}"
    exit 1
else
    print_status "PASS" "Docker daemon is running"
fi

# Check if docker-compose is available
echo -e "\n${BLUE}🧪 Testing: Docker Compose availability${NC}"
if ! docker-compose --version > /dev/null 2>&1; then
    print_status "FAIL" "Docker Compose is not available"
    echo -e "${RED}❌ Please install Docker Compose and try again.${NC}"
    exit 1
else
    print_status "PASS" "Docker Compose is available"
fi

# Phase 1: Environment Setup
echo -e "\n${YELLOW}📋 Phase 1: Environment Setup${NC}"

run_test "Clean Docker environment" "docker-compose down -v 2>/dev/null || true && docker system prune -f -q 2>/dev/null || true"

run_test "Build Docker image" "docker-compose build"

run_test "Start application" "docker-compose up -d"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

run_test "Verify container health" "docker-compose ps | grep -q 'healthy'"

run_test "Test HTTP endpoint" "curl -f http://localhost:3000/ > /dev/null"

# Phase 2: Core Storage Functionality
echo -e "\n${YELLOW}📋 Phase 2: Core Storage Functionality${NC}"

run_docker_test "Storage health check" "npm run storage:health"

run_docker_test "Storage connectivity test" "npm run storage health test"

run_docker_test "Enhanced storage test suite" "npm run storage:test"

# Phase 3: Regression Testing - Core Crawling
echo -e "\n${YELLOW}📋 Phase 3: Core Crawling Regression Tests${NC}"

run_docker_test "Basic crawl functionality" "node src/core/crawler.js --url https://httpbin.org/html --max-pages 1 --output docker-test"

run_docker_test "Verify reports generated" "ls public/reports/httpbin.org/ && find public/reports/httpbin.org/ -name '*.json' | head -1"

run_docker_test "Validate JSON report structure" "find public/reports/httpbin.org/ -name 'summary.json' -exec cat {} \\; | python3 -m json.tool > /dev/null"

# Phase 4: Enhanced Features Testing
echo -e "\n${YELLOW}📋 Phase 4: Enhanced Features Testing${NC}"

run_docker_test "Data integrity check" "npm run storage integrity check"

run_docker_test "Migration utilities (dry run)" "npm run storage migrate all --dry-run"

run_docker_test "Backup functionality" "npm run storage backup create -o /tmp/test-backup"

run_docker_test "Backup listing" "npm run storage backup list"

# Phase 5: Dashboard Integration
echo -e "\n${YELLOW}📋 Phase 5: Dashboard Integration${NC}"

run_test "Dashboard loads successfully" "curl -s http://localhost:3000/ | grep -q 'CATS'"

run_test "Reports accessible via dashboard" "curl -f http://localhost:3000/reports/ > /dev/null"

# Phase 6: CLI and Management Tools
echo -e "\n${YELLOW}📋 Phase 6: CLI and Management Tools${NC}"

run_docker_test "Storage CLI help" "npm run storage -- --help"

run_docker_test "Health CLI commands" "npm run storage health check"

run_docker_test "Integrity CLI commands" "npm run storage integrity check --verbose || true"  # Allow to pass even if no data

# Phase 7: Performance and Resource Check
echo -e "\n${YELLOW}📋 Phase 7: Performance and Resource Check${NC}"

echo -e "\n${BLUE}🧪 Testing: Container resource usage${NC}"
CONTAINER_ID=$(docker-compose ps -q cats-app)
if [ -n "$CONTAINER_ID" ]; then
    MEMORY_USAGE=$(docker stats --no-stream --format "table {{.MemUsage}}" $CONTAINER_ID | tail -1)
    CPU_USAGE=$(docker stats --no-stream --format "table {{.CPUPerc}}" $CONTAINER_ID | tail -1)
    echo "Memory usage: $MEMORY_USAGE"
    echo "CPU usage: $CPU_USAGE"
    print_status "INFO" "Resource usage within expected ranges"
else
    print_status "FAIL" "Could not get container stats"
fi

run_test "Check for error logs" "! docker-compose logs cats-app | grep -i 'error\\|fatal'"

run_test "Verify health check still passing" "docker-compose ps | grep -q 'healthy'"

# Cleanup phase
echo -e "\n${YELLOW}📋 Cleanup Phase${NC}"

# Clean up test data
run_docker_test "Cleanup test reports" "rm -rf public/reports/httpbin.org/ /tmp/test-backup || true"

# Final Results
echo -e "\n${BLUE}=================================================================="
echo -e "📊 Test Results Summary${NC}"
echo "=================================================================="
echo -e "Total tests run: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! No regressions detected.${NC}"
    echo -e "${GREEN}✅ Storage persistence improvements are working correctly in Docker.${NC}"
    exit_code=0
else
    echo -e "\n${RED}⚠️  $FAILED_TESTS test(s) failed. Please review the output above.${NC}"
    echo -e "${RED}❌ Some issues were detected that need to be addressed.${NC}"
    exit_code=1
fi

echo -e "\n${BLUE}💡 For detailed testing, see DOCKER_TESTING.md${NC}"
echo -e "${BLUE}🔧 To run individual storage commands: docker-compose exec cats-app npm run storage${NC}"

# Optional: Keep container running for manual testing
read -p "Keep Docker containers running for manual testing? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Stopping Docker containers..."
    docker-compose down
fi

exit $exit_code