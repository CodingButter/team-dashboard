#!/bin/bash

# Production Rollback Script
# Performs rollback to previous stable version with validation

set -euo pipefail

NAMESPACE="team-dashboard-prod"
TIMEOUT="300s"
RETRY_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

get_current_images() {
    log "Getting current deployment images..."
    
    CURRENT_DASHBOARD=$(kubectl get deployment dashboard -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
    CURRENT_AGENT_MANAGER=$(kubectl get deployment agent-manager -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
    CURRENT_MCP_MANAGER=$(kubectl get deployment mcp-manager -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
    CURRENT_OPENAI_SERVICE=$(kubectl get deployment openai-service -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
    
    log "Current images:"
    log "  Dashboard: $CURRENT_DASHBOARD"
    log "  Agent Manager: $CURRENT_AGENT_MANAGER"
    log "  MCP Manager: $CURRENT_MCP_MANAGER"
    log "  OpenAI Service: $CURRENT_OPENAI_SERVICE"
}

backup_current_deployment() {
    log "Creating backup of current deployment..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    kubectl get deployment dashboard -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/dashboard-deployment.yaml"
    kubectl get deployment agent-manager -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/agent-manager-deployment.yaml"
    kubectl get deployment mcp-manager -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/mcp-manager-deployment.yaml"
    kubectl get deployment openai-service -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/openai-service-deployment.yaml"
    
    success "Backup created in $BACKUP_DIR"
}

perform_rollback() {
    local deployment=$1
    local retry_count=0
    
    log "Rolling back $deployment deployment..."
    
    while [ $retry_count -lt $RETRY_COUNT ]; do
        if kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE"; then
            log "Rollback initiated for $deployment"
            break
        else
            retry_count=$((retry_count + 1))
            warning "Rollback attempt $retry_count failed for $deployment"
            if [ $retry_count -eq $RETRY_COUNT ]; then
                error "Failed to rollback $deployment after $RETRY_COUNT attempts"
                return 1
            fi
            sleep 5
        fi
    done
    
    log "Waiting for $deployment rollback to complete..."
    if kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout="$TIMEOUT"; then
        success "$deployment rollback completed successfully"
    else
        error "$deployment rollback failed or timed out"
        return 1
    fi
}

validate_rollback() {
    log "Validating rollback..."
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod -l app=dashboard -n "$NAMESPACE" --timeout=120s
    kubectl wait --for=condition=ready pod -l app=agent-manager -n "$NAMESPACE" --timeout=120s
    kubectl wait --for=condition=ready pod -l app=mcp-manager -n "$NAMESPACE" --timeout=120s
    kubectl wait --for=condition=ready pod -l app=openai-service -n "$NAMESPACE" --timeout=120s
    
    # Health check validation
    log "Running health checks..."
    
    # Port forward for health checks
    kubectl port-forward svc/dashboard 8080:3000 -n "$NAMESPACE" &
    PF_PID=$!
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:8080/health &> /dev/null; then
        success "Health check passed"
    else
        error "Health check failed"
        kill $PF_PID 2>/dev/null || true
        return 1
    fi
    
    kill $PF_PID 2>/dev/null || true
    
    success "Rollback validation completed"
}

update_traffic_routing() {
    log "Updating traffic routing after rollback..."
    
    # Ensure services point to blue deployment
    kubectl patch service dashboard -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"blue"}}}'
    kubectl patch service agent-manager -n "$NAMESPACE" -p '{"spec":{"selector":{"version":"blue"}}}'
    
    success "Traffic routing updated"
}

cleanup_failed_deployment() {
    log "Cleaning up failed green deployment..."
    
    # Remove green deployments if they exist
    kubectl delete deployment dashboard-green agent-manager-green mcp-manager-green openai-service-green -n "$NAMESPACE" --ignore-not-found
    
    success "Cleanup completed"
}

main() {
    log "Starting production rollback process..."
    
    check_prerequisites
    get_current_images
    backup_current_deployment
    
    # Perform rollback for each service
    SERVICES=("dashboard" "agent-manager" "mcp-manager" "openai-service")
    
    for service in "${SERVICES[@]}"; do
        if ! perform_rollback "$service"; then
            error "Rollback failed for $service"
            exit 1
        fi
    done
    
    validate_rollback
    update_traffic_routing
    cleanup_failed_deployment
    
    success "Production rollback completed successfully!"
    
    log "Rollback summary:"
    kubectl get deployments -n "$NAMESPACE" -o wide
}

# Handle script interruption
trap 'error "Rollback interrupted"; exit 1' INT TERM

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--dry-run] [--force]"
        echo "  --dry-run: Show what would be done without executing"
        echo "  --force: Skip confirmation prompts"
        exit 0
        ;;
    --dry-run)
        log "DRY RUN MODE: This is what would be executed:"
        get_current_images
        exit 0
        ;;
    --force)
        log "Force mode enabled - skipping confirmations"
        ;;
    "")
        read -p "Are you sure you want to rollback production? (yes/no): " -r
        if [[ ! $REPLY =~ ^yes$ ]]; then
            log "Rollback cancelled"
            exit 0
        fi
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

main