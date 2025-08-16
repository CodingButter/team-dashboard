#!/bin/bash

# Secret Management Setup Script
# Creates and manages Kubernetes secrets for different environments

set -euo pipefail

ENVIRONMENT="${1:-staging}"
ACTION="${2:-create}"

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

usage() {
    echo "Usage: $0 [environment] [action]"
    echo "Environments: staging, production"
    echo "Actions: create, update, delete, validate"
    echo ""
    echo "Examples:"
    echo "  $0 staging create     # Create secrets for staging"
    echo "  $0 production update  # Update secrets for production"
    echo "  $0 staging validate   # Validate secrets exist"
    exit 1
}

get_namespace() {
    case $ENVIRONMENT in
        "staging")
            echo "team-dashboard-staging"
            ;;
        "production")
            echo "team-dashboard-prod"
            ;;
        *)
            error "Unknown environment: $ENVIRONMENT"
            usage
            ;;
    esac
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    local namespace
    namespace=$(get_namespace)
    
    if ! kubectl get namespace "$namespace" &> /dev/null; then
        error "Namespace $namespace does not exist"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

prompt_for_secret() {
    local secret_name=$1
    local description=$2
    local is_sensitive=${3:-true}
    
    echo -n "Enter $description: "
    if [ "$is_sensitive" = true ]; then
        read -s secret_value
        echo # New line after hidden input
    else
        read secret_value
    fi
    
    if [ -z "$secret_value" ]; then
        error "$description cannot be empty"
        return 1
    fi
    
    echo "$secret_value"
}

create_database_secrets() {
    local namespace=$1
    
    log "Creating database secrets..."
    
    local postgres_url
    local redis_password
    
    if [ "$ENVIRONMENT" = "production" ]; then
        postgres_url=$(prompt_for_secret "postgres_url" "PostgreSQL connection URL")
        redis_password=$(prompt_for_secret "redis_password" "Redis password")
    else
        # Use default values for staging
        postgres_url="postgresql://dashboard_user:dashboard_pass@postgres:5432/team_dashboard"
        redis_password="staging_redis_password"
    fi
    
    kubectl create secret generic database-secrets \
        --from-literal=postgres-url="$postgres_url" \
        --from-literal=redis-password="$redis_password" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Database secrets created"
}

create_dashboard_secrets() {
    local namespace=$1
    
    log "Creating dashboard secrets..."
    
    local nextauth_secret
    local nextauth_url
    local github_client_id
    local github_client_secret
    
    if [ "$ENVIRONMENT" = "production" ]; then
        nextauth_secret=$(prompt_for_secret "nextauth_secret" "NextAuth secret key")
        nextauth_url="https://team-dashboard.app"
        github_client_id=$(prompt_for_secret "github_client_id" "GitHub Client ID" false)
        github_client_secret=$(prompt_for_secret "github_client_secret" "GitHub Client Secret")
    else
        nextauth_secret="staging_nextauth_secret_$(openssl rand -hex 32)"
        nextauth_url="https://staging.team-dashboard.app"
        github_client_id="staging_github_client_id"
        github_client_secret="staging_github_client_secret"
    fi
    
    kubectl create secret generic dashboard-secrets \
        --from-literal=NEXTAUTH_SECRET="$nextauth_secret" \
        --from-literal=NEXTAUTH_URL="$nextauth_url" \
        --from-literal=GITHUB_CLIENT_ID="$github_client_id" \
        --from-literal=GITHUB_CLIENT_SECRET="$github_client_secret" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Dashboard secrets created"
}

create_agent_manager_secrets() {
    local namespace=$1
    
    log "Creating agent manager secrets..."
    
    local jwt_secret
    local github_token
    local openai_api_key
    
    if [ "$ENVIRONMENT" = "production" ]; then
        jwt_secret=$(prompt_for_secret "jwt_secret" "JWT secret key")
        github_token=$(prompt_for_secret "github_token" "GitHub personal access token")
        openai_api_key=$(prompt_for_secret "openai_api_key" "OpenAI API key")
    else
        jwt_secret="staging_jwt_secret_$(openssl rand -hex 32)"
        github_token="staging_github_token"
        openai_api_key="staging_openai_key"
    fi
    
    kubectl create secret generic agent-manager-secrets \
        --from-literal=JWT_SECRET="$jwt_secret" \
        --from-literal=GITHUB_TOKEN="$github_token" \
        --from-literal=OPENAI_API_KEY="$openai_api_key" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Agent manager secrets created"
}

