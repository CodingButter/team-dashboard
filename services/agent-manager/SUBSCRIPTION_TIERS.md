# Subscription Tiers & Batch Processing Documentation

## Overview
This document outlines the subscription tier system and batch processing capabilities implemented for Issue #81. The system enforces agent limits and batch operation restrictions based on user subscription tiers.

## Subscription Tiers

### Free Tier
- **Max Agents**: 3
- **Max Concurrent Batches**: 1
- **Max Batch Size**: 5 operations
- **Priority Queue**: No
- **Features**: 
  - Basic agents
  - Single workflow
- **Target Audience**: Individual developers, testing
- **Cost**: $0/month

### Team Tier
- **Max Agents**: 10
- **Max Concurrent Batches**: 2
- **Max Batch Size**: 15 operations
- **Priority Queue**: No
- **Features**:
  - Basic agents
  - Workflows
  - Batch operations
  - Team collaboration
- **Target Audience**: Small development teams
- **Cost**: $29/month

### Pro Tier
- **Max Agents**: 25
- **Max Concurrent Batches**: 5
- **Max Batch Size**: 50 operations
- **Priority Queue**: Yes (Priority Level 10)
- **Features**:
  - Advanced agents
  - Unlimited workflows
  - Parallel batch processing
  - Priority support
- **Target Audience**: Growing businesses, power users
- **Cost**: $99/month

### Enterprise Tier
- **Max Agents**: 100
- **Max Concurrent Batches**: 10
- **Max Batch Size**: 200 operations
- **Priority Queue**: Yes (Priority Level 10)
- **Features**:
  - Enterprise agents
  - Custom workflows
  - Unlimited batch processing
  - Dedicated support
  - SLA guarantees
- **Target Audience**: Large organizations
- **Cost**: $499/month

## Batch Processing Features

### Queue-Based Processing
- Operations are queued and processed based on subscription tier priority
- Paid tiers (Pro/Enterprise) get higher priority in the queue
- Concurrent batch limits prevent system overload
- Failed operations support rollback and retry mechanisms

### Real-Time Updates
- WebSocket events provide live progress updates
- Status notifications: queued, processing, completed, failed, cancelled
- Progress tracking with percentage completion
- Error reporting with detailed failure information

### API Endpoints

#### Batch Operations
- `POST /batch` - Submit batch operation
- `GET /batch/:batchId` - Get batch status
- `DELETE /batch/:batchId` - Cancel batch operation

#### Specialized Batch Operations
- `POST /batch/spawn` - Batch spawn agents
- `POST /batch/terminate` - Batch terminate agents

#### Subscription Management
- `GET /subscription/:userId` - Get subscription info
- `PUT /subscription/:userId` - Update subscription tier

#### Monitoring
- `GET /batch/metrics` - Get processing metrics

### Use Cases Supported

1. **Deploy Multiple Agents**: Spin up multiple agents for parallel task execution
2. **Bulk Terminate Agents**: Clean up agents after sprint completion
3. **Mass Configuration Updates**: Apply settings changes across multiple agents
4. **Parallel Health Checks**: Monitor agent status across the fleet
5. **Subscription-Based Feature Gating**: Control access based on payment tier

## Integration with Stripe

### Subscription Management
- Each user subscription can include Stripe customer and subscription IDs
- Webhook integration for subscription status updates
- Automatic tier enforcement based on payment status
- Graceful handling of failed payments and downgrades

### Payment Processing Flow
1. User selects subscription tier
2. Stripe checkout process
3. Webhook confirms payment
4. Subscription service updates user tier
5. New limits immediately enforced

## Security & Compliance

### Access Control
- User-specific batch operations (users can only access their own batches)
- Subscription tier validation on every operation
- Secure API endpoints with proper error handling

### Data Protection
- No sensitive payment information stored locally
- Stripe handles all payment processing
- User subscription data encrypted in transit

## Performance Characteristics

### Batch Processing Performance
- Queue processing interval: 1 second
- Maximum concurrent batches: 5 system-wide
- Individual operation timeout: 30 seconds
- Batch operation timeout: 10 minutes

### Scaling Considerations
- In-memory queue (suitable for current scale)
- Consider Redis queue for production scaling
- WebSocket connection management for real-time updates
- Database persistence for audit trails

## Testing

### Comprehensive Test Coverage
- Subscription tier limit validation
- Batch queue processing
- WebSocket event broadcasting
- API endpoint validation
- Error handling scenarios

### Test Results
✅ Subscription tier limits properly enforced
✅ Batch operations queue and process correctly
✅ Priority queue works for paid tiers
✅ WebSocket events fire for all batch states
✅ API endpoints respond with proper status codes
✅ Error handling provides clear user feedback

## Monitoring & Metrics

### Available Metrics
- Active batch operations count
- Queue size and processing rate
- Subscription tier distribution
- User agent counts by tier
- WebSocket connection status

### Performance Monitoring
- Batch processing latency
- Queue wait times
- Operation success/failure rates
- System resource utilization

## Future Enhancements

### Planned Features
1. **Advanced Retry Logic**: Exponential backoff for failed operations
2. **Batch Templates**: Predefined operation sequences
3. **Scheduled Batches**: Time-based batch execution
4. **Batch Analytics**: Detailed performance and usage reporting
5. **Custom Tier Creation**: Enterprise-specific tier configurations

### Technical Improvements
1. **Persistent Queue**: Redis-based queue for reliability
2. **Horizontal Scaling**: Multi-instance batch processing
3. **Advanced Monitoring**: Grafana dashboards and alerts
4. **Audit Logging**: Comprehensive operation history
5. **API Rate Limiting**: Per-tier API rate controls