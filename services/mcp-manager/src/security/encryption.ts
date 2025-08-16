/**
 * @service mcp-manager/security
 * Encryption utilities for sensitive MCP configuration data
 */

import { createCipher, createDecipher, randomBytes } from 'crypto';
import { config } from '../config';

export class McpEncryption {
  private algorithm = 'aes-256-cbc';
  private key: string;

  constructor(key?: string) {
    this.key = key || config.mcp.encryptionKey;
  }

  /**
   * Encrypt sensitive data like API keys and passwords
   */
  encrypt(text: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipher(this.algorithm, this.key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Prepend IV to encrypted string
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = createDecipher(this.algorithm, this.key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt environment variables that are marked as encrypted
   */
  encryptEnvironmentVariables(variables: Array<{key: string; value: string; encrypted?: boolean}>): Array<{key: string; value: string; encrypted: boolean}> {
    return variables.map(variable => {
      if (variable.encrypted && variable.value) {
        return {
          ...variable,
          value: this.encrypt(variable.value),
          encrypted: true
        };
      }
      return {
        ...variable,
        encrypted: false
      };
    });
  }

  /**
   * Decrypt environment variables for runtime use
   */
  decryptEnvironmentVariables(variables: Array<{key: string; value: string; encrypted: boolean}>): Record<string, string> {
    const env: Record<string, string> = {};
    
    for (const variable of variables) {
      if (variable.encrypted && variable.value) {
        env[variable.key] = this.decrypt(variable.value);
      } else {
        env[variable.key] = variable.value;
      }
    }
    
    return env;
  }

  /**
   * Mask sensitive values for logging/display
   */
  maskSensitiveValue(value: string): string {
    if (!value || value.length <= 4) return '***';
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
}