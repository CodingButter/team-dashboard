/**
 * AI Model Integration Hub - Core Types
 * 
 * Comprehensive type definitions for multi-provider AI model integration
 * with intelligent routing, cost optimization, and performance monitoring.
 */

export interface ProviderConfig {
  id: string;
  type: 'openai' | 'anthropic' | 'google' | 'local' | 'replicate';
  name: string;
  apiKey?: string;
  endpoint?: string;
  models: ModelDefinition[];
  rateLimit: RateLimitConfig;
  pricing: PricingConfig;
  capabilities: ModelCapability[];
  priority: number; // 1-10, higher = preferred
  healthCheckUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ModelDefinition {
  id: string;
  name: string;
  providerId: string;
  maxTokens: number;
  inputCostPer1k: number;  // USD per 1k input tokens
  outputCostPer1k: number; // USD per 1k output tokens
  capabilities: ModelCapability[];
  averageLatency: number; // ms
  maxConcurrency: number;
  contextWindow: number;
  supportedFeatures: ModelFeature[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  tokensPerDay?: number;
  concurrentRequests: number;
}

export interface PricingConfig {
  inputTokenCost: number;   // USD per 1k tokens
  outputTokenCost: number;  // USD per 1k tokens
  minimumCharge?: number;   // USD minimum per request
  volume_discounts?: VolumeDiscount[];
}

export interface VolumeDiscount {
  threshold: number; // tokens per month
  discountPercent: number;
}

export type ModelCapability = 
  | 'text-generation'
  | 'code-generation' 
  | 'function-calling'
  | 'vision'
  | 'multimodal'
  | 'streaming'
  | 'embeddings'
  | 'fine-tuning';

export type ModelFeature =
  | 'json-mode'
  | 'system-prompts'
  | 'tool-calling'
  | 'vision-input'
  | 'audio-input'
  | 'streaming-response'
  | 'context-caching'
  | 'batch-processing';

export interface RouterConfig {
  strategy: RoutingStrategy;
  costThreshold: number;      // Max cost per request in USD
  latencyThreshold: number;   // Max acceptable latency in ms
  qualityThreshold: number;   // Min quality score (0-1)
  enableFallback: boolean;
  fallbackChain: string[];    // Model IDs in fallback order
  loadBalancing: LoadBalancingStrategy;
  cacheEnabled: boolean;
  cacheTTL: number;          // seconds
}

export type RoutingStrategy = 
  | 'cost-optimized'
  | 'performance-first'
  | 'quality-first'
  | 'balanced'
  | 'custom';

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-connections'
  | 'weighted-round-robin'
  | 'performance-based';

export interface ModelRequest {
  id: string;
  messages: ChatMessage[];
  model?: string;           // Specific model or let router decide
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
  sessionId?: string;
  priority?: 'low' | 'normal' | 'high';
  requirements?: RequestRequirements;
}

export interface RequestRequirements {
  maxCost?: number;        // USD
  maxLatency?: number;     // ms
  requiredCapabilities?: ModelCapability[];
  requiredFeatures?: ModelFeature[];
  excludeProviders?: string[];
  preferredProvider?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ModelResponse {
  id: string;
  model: string;
  providerId: string;
  content?: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: TokenUsage;
  cost: number;
  latency: number;
  cached: boolean;
  metadata: ResponseMetadata;
}

export interface StreamChunk {
  id: string;
  type: 'content' | 'tool_call' | 'usage' | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
  error?: string;
  metadata?: ResponseMetadata;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResponseMetadata {
  model: string;
  providerId: string;
  latency: number;
  cost: number;
  cached: boolean;
  timestamp: number;
  requestId: string;
  retryCount?: number;
  fallbackUsed?: boolean;
}

export interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: number;
  availability: number; // 0-1
  rateLimitRemaining: number;
  rateLimitReset: number;
}

export interface PerformanceMetrics {
  providerId: string;
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  averageCost: number;
  totalCost: number;
  tokensProcessed: number;
  errorRate: number;
  cacheHitRate: number;
  lastUpdated: number;
}

export interface CostAnalysis {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  estimatedMonthlyCost: number;
  costPerRequest: number;
  costPerToken: number;
  savingsVsBaseline: number; // % savings vs single provider
  budgetRemaining?: number;
  budgetAlerts: BudgetAlert[];
}

export interface BudgetAlert {
  type: 'warning' | 'critical' | 'exceeded';
  threshold: number;
  current: number;
  message: string;
  timestamp: number;
}

export interface ModelBenchmark {
  modelId: string;
  providerId: string;
  qualityScore: number;    // 0-1
  latencyScore: number;    // 0-1
  costScore: number;       // 0-1
  overallScore: number;    // 0-1
  testResults: BenchmarkResult[];
  lastBenchmarked: number;
}

export interface BenchmarkResult {
  testType: string;
  score: number;
  latency: number;
  cost: number;
  details: Record<string, any>;
}

export interface RouterDecision {
  selectedModel: string;
  providerId: string;
  reasoning: string[];
  alternativeModels: string[];
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: number;
  confidence: number; // 0-1
}

export interface CacheEntry {
  key: string;
  response: ModelResponse;
  timestamp: number;
  ttl: number;
  hitCount: number;
  size: number; // bytes
}

export interface ProviderInterface {
  id: string;
  name: string;
  
  // Core methods
  initialize(config: ProviderConfig): Promise<void>;
  chat(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest): AsyncGenerator<StreamChunk>;
  
  // Health and monitoring
  healthCheck(): Promise<ProviderHealth>;
  getMetrics(): Promise<PerformanceMetrics>;
  
  // Model management
  listModels(): Promise<ModelDefinition[]>;
  getModel(modelId: string): Promise<ModelDefinition | null>;
  
  // Cost and usage
  estimateCost(messages: ChatMessage[], model?: string): Promise<number>;
  getRateLimits(): Promise<RateLimitConfig>;
  
  // Lifecycle
  shutdown(): Promise<void>;
}

export interface ModelHubInterface {
  // Provider management
  registerProvider(provider: ProviderInterface, config: ProviderConfig): Promise<void>;
  unregisterProvider(providerId: string): Promise<void>;
  listProviders(): Promise<ProviderConfig[]>;
  
  // Model operations
  chat(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest): AsyncGenerator<StreamChunk>;
  
  // Routing and optimization
  selectModel(request: ModelRequest): Promise<RouterDecision>;
  benchmark(modelIds?: string[]): Promise<ModelBenchmark[]>;
  
  // Monitoring and analytics
  getMetrics(): Promise<PerformanceMetrics[]>;
  getCostAnalysis(timeRange?: string): Promise<CostAnalysis>;
  getHealth(): Promise<ProviderHealth[]>;
  
  // Configuration
  updateRouterConfig(config: Partial<RouterConfig>): Promise<void>;
  setBudgetLimits(limits: BudgetLimits): Promise<void>;
}

export interface BudgetLimits {
  dailyLimit?: number;
  monthlyLimit?: number;
  perRequestLimit?: number;
  warningThreshold?: number; // % of limit
  criticalThreshold?: number; // % of limit
}

export interface HubConfig {
  router: RouterConfig;
  cache: CacheConfig;
  monitoring: MonitoringConfig;
  budget: BudgetLimits;
  providers: ProviderConfig[];
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number; // MB
  strategy: 'lru' | 'lfu' | 'ttl';
  compression: boolean;
}

export interface MonitoringConfig {
  metricsEnabled: boolean;
  healthCheckInterval: number; // seconds
  alertThresholds: AlertThresholds;
  exportPrometheus: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AlertThresholds {
  errorRate: number;      // %
  latency: number;        // ms
  availability: number;   // %
  costIncrease: number;   // %
}