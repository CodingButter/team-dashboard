/**
 * Enterprise SSO API Contracts
 * Comprehensive types for SAML 2.0, LDAP, multi-tenant architecture, and compliance
 */

import { ApiResponse } from './common';

// ============================================================================
// Core SSO Types
// ============================================================================

export type SSOProviderType = 'saml' | 'oidc' | 'ldap' | 'oauth2' | 'azure-ad';

export interface SSOProvider {
  id: string;
  type: SSOProviderType;
  name: string;
  displayName: string;
  configuration: ProviderConfiguration;
  metadata: ProviderMetadata;
  attributeMapping: AttributeMapping;
  validation: ValidationRules;
  enabled: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConfiguration {
  // SAML Configuration
  saml?: {
    entryPoint: string;
    issuer: string;
    cert: string;
    privateCert?: string;
    signatureAlgorithm: 'sha1' | 'sha256';
    digestAlgorithm: 'sha1' | 'sha256';
    wantAssertionsSigned: boolean;
    wantAuthnResponseSigned: boolean;
    callbackUrl: string;
    logoutUrl?: string;
    logoutCallbackUrl?: string;
  };
  
  // LDAP Configuration
  ldap?: {
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter: string;
    userAttribute: string;
    groupSearchBase?: string;
    groupSearchFilter?: string;
    tlsOptions?: {
      rejectUnauthorized: boolean;
      ca?: string[];
    };
  };
  
  // OAuth2/OIDC Configuration
  oauth?: {
    clientId: string;
    clientSecret: string;
    authorizationURL: string;
    tokenURL: string;
    userinfoURL?: string;
    scope: string[];
    responseType: string;
    grantType: string;
  };
}

export interface ProviderMetadata {
  displayName: string;
  description?: string;
  iconUrl?: string;
  supportUrl?: string;
  documentationUrl?: string;
  entityId?: string;
  certificate?: string;
  loginUrl?: string;
  logoutUrl?: string;
}

export interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  groups?: string;
  department?: string;
  title?: string;
  phoneNumber?: string;
  customAttributes?: Record<string, string>;
}

export interface ValidationRules {
  requireSignedAssertion: boolean;
  requireSignedResponse: boolean;
  allowIdpInitiated: boolean;
  sessionTimeout: number; // minutes
  maxSessionDuration: number; // hours
  enforceSessionBinding: boolean;
  requireMFA?: boolean;
  allowedGroups?: string[];
  blockedGroups?: string[];
}

// ============================================================================
// Multi-Tenant Architecture
// ============================================================================

export interface TenantConfiguration {
  id: string;
  name: string;
  domain: string;
  subdomain?: string;
  customDomain?: string;
  status: TenantStatus;
  ssoProviders: string[]; // Provider IDs
  userProvisioning: UserProvisioningConfig;
  securityPolicies: SecurityPolicy[];
  auditConfiguration: AuditConfiguration;
  resourceQuotas: ResourceQuotas;
  billingConfiguration: BillingConfiguration;
  complianceSettings: ComplianceSettings;
  createdAt: string;
  updatedAt: string;
}

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'deactivated';

export interface UserProvisioningConfig {
  autoCreateUsers: boolean;
  autoUpdateUsers: boolean;
  autoDeactivateUsers: boolean;
  defaultRole: string;
  defaultGroups: string[];
  requiredAttributes: string[];
  usernameMappingRule: string;
  emailMappingRule: string;
  groupMappingRules: Record<string, string>;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  type: SecurityPolicyType;
  configuration: SecurityPolicyConfig;
  enforced: boolean;
  exceptions: string[]; // User IDs or groups
}

export type SecurityPolicyType = 
  | 'password_policy' 
  | 'session_policy' 
  | 'mfa_policy' 
  | 'ip_restriction' 
  | 'device_trust'
  | 'risk_based_auth';

export interface SecurityPolicyConfig {
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    expirationDays: number;
  };
  
  sessionPolicy?: {
    maxDuration: number; // hours
    idleTimeout: number; // minutes
    concurrentSessions: number;
    requireReauth: boolean;
    reauthInterval: number; // hours
  };
  
  mfaPolicy?: {
    required: boolean;
    methods: string[];
    gracePeriod: number; // days
    bypassGroups: string[];
  };
  
  ipRestriction?: {
    allowedCidrs: string[];
    blockedCidrs: string[];
    allowPrivate: boolean;
    geoRestrictions: string[];
  };
}