create_mcp_manager_secrets() {
    local namespace=$1
    
    log "Creating MCP manager secrets..."
    
    local mcp_encryption_key
    
    if [ "$ENVIRONMENT" = "production" ]; then
        mcp_encryption_key=$(prompt_for_secret "mcp_encryption_key" "MCP encryption key")
    else
        mcp_encryption_key="staging_mcp_key_$(openssl rand -hex 32)"
    fi
    
    kubectl create secret generic mcp-manager-secrets \
        --from-literal=MCP_ENCRYPTION_KEY="$mcp_encryption_key" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "MCP manager secrets created"
}

create_openai_service_secrets() {
    local namespace=$1
    
    log "Creating OpenAI service secrets..."
    
    local openai_api_key
    local openai_org_id
    
    if [ "$ENVIRONMENT" = "production" ]; then
        openai_api_key=$(prompt_for_secret "openai_api_key" "OpenAI API key")
        openai_org_id=$(prompt_for_secret "openai_org_id" "OpenAI Organization ID" false)
    else
        openai_api_key="staging_openai_key"
        openai_org_id="staging_org_id"
    fi
    
    kubectl create secret generic openai-service-secrets \
        --from-literal=openai-api-key="$openai_api_key" \
        --from-literal=openai-org-id="$openai_org_id" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "OpenAI service secrets created"
}

create_secrets() {
    local namespace
    namespace=$(get_namespace)
    
    log "Creating secrets for $ENVIRONMENT environment in namespace: $namespace"
    
    create_database_secrets "$namespace"
    create_dashboard_secrets "$namespace"
    create_agent_manager_secrets "$namespace"
    create_mcp_manager_secrets "$namespace"
    create_openai_service_secrets "$namespace"
    
    success "All secrets created successfully"
}

update_secrets() {
    log "Updating secrets (this will recreate them)..."
    delete_secrets
    create_secrets
}

delete_secrets() {
    local namespace
    namespace=$(get_namespace)
    
    log "Deleting secrets from namespace: $namespace"
    
    local secrets=("database-secrets" "dashboard-secrets" "agent-manager-secrets" "mcp-manager-secrets" "openai-service-secrets")
    
    for secret in "${secrets[@]}"; do
        if kubectl get secret "$secret" -n "$namespace" &> /dev/null; then
            kubectl delete secret "$secret" -n "$namespace"
            success "Deleted secret: $secret"
        else
            warning "Secret not found: $secret"
        fi
    done
}

validate_secrets() {
    local namespace
    namespace=$(get_namespace)
    
    log "Validating secrets in namespace: $namespace"
    
    local secrets=("database-secrets" "dashboard-secrets" "agent-manager-secrets" "mcp-manager-secrets" "openai-service-secrets")
    local all_valid=true
    
    for secret in "${secrets[@]}"; do
        if kubectl get secret "$secret" -n "$namespace" &> /dev/null; then
            success "Secret exists: $secret"
            
            # Check if secret has data
            local data_count
            data_count=$(kubectl get secret "$secret" -n "$namespace" -o jsonpath='{.data}' | jq 'length')
            if [ "$data_count" -gt 0 ]; then
                success "  Has $data_count data entries"
            else
                error "  Secret has no data entries"
                all_valid=false
            fi
        else
            error "Secret missing: $secret"
            all_valid=false
        fi
    done
    
    if [ "$all_valid" = true ]; then
        success "All secrets are valid"
        return 0
    else
        error "Some secrets are invalid or missing"
        return 1
    fi
}

backup_secrets() {
    local namespace
    namespace=$(get_namespace)
    
    log "Backing up secrets from namespace: $namespace"
    
    local backup_dir="secret-backups/$ENVIRONMENT/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    local secrets=("database-secrets" "dashboard-secrets" "agent-manager-secrets" "mcp-manager-secrets" "openai-service-secrets")
    
    for secret in "${secrets[@]}"; do
        if kubectl get secret "$secret" -n "$namespace" &> /dev/null; then
            kubectl get secret "$secret" -n "$namespace" -o yaml > "$backup_dir/$secret.yaml"
            success "Backed up: $secret"
        else
            warning "Secret not found: $secret"
        fi
    done
    
    success "Secrets backed up to: $backup_dir"
}

main() {
    case $ACTION in
        "create")
            check_prerequisites
            create_secrets
            ;;
        "update")
            check_prerequisites
            backup_secrets
            update_secrets
            ;;
        "delete")
            check_prerequisites
            read -p "Are you sure you want to delete all secrets for $ENVIRONMENT? (yes/no): " -r
            if [[ $REPLY =~ ^yes$ ]]; then
                delete_secrets
            else
                log "Operation cancelled"
            fi
            ;;
        "validate")
            check_prerequisites
            validate_secrets
            ;;
        "backup")
            check_prerequisites
            backup_secrets
            ;;
        *)
            error "Unknown action: $ACTION"
            usage
            ;;
    esac
}

# Check arguments
if [ $# -gt 2 ]; then
    usage
fi

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
fi

main