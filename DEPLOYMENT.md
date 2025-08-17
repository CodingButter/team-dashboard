# Production Deployment Pipeline

This document describes the comprehensive production deployment pipeline for the Team Management Dashboard, featuring blue-green deployments, automated rollbacks, and comprehensive monitoring.

## Architecture Overview

### Deployment Strategy
- **Blue-Green Deployment**: Zero-downtime deployments with instant rollback capability
- **Multi-Environment**: Staging and production environments with environment-specific configurations
- **Automated CI/CD**: GitHub Actions workflow with validation, testing, and deployment
- **Health Monitoring**: Comprehensive health checks and automated failure detection
- **Secret Management**: Secure handling of environment variables and sensitive data

### Infrastructure Components
- **Kubernetes Cluster**: Container orchestration with autoscaling
- **Docker Registry**: GitHub Container Registry (GHCR) for image storage
- **Monitoring Stack**: Prometheus + Grafana for metrics and alerting
- **Ingress Controller**: NGINX with SSL termination and load balancing
- **Persistent Storage**: Redis and PostgreSQL with persistent volumes

## Deployment Environments

### Staging Environment
- **URL**: `https://staging.team-dashboard.app`
- **Namespace**: `team-dashboard-staging`
- **Purpose**: Integration testing and validation before production
- **Resources**: Minimal resource allocation (1 replica per service)

### Production Environment
- **URL**: `https://team-dashboard.app`
- **Namespace**: `team-dashboard-prod`
- **Purpose**: Live production environment
- **Resources**: High availability (3+ replicas) with autoscaling

## Deployment Process

### Automated Deployment (via GitHub Actions)

1. **Trigger Conditions**:
   - Push to `main` branch (production)
   - Manual workflow dispatch
   - Pull request (staging)

2. **Validation Phase**:
   ```bash
   pnpm validate  # Lint, format, type-check, test
   ```

3. **Build Phase**:
   - Multi-architecture Docker images (amd64, arm64)
   - Cached builds for faster deployment
   - Versioned with timestamp and git hash

4. **Staging Deployment**:
   - Deploy to staging environment
   - Run health checks and smoke tests
   - Validate all services are operational

5. **Production Deployment** (Blue-Green):
   - Create green environment alongside blue
   - Deploy new version to green environment
   - Run comprehensive health and smoke tests
   - Switch traffic from blue to green
   - Monitor for 5 minutes for issues
   - Clean up old blue environment

### Manual Deployment

1. **Prerequisites**:
   ```bash
   kubectl cluster-info  # Verify cluster access
   docker login ghcr.io  # Authenticate to registry
   ```

2. **Build and Push Images**:
   ```bash
   docker build -f k8s/dockerfiles/Dockerfile.dashboard -t ghcr.io/codingbutter/team-dashboard/dashboard:v1.0.0 .
   docker push ghcr.io/codingbutter/team-dashboard/dashboard:v1.0.0
   ```

3. **Deploy to Environment**:
   ```bash
   export VERSION=v1.0.0
   envsubst < k8s/environments/production/kustomization.yaml.template > k8s/environments/production/kustomization.yaml
   kubectl apply -k k8s/environments/production/
   ```

## Secret Management

### Setting Up Secrets

For staging:
```bash
./scripts/deployment/setup-secrets.sh staging create
```

For production:
```bash
./scripts/deployment/setup-secrets.sh production create
```

### Required Secrets

#### Database Secrets (`database-secrets`)
- `postgres-url`: PostgreSQL connection string
- `redis-password`: Redis authentication password

#### Dashboard Secrets (`dashboard-secrets`)
- `NEXTAUTH_SECRET`: NextAuth.js secret key
- `NEXTAUTH_URL`: Application base URL
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret

#### Agent Manager Secrets (`agent-manager-secrets`)
- `JWT_SECRET`: JWT signing secret
- `GITHUB_TOKEN`: GitHub personal access token
- `OPENAI_API_KEY`: OpenAI API key for agent operations

#### MCP Manager Secrets (`mcp-manager-secrets`)
- `MCP_ENCRYPTION_KEY`: MCP protocol encryption key

#### OpenAI Service Secrets (`openai-service-secrets`)
- `openai-api-key`: OpenAI API key
- `openai-org-id`: OpenAI organization ID

## Health Checks and Monitoring

### Automated Health Checks

The deployment pipeline includes comprehensive health checks:

```bash
./scripts/deployment/health-check.sh production
```

#### Checks Performed:
1. **Kubernetes Pod Status**: All pods running and ready
2. **HTTP Endpoint Tests**: All service endpoints responding
3. **Database Connectivity**: PostgreSQL and Redis connections
4. **Performance Metrics**: Response time under 2 seconds
5. **Smoke Tests**: Critical user flows working

### Monitoring Stack

#### Prometheus Metrics
- HTTP request rates and latencies
- Pod resource usage (CPU, memory)
- Application-specific business metrics
- Infrastructure metrics

