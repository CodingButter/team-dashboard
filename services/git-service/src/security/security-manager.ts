import path from 'path';
import { URL } from 'url';

export class SecurityManager {
  private allowedDomains: Set<string> = new Set([
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'dev.azure.com',
    'ssh.dev.azure.com',
    'gitlab.example.com' // Allow self-hosted GitLab instances
  ]);

  private blockedPatterns: RegExp[] = [
    /javascript:/i,
    /data:/i,
    /file:/i,
    /ftp:/i,
    /\.\.[\\/]/g, // Directory traversal
    /[<>:"\\|?*]/g, // Invalid filename characters
  ];

  /**
   * Validate repository URL for security
   */
  validateRepositoryUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:', 'git:', 'ssh:'].includes(parsedUrl.protocol)) {
        throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
      }
      
      // Check for blocked patterns
      for (const pattern of this.blockedPatterns) {
        if (pattern.test(url)) {
          throw new Error('URL contains blocked patterns');
        }
      }
      
      // Check domain allowlist (if not localhost/private IP)
      if (!this.isPrivateOrLocalhost(parsedUrl.hostname)) {
        if (!this.allowedDomains.has(parsedUrl.hostname)) {
          // Allow subdomain matching for common services
          const isSubdomainAllowed = Array.from(this.allowedDomains).some(domain => 
            parsedUrl.hostname.endsWith(`.${domain}`)
          );
          
          if (!isSubdomainAllowed) {
            throw new Error(`Domain not allowed: ${parsedUrl.hostname}`);
          }
        }
      }
      
      // Additional security checks
      if (parsedUrl.pathname.includes('..')) {
        throw new Error('Path traversal detected in URL');
      }
      
    } catch (error: any) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Validate branch name for security
   */
  validateBranchName(branchName: string): void {
    // Git branch name rules
    const invalidPatterns = [
      /^-/, // Cannot start with dash
      /\.\.|@@|\s/, // Cannot contain .. or @@ or spaces
      /[~^:?*\[]/, // Cannot contain special characters
      /\.$/, // Cannot end with dot
      /\/$/, // Cannot end with slash
      /\/\//, // Cannot contain consecutive slashes
      /^\/|^\.|^@/, // Cannot start with /, ., or @
      /\.lock$/ // Cannot end with .lock
    ];

    if (!branchName || branchName.length === 0) {
      throw new Error('Branch name cannot be empty');
    }

    if (branchName.length > 250) {
      throw new Error('Branch name too long (max 250 characters)');
    }

    for (const pattern of invalidPatterns) {
      if (pattern.test(branchName)) {
        throw new Error(`Invalid branch name: ${branchName}`);
      }
    }

    // Check for control characters
    if (/[\x00-\x1f\x7f]/.test(branchName)) {
      throw new Error('Branch name contains control characters');
    }
  }

  /**
   * Validate file path for security
   */
  validateFilePath(filePath: string): void {
    // Normalize path
    const normalizedPath = path.normalize(filePath);
    
    // Check for directory traversal
    if (normalizedPath.includes('..')) {
      throw new Error('Directory traversal detected in file path');
    }
    
    // Check for absolute paths (should be relative)
    if (path.isAbsolute(normalizedPath)) {
      throw new Error('Absolute paths not allowed');
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"\\|?*\x00-\x1f]/g;
    if (invalidChars.test(filePath)) {
      throw new Error('File path contains invalid characters');
    }
    
    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    const fileName = path.basename(normalizedPath);
    if (reservedNames.test(fileName)) {
      throw new Error('File name is reserved');
    }
    
    // Check length
    if (filePath.length > 4096) {
      throw new Error('File path too long');
    }
  }

  /**
   * Validate commit message for security
   */
  validateCommitMessage(message: string): void {
    if (!message || message.trim().length === 0) {
      throw new Error('Commit message cannot be empty');
    }
    
    if (message.length > 50000) {
      throw new Error('Commit message too long (max 50KB)');
    }
    
    // Check for potential injection attempts
    const suspiciousPatterns = [
      /`[^`]*`/, // Backticks (command substitution)
      /\$\([^)]*\)/, // Command substitution
      /\$\{[^}]*\}/, // Variable expansion
      /<!--[\s\S]*?-->/, // HTML comments
      /<script[\s\S]*?<\/script>/i, // Script tags
      /javascript:/i, // JavaScript protocol
      /data:/i, // Data protocol
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(message)) {
        throw new Error('Commit message contains potentially dangerous content');
      }
    }
    
    // Check for excessive newlines (potential DoS)
    const lineCount = message.split('\n').length;
    if (lineCount > 1000) {
      throw new Error('Too many lines in commit message');
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/["`]/g, '') // Remove quotes and backticks
      .replace(/\$\{.*?\}/g, '') // Remove variable expansion
      .replace(/\$\(.*?\)/g, '') // Remove command substitution
      .trim();
  }

  /**
   * Check if hostname is private or localhost
   */
  private isPrivateOrLocalhost(hostname: string): boolean {
    // Localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    
    // Private IP ranges
    const privateRanges = [
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^169\.254\./, // 169.254.0.0/16 (link-local)
      /^fc00:/, // fc00::/7 (unique local)
      /^fe80:/, // fe80::/10 (link-local)
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * Add allowed domain
   */
  addAllowedDomain(domain: string): void {
    this.allowedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove allowed domain
   */
  removeAllowedDomain(domain: string): void {
    this.allowedDomains.delete(domain.toLowerCase());
  }

  /**
   * Get all allowed domains
   */
  getAllowedDomains(): string[] {
    return Array.from(this.allowedDomains);
  }

  /**
   * Validate repository size limits
   */
  validateRepositorySize(sizeInBytes: number): void {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (sizeInBytes > maxSize) {
      throw new Error(`Repository size exceeds limit: ${sizeInBytes} bytes (max: ${maxSize})`);
    }
  }

  /**
   * Rate limiting check (placeholder - would integrate with Redis)
   */
  checkRateLimit(identifier: string, operation: string): boolean {
    // TODO: Implement rate limiting with Redis
    // For now, always allow
    return true;
  }

  /**
   * Audit log security event
   */
  auditSecurityEvent(event: {
    type: 'validation_failure' | 'suspicious_activity' | 'rate_limit_exceeded';
    source: string;
    details: any;
    timestamp?: Date;
  }): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
      severity: this.getEventSeverity(event.type)
    };
    
    // TODO: Send to centralized logging system
    console.warn('Security Event:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Get severity level for security events
   */
  private getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'validation_failure':
        return 'medium';
      case 'suspicious_activity':
        return 'high';
      case 'rate_limit_exceeded':
        return 'low';
      default:
        return 'medium';
    }
  }
}