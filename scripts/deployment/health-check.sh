#!/bin/bash

# Comprehensive Health Check Script
# Tests all application endpoints and services

set -euo pipefail

ENVIRONMENT="${1:-production}"
TIMEOUT=30
RETRY_COUNT=3

# Environment-specific configurations
case $ENVIRONMENT in
    "production")
        BASE_URL="https://team-dashboard.app"
        NAMESPACE="team-dashboard-prod"
        ;;
    "staging")
        BASE_URL="https://staging.team-dashboard.app"
        NAMESPACE="team-dashboard-staging"
        ;;
    "local")
        BASE_URL="http://localhost:3000"
        NAMESPACE="team-dashboard"
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        echo "Usage: $0 [production|staging|local]"
        exit 1
        ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Health check functions
check_url() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    log "Checking $description: $url"
    
    local response_code
    local retry=0
    
    while [ $retry -lt $RETRY_COUNT ]; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
        
        if [ "$response_code" = "$expected_status" ]; then
            success "$description - HTTP $response_code"
            return 0
        else
            retry=$((retry + 1))
            if [ $retry -lt $RETRY_COUNT ]; then
                warning "$description failed (attempt $retry/$RETRY_COUNT) - HTTP $response_code, retrying..."
                sleep 5
            fi
        fi
    done
    
    error "$description failed after $RETRY_COUNT attempts - HTTP $response_code"
    return 1
}

check_json_endpoint() {
    local url=$1
    local description=$2
    local expected_field=$3
    
    log "Checking JSON endpoint $description: $url"
    
    local response
    local retry=0
    
    while [ $retry -lt $RETRY_COUNT ]; do
        response=$(curl -s --max-time $TIMEOUT "$url" || echo "{}")
        
        if echo "$response" | jq -e ".$expected_field" &> /dev/null; then
            success "$description - JSON field '$expected_field' present"
            return 0
        else
            retry=$((retry + 1))
            if [ $retry -lt $RETRY_COUNT ]; then
                warning "$description failed (attempt $retry/$RETRY_COUNT), retrying..."
                sleep 5
            fi
        fi
    done
    
    error "$description failed after $RETRY_COUNT attempts"
    return 1
}

check_kubernetes_pods() {
    if [ "$ENVIRONMENT" = "local" ]; then
        log "Skipping Kubernetes checks for local environment"
        return 0
    fi
    
    log "Checking Kubernetes pod status in namespace: $NAMESPACE"
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        warning "Namespace $NAMESPACE not found, skipping Kubernetes checks"
        return 0
    fi
    
    local services=("dashboard" "agent-manager" "mcp-manager" "openai-service")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        local ready_pods
        local total_pods
        
        ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service" --field-selector=status.phase=Running -o name | wc -l)
        total_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service" -o name | wc -l)
        
        if [ "$ready_pods" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
            success "$service pods: $ready_pods/$total_pods ready"
        else
            error "$service pods: $ready_pods/$total_pods ready"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        success "All Kubernetes pods are healthy"
        return 0
    else
        error "Some Kubernetes pods are unhealthy"
        return 1
    fi
}

check_database_connectivity() {
    log "Checking database connectivity..."
    
    # This would typically check database health through the application
    # For now, we'll check if the health endpoints indicate DB connectivity
    check_json_endpoint "$BASE_URL/api/health/db" "Database connectivity" "status"
}

check_redis_connectivity() {
    log "Checking Redis connectivity..."
    
    # Check Redis health through application endpoint
    check_json_endpoint "$BASE_URL/api/health/redis" "Redis connectivity" "status"
}

run_smoke_tests() {
    log "Running smoke tests..."
    
    local tests_passed=0
    local tests_total=0
    
    # Test 1: Main page loads
    tests_total=$((tests_total + 1))
    if check_url "$BASE_URL" "Main dashboard page"; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 2: API health endpoint
    tests_total=$((tests_total + 1))
    if check_url "$BASE_URL/api/health" "API health endpoint"; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 3: Agent manager API
    tests_total=$((tests_total + 1))
    if check_url "$BASE_URL/api/agents/health" "Agent manager health"; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 4: MCP manager API
    tests_total=$((tests_total + 1))
    if check_url "$BASE_URL/api/mcp/health" "MCP manager health"; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 5: OpenAI service API
    tests_total=$((tests_total + 1))
    if check_url "$BASE_URL/api/openai/health" "OpenAI service health"; then
        tests_passed=$((tests_passed + 1))
    fi
    
    log "Smoke tests completed: $tests_passed/$tests_total passed"
    
    if [ $tests_passed -eq $tests_total ]; then
        success "All smoke tests passed"
        return 0
    else
        error "Some smoke tests failed"
        return 1
    fi
}

check_performance_metrics() {
    log "Checking performance metrics..."
    
    local start_time
    local end_time
    local response_time
    
    start_time=$(date +%s%N)
    if curl -s --max-time $TIMEOUT "$BASE_URL" > /dev/null; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ $response_time -lt 2000 ]; then
            success "Response time: ${response_time}ms (under 2s target)"
        elif [ $response_time -lt 5000 ]; then
            warning "Response time: ${response_time}ms (above 2s target but acceptable)"
        else
            error "Response time: ${response_time}ms (above 5s threshold)"
            return 1
        fi
    else
        error "Failed to measure response time"
        return 1
    fi
}

generate_report() {
    local exit_code=$1
    
    log "Health check report for $ENVIRONMENT environment:"
    echo "================================="
    echo "Environment: $ENVIRONMENT"
    echo "Base URL: $BASE_URL"
    echo "Namespace: $NAMESPACE"
    echo "Timestamp: $(date)"
    echo "Status: $([ $exit_code -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")"
    echo "================================="
    
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "Issues detected. Please check the logs above for details."
        echo "For troubleshooting, run:"
        echo "  kubectl logs -n $NAMESPACE -l app=dashboard --tail=50"
        echo "  kubectl get pods -n $NAMESPACE"
        echo "  kubectl describe pods -n $NAMESPACE"
    fi
}

main() {
    log "Starting comprehensive health check for $ENVIRONMENT environment"
    
    local overall_status=0
    
    # Core health checks
    if ! check_kubernetes_pods; then
        overall_status=1
    fi
    
    if ! run_smoke_tests; then
        overall_status=1
    fi
    
    if ! check_performance_metrics; then
        overall_status=1
    fi
    
    # Optional checks (don't fail overall if these fail)
    check_database_connectivity || warning "Database connectivity check failed"
    check_redis_connectivity || warning "Redis connectivity check failed"
    
    generate_report $overall_status
    
    if [ $overall_status -eq 0 ]; then
        success "All critical health checks passed!"
    else
        error "Some critical health checks failed!"
    fi
    
    exit $overall_status
}

# Handle script arguments
case "${1:-production}" in
    --help|-h)
        echo "Usage: $0 [environment] [options]"
        echo "Environments: production, staging, local"
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --verbose     Enable verbose output"
        exit 0
        ;;
    --verbose)
        set -x
        shift
        ;;
esac

# Check dependencies
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    error "jq is required but not installed"
    exit 1
fi

if [ "$ENVIRONMENT" != "local" ] && ! command -v kubectl &> /dev/null; then
    error "kubectl is required for $ENVIRONMENT environment"
    exit 1
fi

main