export interface ResourceQuotas {
  maxUsers: number;
  maxAgents: number;
  maxSessions: number;
  storageLimit: number; // MB
  apiCallsPerDay: number;
  auditRetentionDays: number;
}

export interface BillingConfiguration {
  planId: string;
  subscriptionId?: string;
  billingContact: string;
  paymentMethod?: string;
  invoiceEmail: string;
  customPricing?: boolean;
}

// ============================================================================
// Compliance Framework
// ============================================================================

export interface ComplianceSettings {
  frameworks: ComplianceFramework[];
  auditLogger: AuditLoggerConfig;
  dataRetention: DataRetentionPolicy;
  encryption: EncryptionPolicy;
  reporting: ComplianceReporting;
}

export type ComplianceFramework = 
  | 'soc2_type2' 
  | 'hipaa' 
  | 'gdpr' 
  | 'iso27001' 
  | 'pci_dss' 
  | 'nist_csf';

export interface AuditConfiguration {
  enabled: boolean;
  retentionDays: number;
  logLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  eventTypes: AuditEventType[];
  destinations: AuditDestination[];
  realTimeAlerts: boolean;
  complianceReporting: boolean;
}

export type AuditEventType = 
  | 'authentication' 
  | 'authorization' 
  | 'session' 
  | 'user_provisioning'
  | 'configuration_change' 
  | 'security_event' 
  | 'compliance_event'
  | 'data_access'
  | 'admin_action';

export interface AuditDestination {
  type: 'database' | 'file' | 'syslog' | 'webhook' | 'siem';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface AuditLoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  includeHeaders: boolean;
  includeBody: boolean;
  sanitizePasswords: boolean;
  maxBodySize: number;
}

export interface DataRetentionPolicy {
  auditLogs: number; // days
  sessionData: number; // days
  userActivity: number; // days
  securityEvents: number; // days
  complianceReports: number; // years
  automaticPurging: boolean;
}

export interface EncryptionPolicy {
  atRest: {
    algorithm: string;
    keyRotationDays: number;
    keyManagement: 'internal' | 'aws_kms' | 'azure_vault' | 'hashicorp_vault';
  };
  inTransit: {
    minTlsVersion: '1.2' | '1.3';
    cipherSuites: string[];
    requireClientCerts: boolean;
  };
  dataClassification: {
    pii: 'required' | 'recommended' | 'optional';
    phi: 'required' | 'recommended' | 'optional';
    confidential: 'required' | 'recommended' | 'optional';
  };
}

export interface ComplianceReporting {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  includeMetrics: boolean;
  includeViolations: boolean;
  customReports: ComplianceReport[];
}

export interface ComplianceReport {
  id: string;
  name: string;
  framework: ComplianceFramework;
  schedule: string; // cron expression
  template: string;
  recipients: string[];
}

// ============================================================================
// Authentication & Session Management
// ============================================================================

export interface SSOAuthRequest {
  providerId: string;
  tenantId: string;
  returnUrl?: string;
  forceAuth?: boolean;
  metadata?: Record<string, any>;
}

export interface SSOAuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: EnterpriseUser;
  session?: EnterpriseSession;
  redirectUrl?: string;
  error?: SSOError;
}

