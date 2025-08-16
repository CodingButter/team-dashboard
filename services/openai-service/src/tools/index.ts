import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { FunctionToolDefinition } from '../types';

const execAsync = promisify(exec);

export const readFileToolDef: FunctionToolDefinition = {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute or relative path to the file to read'
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf8)',
          enum: ['utf8', 'ascii', 'base64', 'binary']
        }
      },
      required: ['path']
    }
  },
  handler: async (args: Record<string, any>) => {
    const { path: argPath, encoding = 'utf8' } = args as { path: string; encoding?: string };
    try {
      const filePath = path.resolve(argPath);
      const fileEncoding = encoding as BufferEncoding;
      const content = await fs.readFile(filePath, fileEncoding);
      
      return {
        success: true,
        content,
        path: filePath,
        size: content.length,
        encoding: fileEncoding
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
        path: argPath
      };
    }
  },
  maxExecutionTime: 5000,
  requiresApproval: false
};

export const writeFileToolDef: FunctionToolDefinition = {
  type: 'function',
  function: {
    name: 'write_file',
    description: 'Write content to a file on the filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute or relative path where to write the file'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf8)',
          enum: ['utf8', 'ascii', 'base64', 'binary']
        },
        createDirs: {
          type: 'boolean',
          description: 'Create parent directories if they don\'t exist (default: false)'
        }
      },
      required: ['path', 'content']
    }
  },
  handler: async (args: Record<string, any>) => {
    const { path: argPath, content, encoding = 'utf8', createDirs = false } = args as { 
      path: string; 
      content: string; 
      encoding?: string; 
      createDirs?: boolean; 
    };
    try {
      const filePath = path.resolve(argPath);
      const fileEncoding = encoding as BufferEncoding;
      
      if (createDirs) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }
      
      await fs.writeFile(filePath, content, fileEncoding);
      
      return {
        success: true,
        path: filePath,
        size: content.length,
        encoding: fileEncoding
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error writing file',
        path: argPath
      };
    }
  },
  maxExecutionTime: 10000,
  requiresApproval: true
};

export const executeBashToolDef: FunctionToolDefinition = {
  type: 'function',
  function: {
    name: 'execute_bash',
    description: 'Execute a bash command and return the output',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute'
        },
        workingDir: {
          type: 'string',
          description: 'Working directory for the command (default: current directory)'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)'
        }
      },
      required: ['command']
    }
  },
  handler: async (args: Record<string, any>) => {
    const { command, workingDir, timeout = 30000 } = args as { 
      command: string; 
      workingDir?: string; 
      timeout?: number; 
    };
    try {
      const options = {
        cwd: workingDir ? path.resolve(workingDir) : process.cwd(),
        timeout: timeout,
        maxBuffer: 1024 * 1024 // 1MB
      };
      
      const { stdout, stderr } = await execAsync(command, options);
      
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command: command,
        workingDir: options.cwd
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        command: command,
        exitCode: error.code
      };
    }
  },
  maxExecutionTime: 30000,
  requiresApproval: true
};

export const gitOperationToolDef: FunctionToolDefinition = {
  type: 'function',
  function: {
    name: 'git_operation',
    description: 'Execute git commands for version control operations',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Git operation to perform',
          enum: ['status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'diff', 'log']
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional arguments for the git command'
        },
        workingDir: {
          type: 'string',
          description: 'Git repository directory (default: current directory)'
        }
      },
      required: ['operation']
    }
  },
  handler: async (args: Record<string, any>) => {
    const { operation, args: gitArgs = [], workingDir } = args as { 
      operation: string; 
      args?: string[]; 
      workingDir?: string; 
    };
    try {
      const gitCommand = [operation, ...gitArgs];
      const command = `git ${gitCommand.join(' ')}`;
      
      const options = {
        cwd: workingDir ? path.resolve(workingDir) : process.cwd(),
        timeout: 30000,
        maxBuffer: 1024 * 1024
      };
      
      const { stdout, stderr } = await execAsync(command, options);
      
      return {
        success: true,
        output: stdout.trim(),
        error: stderr.trim(),
        operation: operation,
        command,
        workingDir: options.cwd
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || '',
        operation: operation,
        exitCode: error.code
      };
    }
  },
  maxExecutionTime: 30000,
  requiresApproval: true
};

export const DEFAULT_TOOLS: FunctionToolDefinition[] = [
  readFileToolDef,
  writeFileToolDef,
  executeBashToolDef,
  gitOperationToolDef
];

export function getToolByName(name: string): FunctionToolDefinition | undefined {
  return DEFAULT_TOOLS.find(tool => tool.function.name === name);
}