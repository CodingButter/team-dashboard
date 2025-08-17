# URGENT MISSION: Production Deployment Pipeline - Issue #34

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #34 - Create production deployment pipeline  
**Priority**: P1 - HIGH PRIORITY
**Agent**: performance-engineering-specialist

## START CODING IMMEDIATELY!

### 1. CREATE GITHUB ACTIONS WORKFLOW:
**File**: `/.github/workflows/deploy-production.yml`

```yaml
name: Production Deployment Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test
      
      - name: Run type checking
        run: pnpm typecheck
      
      - name: Run linting
        run: pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Dashboard
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/dashboard/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/dashboard:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Build and push Agent Manager
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./services/agent-manager/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/agent-manager:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.event.inputs.environment || 'production' }}
      url: ${{ steps.deploy.outputs.url }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'
      
      - name: Deploy to Kubernetes
        id: deploy
        run: |
          # Update image tags in k8s manifests
          sed -i "s|IMAGE_TAG|${{ github.sha }}|g" k8s/production/*.yaml
          
          # Apply manifests
          kubectl apply -f k8s/production/
          
          # Wait for rollout
          kubectl rollout status deployment/dashboard -n team-dashboard
          kubectl rollout status deployment/agent-manager -n team-dashboard
          
          # Get service URL
          URL=$(kubectl get service dashboard -n team-dashboard -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
          echo "url=https://$URL" >> $GITHUB_OUTPUT
      
      - name: Run smoke tests
        run: |
          curl -f https://${{ steps.deploy.outputs.url }}/health || exit 1
          curl -f https://${{ steps.deploy.outputs.url }}/api/health || exit 1
```

### 2. CREATE PRODUCTION DOCKERFILE:
**File**: `/apps/dashboard/Dockerfile`

```dockerfile
# Production build for Dashboard
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@8.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/dashboard/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 3. CREATE KUBERNETES MANIFESTS:
**File**: `/k8s/production/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-dashboard
```

**File**: `/k8s/production/dashboard-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
  namespace: team-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
      - name: dashboard
        image: ghcr.io/team-dashboard/dashboard:IMAGE_TAG
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard
  namespace: team-dashboard
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: dashboard
```

### 4. CREATE TERRAFORM INFRASTRUCTURE:
**File**: `/infrastructure/terraform/main.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "team-dashboard-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "team-dashboard-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      desired_size = 3
      min_size     = 2
      max_size     = 10

      instance_types = ["t3.medium"]
      
      k8s_labels = {
        Environment = "production"
        Application = "team-dashboard"
      }
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "team-dashboard-db"
  
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "team_dashboard"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "team-dashboard-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "team-dashboard-redis"
  engine              = "redis"
  node_type           = "cache.t3.micro"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}

# S3 for backups
resource "aws_s3_bucket" "backups" {
  bucket = "team-dashboard-backups"
  
  lifecycle_rule {
    enabled = true
    
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 90
    }
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB"
    
    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

### 5. CREATE DEPLOYMENT SCRIPT:
**File**: `/scripts/deploy.sh`

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-$(git rev-parse --short HEAD)}

echo "🚀 Deploying Team Dashboard to $ENVIRONMENT"
echo "Version: $VERSION"

# Build and push Docker images
echo "📦 Building Docker images..."
docker build -t team-dashboard/dashboard:$VERSION -f apps/dashboard/Dockerfile .
docker build -t team-dashboard/agent-manager:$VERSION -f services/agent-manager/Dockerfile .

# Push to registry
echo "⬆️ Pushing to registry..."
docker tag team-dashboard/dashboard:$VERSION ghcr.io/team-dashboard/dashboard:$VERSION
docker tag team-dashboard/agent-manager:$VERSION ghcr.io/team-dashboard/agent-manager:$VERSION
docker push ghcr.io/team-dashboard/dashboard:$VERSION
docker push ghcr.io/team-dashboard/agent-manager:$VERSION

# Deploy to Kubernetes
echo "☸️ Deploying to Kubernetes..."
kubectl set image deployment/dashboard dashboard=ghcr.io/team-dashboard/dashboard:$VERSION -n team-dashboard
kubectl set image deployment/agent-manager agent-manager=ghcr.io/team-dashboard/agent-manager:$VERSION -n team-dashboard

# Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/dashboard -n team-dashboard
kubectl rollout status deployment/agent-manager -n team-dashboard

# Run health checks
echo "🏥 Running health checks..."
DASHBOARD_URL=$(kubectl get service dashboard -n team-dashboard -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -f http://$DASHBOARD_URL/health || exit 1

echo "✅ Deployment complete!"
echo "Dashboard URL: http://$DASHBOARD_URL"
```

## SUCCESS CRITERIA:
- [ ] GitHub Actions workflow triggers on main branch
- [ ] Docker images build and push successfully
- [ ] Kubernetes deployments update with new images
- [ ] Health checks pass after deployment
- [ ] Terraform provisions infrastructure correctly
- [ ] Zero-downtime deployments working

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Test GitHub Actions workflow locally with `act`
3. Deploy to staging environment first
4. Verify health checks pass
5. Create PR with title: "feat: Production deployment pipeline (Closes #34)"

**START CODING NOW! NO DELAYS!**