export interface EnterpriseUser {
  id: string;
  tenantId: string;
  providerId: string;
  externalId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  groups: string[];
  roles: string[];
  permissions: string[];
  attributes: Record<string, any>;
  status: UserStatus;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  complianceFlags: ComplianceFlags;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface ComplianceFlags {
  dataProcessingConsent: boolean;
  termsAccepted: boolean;
  backgroundCheckStatus?: 'pending' | 'approved' | 'rejected';
  trainingCompleted: string[];
  accessReviewDate?: string;
}

export interface EnterpriseSession {
  id: string;
  userId: string;
  tenantId: string;
  providerId: string;
  type: SessionType;
  status: SessionStatus;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  riskScore?: number;
  metadata: SessionMetadata;
}

export type SessionType = 'sso' | 'local' | 'api' | 'service';
export type SessionStatus = 'active' | 'expired' | 'terminated' | 'suspicious';

export interface SessionMetadata {
  authMethod: string;
  mfaVerified: boolean;
  stepUpAuth?: boolean;
  riskFactors: string[];
  geolocation?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface SSOError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  correlationId: string;
}

// ============================================================================
// API Endpoints
// ============================================================================

export interface SSOApiEndpoints {
  // Provider Management
  'GET /api/sso/providers': () => Promise<ApiResponse<SSOProvider[]>>;
  'POST /api/sso/providers': (body: Partial<SSOProvider>) => Promise<ApiResponse<SSOProvider>>;
  'GET /api/sso/providers/:id': (id: string) => Promise<ApiResponse<SSOProvider>>;
  'PUT /api/sso/providers/:id': (id: string, body: Partial<SSOProvider>) => Promise<ApiResponse<SSOProvider>>;
  'DELETE /api/sso/providers/:id': (id: string) => Promise<ApiResponse<void>>;
  
  // Authentication
  'POST /api/sso/auth/initiate': (body: SSOAuthRequest) => Promise<ApiResponse<{ redirectUrl: string }>>;
  'POST /api/sso/auth/callback': (body: any) => Promise<ApiResponse<SSOAuthResponse>>;
  'POST /api/sso/auth/logout': () => Promise<ApiResponse<void>>;
  
  // Tenant Management
  'GET /api/sso/tenants': () => Promise<ApiResponse<TenantConfiguration[]>>;
  'POST /api/sso/tenants': (body: Partial<TenantConfiguration>) => Promise<ApiResponse<TenantConfiguration>>;
  'GET /api/sso/tenants/:id': (id: string) => Promise<ApiResponse<TenantConfiguration>>;
  'PUT /api/sso/tenants/:id': (id: string, body: Partial<TenantConfiguration>) => Promise<ApiResponse<TenantConfiguration>>;
  
  // User Management
  'GET /api/sso/users': () => Promise<ApiResponse<EnterpriseUser[]>>;
  'POST /api/sso/users/provision': (body: any) => Promise<ApiResponse<EnterpriseUser>>;
  'PUT /api/sso/users/:id/status': (id: string, body: { status: UserStatus }) => Promise<ApiResponse<void>>;
  
  // Compliance & Audit
  'GET /api/sso/audit/logs': () => Promise<ApiResponse<AuditLog[]>>;
  'GET /api/sso/compliance/reports': () => Promise<ApiResponse<ComplianceReport[]>>;
  'POST /api/sso/compliance/reports/generate': (body: any) => Promise<ApiResponse<void>>;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  eventType: AuditEventType;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'error';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  riskScore?: number;
  complianceFlags: string[];
}

// ============================================================================
// Configuration & Metadata
// ============================================================================

export interface SSOConfiguration {
  serviceName: string;
  baseUrl: string;
  entityId: string;
  certificatePath: string;
  privateKeyPath: string;
  defaultProvider?: string;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  enableAuditLogging: boolean;
  complianceMode: boolean;
  encryptionRequired: boolean;
}

export interface SSOMetadata {
  entityId: string;
  singleSignOnService: string;
  singleLogoutService: string;
  certificate: string;
  supportedNameIdFormats: string[];
  attributeConsuming: {
    serviceName: string;
    requestedAttributes: RequestedAttribute[];
  };
}

export interface RequestedAttribute {
  name: string;
  nameFormat?: string;
  isRequired: boolean;
  friendlyName?: string;
}

// ============================================================================
// Events & Notifications
// ============================================================================

export interface SSOEvent {
  id: string;
  type: SSOEventType;
  tenantId: string;
  userId?: string;
  providerId?: string;
  timestamp: string;
  data: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export type SSOEventType = 
  | 'user_authenticated'
  | 'user_logout'
  | 'user_provisioned'
  | 'user_deprovisioned'
  | 'session_created'
  | 'session_terminated'
  | 'configuration_changed'
  | 'security_violation'
  | 'compliance_violation'
  | 'provider_error'
  | 'audit_event';

export interface SSONotification {
  id: string;
  type: 'email' | 'webhook' | 'sms' | 'slack';
  recipients: string[];
  subject: string;
  message: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}