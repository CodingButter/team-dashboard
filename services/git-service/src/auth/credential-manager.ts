import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Redis from 'ioredis';
import { Credentials } from '../types.js';

export class CredentialManager {
  private encryptionKey: string;
  private redis: Redis;
  private algorithm = 'aes-256-gcm';

  constructor(encryptionKey: string, redis: Redis) {
    this.encryptionKey = encryptionKey;
    this.redis = redis;
  }

  /**
   * Store encrypted credentials for a repository
   */
  async storeCredentials(repositoryId: string, credentials: Credentials): Promise<void> {
    try {
      const encrypted = this.encrypt(JSON.stringify(credentials));
      await this.redis.set(
        `git:credentials:${repositoryId}`,
        JSON.stringify(encrypted),
        'EX',
        86400 * 7 // 7 days
      );
    } catch (error: any) {
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt credentials for a repository
   */
  async getCredentials(repositoryId: string): Promise<Credentials | null> {
    try {
      const encryptedData = await this.redis.get(`git:credentials:${repositoryId}`);
      if (!encryptedData) {
        return null;
      }

      const encrypted = JSON.parse(encryptedData);
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error: any) {
      console.error(`Failed to retrieve credentials for ${repositoryId}:`, error);
      return null;
    }
  }

  /**
   * Remove credentials for a repository
   */
  async removeCredentials(repositoryId: string): Promise<void> {
    await this.redis.del(`git:credentials:${repositoryId}`);
  }

  /**
   * Generate SSH key pair
   */
  async generateSSHKeyPair(passphrase?: string): Promise<{ privateKey: string; publicKey: string }> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const tempDir = require('os').tmpdir();
      const keyPath = require('path').join(tempDir, `id_rsa_${Date.now()}`);
      
      const args = [
        '-t', 'rsa',
        '-b', '4096',
        '-f', keyPath,
        '-N', passphrase || '',
        '-C', 'git-service@team-dashboard'
      ];
      
      const sshKeygen = spawn('ssh-keygen', args);
      
      sshKeygen.on('close', (code) => {
        if (code === 0) {
          try {
            const fs = require('fs');
            const privateKey = fs.readFileSync(keyPath, 'utf8');
            const publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf8');
            
            // Cleanup temporary files
            fs.unlinkSync(keyPath);
            fs.unlinkSync(`${keyPath}.pub`);
            
            resolve({ privateKey, publicKey });
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`ssh-keygen failed with code ${code}`));
        }
      });
      
      sshKeygen.on('error', reject);
    });
  }

  /**
   * Validate credentials before storing
   */
  async validateCredentials(credentials: Credentials, testUrl?: string): Promise<boolean> {
    try {
      switch (credentials.type) {
        case 'ssh':
          return this.validateSSHCredentials(credentials);
        case 'https':
          return this.validateHTTPSCredentials(credentials, testUrl);
        case 'token':
          return this.validateTokenCredentials(credentials, testUrl);
        case 'oauth':
          return this.validateOAuthCredentials(credentials);
        default:
          return false;
      }
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('git-service'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('git-service'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validate SSH credentials
   */
  private validateSSHCredentials(credentials: any): boolean {
    return !!(
      credentials.privateKey &&
      credentials.publicKey &&
      credentials.privateKey.includes('BEGIN') &&
      credentials.publicKey.includes('ssh-rsa')
    );
  }

  /**
   * Validate HTTPS credentials
   */
  private async validateHTTPSCredentials(credentials: any, testUrl?: string): Promise<boolean> {
    if (!credentials.username || !credentials.password) {
      return false;
    }
    
    // If test URL provided, attempt a simple git ls-remote
    if (testUrl) {
      try {
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
          const git = spawn('git', ['ls-remote', testUrl], {
            env: {
              ...process.env,
              GIT_USERNAME: credentials.username,
              GIT_PASSWORD: credentials.password
            }
          });
          
          git.on('close', (code) => {
            resolve(code === 0);
          });
          
          git.on('error', () => {
            resolve(false);
          });
        });
      } catch {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate token credentials
   */
  private async validateTokenCredentials(credentials: any, testUrl?: string): Promise<boolean> {
    if (!credentials.token || !credentials.provider) {
      return false;
    }
    
    // Validate token format based on provider
    switch (credentials.provider) {
      case 'github':
        return credentials.token.startsWith('ghp_') || credentials.token.startsWith('github_pat_');
      case 'gitlab':
        return credentials.token.startsWith('glpat-');
      case 'bitbucket':
        return credentials.token.length > 10; // Basic validation
      default:
        return false;
    }
  }

  /**
   * Validate OAuth credentials
   */
  private validateOAuthCredentials(credentials: any): boolean {
    return !!(
      credentials.accessToken &&
      credentials.provider &&
      ['github', 'gitlab', 'bitbucket'].includes(credentials.provider)
    );
  }

  /**
   * Rotate encryption key (for security maintenance)
   */
  async rotateEncryptionKey(newKey: string): Promise<void> {
    // This would require re-encrypting all stored credentials
    // Implementation would depend on specific security requirements
    throw new Error('Key rotation not implemented - requires manual credential re-entry');
  }
}