#### Alerting Rules
- High error rate (>10% for 5 minutes)
- High response time (>2 seconds)
- Pod crash looping
- High resource usage (>80% CPU/memory)
- Deployment replicas unavailable

#### Grafana Dashboards
- Application performance overview
- Infrastructure resource utilization
- Business metrics and user activity
- Error rates and response times

## Rollback Procedures

### Automatic Rollback

The deployment pipeline automatically rolls back if:
- Health checks fail after deployment
- Error rate exceeds 10% for 5 minutes
- Response time exceeds 5 seconds consistently

### Manual Rollback

```bash
./scripts/deployment/rollback.sh
```

#### Rollback Process:
1. **Backup Current State**: Save current deployment configuration
2. **Rollback Deployments**: Use `kubectl rollout undo` for each service
3. **Validate Rollback**: Run health checks on rolled-back version
4. **Update Traffic Routing**: Ensure services point to stable version
5. **Cleanup**: Remove failed deployment artifacts

## Troubleshooting

### Common Issues

#### Deployment Stuck
```bash
kubectl get pods -n team-dashboard-prod
kubectl describe pods -n team-dashboard-prod
kubectl logs -n team-dashboard-prod -l app=dashboard --tail=50
```

#### Service Unavailable
```bash
./scripts/deployment/health-check.sh production --verbose
kubectl get ingress -n team-dashboard-prod
kubectl describe ingress dashboard-ingress -n team-dashboard-prod
```

#### Database Connection Issues
```bash
kubectl exec -it deployment/redis -n team-dashboard-prod -- redis-cli ping
kubectl logs -n team-dashboard-prod -l app=agent-manager --tail=50
```

### Emergency Procedures

#### Complete Rollback
```bash
./scripts/deployment/rollback.sh --force
```

#### Scale Down (Emergency)
```bash
kubectl scale deployment dashboard --replicas=0 -n team-dashboard-prod
kubectl scale deployment agent-manager --replicas=0 -n team-dashboard-prod
```

#### Emergency Contact
- **Slack**: #team-dashboard-alerts
- **On-call**: Check PagerDuty rotation
- **Escalation**: Lead Developer or Project Manager

## Performance Targets

### Service Level Objectives (SLOs)
- **Availability**: 99.9% uptime
- **Response Time**: <2 seconds for 95th percentile
- **Error Rate**: <1% of requests
- **Recovery Time**: <5 minutes for rollback

### Resource Limits
- **Dashboard**: 512Mi memory, 500m CPU per pod
- **Agent Manager**: 1Gi memory, 1000m CPU per pod
- **MCP Manager**: 512Mi memory, 500m CPU per pod
- **OpenAI Service**: 512Mi memory, 500m CPU per pod

### Autoscaling Configuration
- **Dashboard**: 3-10 replicas based on CPU (70%) and memory (80%)
- **Agent Manager**: 2-8 replicas based on CPU (70%) and memory (80%)
- **Other Services**: 2-4 replicas based on CPU (70%)

## Security Considerations

### Network Policies
- Pod-to-pod communication restricted by labels
- External egress limited to required APIs
- Ingress controlled through NGINX ingress controller

### Secret Management
- Secrets stored in Kubernetes secrets (base64 encoded)
- Production secrets managed separately from code
- Regular secret rotation recommended

### Container Security
- Non-root user execution
- Read-only root filesystem where possible
- Security context configured for all containers
- Regular security scanning of base images

## Backup and Disaster Recovery

### Database Backups
- PostgreSQL: Daily automated backups with point-in-time recovery
- Redis: Persistent storage with AOF (Append Only File)

### Configuration Backups
- Kubernetes manifests versioned in Git
- Secret backups (encrypted) stored securely
- Infrastructure as Code for cluster recreation

### Recovery Procedures
1. **Service Recovery**: Use rollback procedures
2. **Data Recovery**: Restore from PostgreSQL backups
3. **Complete Disaster**: Recreate cluster from Infrastructure as Code

## Maintenance and Updates

### Regular Maintenance
- **Monthly**: Security updates for base images
- **Quarterly**: Kubernetes cluster updates
- **Bi-annually**: Major dependency updates

### Update Process
1. **Staging Validation**: Test all updates in staging first
2. **Blue-Green Deployment**: Use standard deployment process
3. **Monitoring**: Extended monitoring period after updates
4. **Documentation**: Update this document with changes

## Contributing to Deployment

### Prerequisites for Deployment Access
- Kubernetes cluster access (RBAC configured)
- GitHub repository write access
- Docker registry push permissions
- Secret management access for environment

### Development Workflow
1. **Feature Development**: Work in feature branches
2. **Staging Testing**: Deploy to staging via PR
3. **Production Deployment**: Merge to main triggers production deployment
4. **Monitoring**: Monitor deployment success and performance

For questions or issues with deployment, please refer to the troubleshooting section or contact the development team.