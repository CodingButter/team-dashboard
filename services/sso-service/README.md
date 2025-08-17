# Enterprise SSO Service

A comprehensive Single Sign-On (SSO) service supporting SAML 2.0, LDAP, multi-tenant architecture, and enterprise compliance frameworks including SOC2 Type II and HIPAA.

## Features

### Core Capabilities
- **SAML 2.0 Support**: Complete Service Provider implementation with metadata exchange, assertion validation, and Single Logout (SLO)
- **Active Directory Integration**: LDAP authentication, Azure AD support, group synchronization, and user provisioning
- **Multi-Tenant Architecture**: Complete tenant isolation, custom domains, and resource quotas
- **Enterprise Compliance**: SOC2 Type II, HIPAA, GDPR, and ISO 27001 compliance frameworks

### Security Features
- **Advanced Authentication**: Multi-factor authentication, risk-based authentication, device trust
- **Comprehensive Audit Logging**: 7-year retention, real-time alerts, compliance reporting
- **Session Management**: Enterprise security policies, concurrent session limits, idle timeouts
- **Encryption**: Data at rest and in transit, key rotation, compliance-grade security

### Performance & Reliability
- **Sub-200ms Authentication**: Optimized for enterprise performance requirements
- **99.99% Availability**: High availability architecture with health monitoring
- **1000+ Tenant Support**: Scalable multi-tenant design
- **Rate Limiting**: Intelligent rate limiting with tenant-aware policies

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Enterprise SSO Service                   │
├─────────────────────────────────────────────────────────────┤
│  Authentication    │  Provider Mgmt   │  Tenant Mgmt       │
│  - SAML 2.0        │  - SAML Config    │  - Multi-tenancy   │
│  - LDAP/AD         │  - LDAP Config    │  - Domain Mgmt     │
│  - OAuth2/OIDC     │  - Metadata       │  - Quotas          │
├─────────────────────────────────────────────────────────────┤
│  Compliance        │  Session Mgmt     │  Security          │
│  - SOC2 Type II    │  - Enterprise     │  - MFA             │
│  - HIPAA           │  - Redis Cache    │  - Risk Assessment │
│  - Audit Logs      │  - JWT Tokens     │  - Rate Limiting   │
├─────────────────────────────────────────────────────────────┤
│          Database (PostgreSQL)    │    Cache (Redis)       │
│          - Audit Logs             │    - Sessions          │
│          - Tenants                │    - Rate Limits       │
│          - Users & Providers      │    - Cache             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd services/sso-service
   pnpm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Dependencies**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d postgres redis
   
   # Or install locally
   # PostgreSQL and Redis setup...
   ```

4. **Run Development Server**
   ```bash
   pnpm run dev
   ```

### Docker Development

```bash
# Build and run with Docker
docker build -f Dockerfile.dev -t sso-service:dev .
docker run -p 3006:3006 --env-file .env sso-service:dev
```

## API Documentation

### Authentication Endpoints

#### Initiate SSO Authentication
```http
POST /api/sso/auth/initiate
Content-Type: application/json

{
  "providerId": "saml-provider-123",
  "tenantId": "tenant-abc",
  "returnUrl": "https://app.example.com/dashboard",
  "forceAuth": false
}
```

#### Handle SSO Callback
```http
POST /api/sso/auth/callback
Content-Type: application/x-www-form-urlencoded

SAMLResponse=<base64-encoded-response>&RelayState=<state>
```

#### SAML Metadata
```http
GET /api/sso/auth/metadata/{tenantId}
```

### Provider Management

#### List Providers
```http
GET /api/sso/providers
Authorization: Bearer <jwt-token>
```

#### Create Provider
```http
POST /api/sso/providers
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Corporate SAML",
  "type": "saml",
  "configuration": {
    "saml": {
      "entryPoint": "https://idp.corporate.com/sso",
      "issuer": "corporate-idp",
      "cert": "-----BEGIN CERTIFICATE-----..."
    }
  }
}
```

### Compliance Endpoints

#### Get Audit Logs
```http
GET /api/sso/compliance/audit/logs?tenantId=abc&limit=100
Authorization: Bearer <jwt-token>
```

#### Generate Compliance Report
```http
POST /api/sso/compliance/reports/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "framework": "soc2_type2",
  "tenantId": "tenant-abc",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

## Configuration

### Environment Variables

#### Core Configuration
```env
SSO_PORT=3006
SSO_BASE_URL=https://sso.yourdomain.com
SSO_ENTITY_ID=your-sso-service
```

#### Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=team_dashboard_sso
DB_USERNAME=postgres
DB_PASSWORD=secure-password
```

#### Security
```env
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12
```

#### Compliance
```env
COMPLIANCE_FRAMEWORKS=soc2_type2,hipaa
COMPLIANCE_AUDIT_RETENTION=2555  # 7 years in days
```

### SAML Configuration

#### Service Provider Metadata
The service automatically generates SAML metadata at:
- `/api/sso/auth/metadata/{tenantId}`

#### Required Certificates
Place your certificates in:
- `certs/cert.pem` - Public certificate
- `certs/key.pem` - Private key

## Compliance Frameworks

### SOC2 Type II
- Automated control implementation
- Continuous monitoring
- Audit trail generation
- Risk assessment

### HIPAA
- PHI data protection
- Access controls
- Audit logging
- Breach detection

### Additional Frameworks
- GDPR compliance
- ISO 27001 controls
- PCI DSS requirements
- NIST Cybersecurity Framework

## Multi-Tenant Architecture

### Tenant Configuration
```typescript
interface TenantConfiguration {
  id: string;
  name: string;
  domain: string;
  ssoProviders: string[];
  securityPolicies: SecurityPolicy[];
  resourceQuotas: ResourceQuotas;
  complianceSettings: ComplianceSettings;
}
```

### Data Isolation
- Complete tenant data separation
- Isolated audit logs
- Tenant-specific configurations
- Resource quotas and billing

### Custom Domains
- Subdomain support: `tenant.sso.example.com`
- Custom domain mapping: `sso.tenant.com`
- SSL certificate management
- Domain verification

## Security Features

### Authentication Methods
- SAML 2.0 with major IdPs
- LDAP/Active Directory
- OAuth 2.0/OpenID Connect
- Multi-factor authentication
- Risk-based authentication

### Session Security
- JWT with RS256 signatures
- Session timeout enforcement
- Concurrent session limits
- Device fingerprinting
- IP address validation

### Audit & Compliance
- Comprehensive event logging
- Real-time security alerts
- Compliance report generation
- Data retention policies
- Automated vulnerability scanning

## Performance Optimization

### Caching Strategy
- Redis session caching
- Provider metadata caching
- Rate limiting counters
- Configuration caching

### Database Optimization
- Indexed audit log queries
- Connection pooling
- Query performance monitoring
- Automated cleanup jobs

### Monitoring
- Prometheus metrics
- Health check endpoints
- Performance dashboards
- Alert management

## Development

### Scripts
```bash
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run test         # Run test suite
pnpm run lint         # Lint code
pnpm run typecheck    # TypeScript validation
```

### Testing
```bash
# Unit tests
pnpm run test:unit

# Integration tests
pnpm run test:integration

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:coverage
```

### Code Quality
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Pre-commit hooks
- Automated security scanning

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Redis cluster configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Security scan completed
- [ ] Compliance audit ready

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sso-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sso-service
  template:
    metadata:
      labels:
        app: sso-service
    spec:
      containers:
      - name: sso-service
        image: sso-service:latest
        ports:
        - containerPort: 3006
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## Troubleshooting

### Common Issues

#### SAML Authentication Failures
```bash
# Check provider configuration
GET /api/sso/providers/{id}

# Verify certificates
openssl x509 -in certs/cert.pem -text -noout

# Check audit logs
GET /api/sso/compliance/audit/logs?eventType=authentication
```

#### Performance Issues
```bash
# Check metrics
GET /metrics/sso

# Database performance
SELECT * FROM pg_stat_activity;

# Redis performance
redis-cli info stats
```

### Logging

#### Log Levels
- `error`: System errors and failures
- `warn`: Security alerts and violations
- `info`: Normal operations
- `audit`: Compliance and audit events
- `debug`: Detailed debugging information

#### Log Locations
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- `logs/audit.log` - Compliance audit logs

## Support

### Enterprise Support
- 24/7 technical support
- Implementation consulting
- Compliance advisory
- Custom integrations
- Training and documentation

### Community
- GitHub Issues
- Documentation Wiki
- Community Forum
- Stack Overflow

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## Roadmap

### Version 1.1
- [ ] Additional IdP support (Okta, OneLogin)
- [ ] Advanced reporting features
- [ ] Mobile device management
- [ ] API rate limiting enhancements

### Version 1.2
- [ ] Zero-trust architecture
- [ ] Advanced threat detection
- [ ] Machine learning risk scoring
- [ ] Global load balancing

### Version 2.0
- [ ] Blockchain identity verification
- [ ] Quantum-resistant encryption
- [ ] AI-powered compliance automation
- [ ] Advanced biometric authentication