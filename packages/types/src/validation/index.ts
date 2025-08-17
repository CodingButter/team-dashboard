/**
 * Validation Types and Utilities
 * @module validation
 */

// ============================================================================
// Base Validation Types
// ============================================================================

export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error';
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning';
  value?: any;
}

export type ValidationRule<T> = (value: T) => ValidationResult<T>;

export interface FieldValidator<T = any> {
  field: string;
  rules: ValidationRule<T>[];
  optional?: boolean;
  transform?: (value: any) => T;
}

// ============================================================================
// Schema Validation Types
// ============================================================================

export interface ValidationSchema {
  fields: Record<string, FieldSchema>;
  strict?: boolean;
  allowExtraFields?: boolean;
}

export interface FieldSchema {
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  array?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly any[];
  custom?: (value: any) => boolean;
  message?: string;
}

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url'
  | 'uuid'
  | 'json'
  | 'object'
  | 'any';

// ============================================================================
// Data Sanitization Types
// ============================================================================

export interface SanitizationOptions {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeHtml?: boolean;
  escapeHtml?: boolean;
  normalizeWhitespace?: boolean;
  maxLength?: number;
}

export interface DataSanitizer<T = any> {
  sanitize(data: T, options?: SanitizationOptions): T;
}

// ============================================================================
// Type Guards
// ============================================================================

export interface TypeGuard<T> {
  (value: unknown): value is T;
}

export interface TypeAssertion<T> {
  assert(value: unknown): asserts value is T;
  message?: string;
}

// ============================================================================
// Validation Context
// ============================================================================

export interface ValidationContext {
  path: string[];
  parent?: any;
  root?: any;
  strict?: boolean;
  locale?: string;
}

// ============================================================================
// Common Validators
// ============================================================================

export const CommonValidators = {
  required: <T>(value: T): boolean => value !== null && value !== undefined,
  
  string: (value: unknown): value is string => typeof value === 'string',
  
  number: (value: unknown): value is number => 
    typeof value === 'number' && !isNaN(value),
  
  boolean: (value: unknown): value is boolean => typeof value === 'boolean',
  
  array: <T>(value: unknown): value is T[] => Array.isArray(value),
  
  object: (value: unknown): value is Record<string, any> => 
    value !== null && typeof value === 'object' && !Array.isArray(value),
  
  email: (value: string): boolean => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  uuid: (value: string): boolean => 
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  
  minLength: (min: number) => (value: string | any[]): boolean => 
    value.length >= min,
  
  maxLength: (max: number) => (value: string | any[]): boolean => 
    value.length <= max,
  
  min: (min: number) => (value: number): boolean => value >= min,
  
  max: (max: number) => (value: number): boolean => value <= max,
  
  pattern: (pattern: RegExp) => (value: string): boolean => 
    pattern.test(value),
  
  enum: <T>(values: readonly T[]) => (value: T): boolean => 
    values.includes(value),
} as const;

// ============================================================================
// Validation Builder
// ============================================================================

export class ValidationBuilder<T = any> {
  private rules: ValidationRule<T>[] = [];
  
  required(message = 'Field is required'): this {
    this.rules.push((value) => ({
      valid: CommonValidators.required(value),
      errors: CommonValidators.required(value) ? [] : [{
        field: '',
        message,
        code: 'REQUIRED',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  string(message = 'Must be a string'): this {
    this.rules.push((value) => ({
      valid: CommonValidators.string(value),
      errors: CommonValidators.string(value) ? [] : [{
        field: '',
        message,
        code: 'TYPE_STRING',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  number(message = 'Must be a number'): this {
    this.rules.push((value) => ({
      valid: CommonValidators.number(value),
      errors: CommonValidators.number(value) ? [] : [{
        field: '',
        message,
        code: 'TYPE_NUMBER',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  min(min: number, message?: string): this {
    this.rules.push((value) => {
      const valid = typeof value === 'number' ? 
        CommonValidators.min(min)(value) : 
        CommonValidators.minLength(min)(value as any);
      return {
        valid,
        errors: valid ? [] : [{
          field: '',
          message: message || `Must be at least ${min}`,
          code: 'MIN',
          severity: 'error',
          value
        }]
      };
    });
    return this;
  }
  
  max(max: number, message?: string): this {
    this.rules.push((value) => {
      const valid = typeof value === 'number' ? 
        CommonValidators.max(max)(value) : 
        CommonValidators.maxLength(max)(value as any);
      return {
        valid,
        errors: valid ? [] : [{
          field: '',
          message: message || `Must be at most ${max}`,
          code: 'MAX',
          severity: 'error',
          value
        }]
      };
    });
    return this;
  }
  
  pattern(pattern: RegExp, message = 'Invalid format'): this {
    this.rules.push((value) => ({
      valid: typeof value === 'string' && CommonValidators.pattern(pattern)(value),
      errors: typeof value === 'string' && CommonValidators.pattern(pattern)(value) ? [] : [{
        field: '',
        message,
        code: 'PATTERN',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  email(message = 'Invalid email address'): this {
    this.rules.push((value) => ({
      valid: typeof value === 'string' && CommonValidators.email(value),
      errors: typeof value === 'string' && CommonValidators.email(value) ? [] : [{
        field: '',
        message,
        code: 'EMAIL',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  url(message = 'Invalid URL'): this {
    this.rules.push((value) => ({
      valid: typeof value === 'string' && CommonValidators.url(value),
      errors: typeof value === 'string' && CommonValidators.url(value) ? [] : [{
        field: '',
        message,
        code: 'URL',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  custom(validator: (value: T) => boolean, message = 'Validation failed'): this {
    this.rules.push((value) => ({
      valid: validator(value),
      errors: validator(value) ? [] : [{
        field: '',
        message,
        code: 'CUSTOM',
        severity: 'error',
        value
      }]
    }));
    return this;
  }
  
  build(): ValidationRule<T> {
    return (value: T) => {
      const errors: ValidationError[] = [];
      let valid = true;
      
      for (const rule of this.rules) {
        const result = rule(value);
        if (!result.valid) {
          valid = false;
          if (result.errors) {
            errors.push(...result.errors);
          }
        }
      }
      
      return { valid, errors, data: valid ? value : undefined };
    };
  }
}

// ============================================================================
// Export Utility Functions
// ============================================================================

export function validate<T>(value: T, schema: ValidationSchema): ValidationResult<T> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validated: any = {};
  
  for (const [field, fieldSchema] of Object.entries(schema.fields)) {
    const fieldValue = (value as any)[field];
    
    if (fieldSchema.required && !CommonValidators.required(fieldValue)) {
      errors.push({
        field,
        message: fieldSchema.message || `${field} is required`,
        code: 'REQUIRED',
        severity: 'error',
        value: fieldValue
      });
      continue;
    }
    
    if (fieldValue !== undefined && fieldValue !== null) {
      // Type validation
      const typeValid = validateType(fieldValue, fieldSchema.type);
      if (!typeValid) {
        errors.push({
          field,
          message: fieldSchema.message || `${field} must be of type ${fieldSchema.type}`,
          code: 'TYPE_MISMATCH',
          severity: 'error',
          value: fieldValue
        });
        continue;
      }
      
      // Additional validations
      if (fieldSchema.min !== undefined) {
        const minValid = typeof fieldValue === 'number' ? 
          fieldValue >= fieldSchema.min : 
          fieldValue.length >= fieldSchema.min;
        if (!minValid) {
          errors.push({
            field,
            message: fieldSchema.message || `${field} must be at least ${fieldSchema.min}`,
            code: 'MIN',
            severity: 'error',
            value: fieldValue
          });
        }
      }
      
      if (fieldSchema.max !== undefined) {
        const maxValid = typeof fieldValue === 'number' ? 
          fieldValue <= fieldSchema.max : 
          fieldValue.length <= fieldSchema.max;
        if (!maxValid) {
          errors.push({
            field,
            message: fieldSchema.message || `${field} must be at most ${fieldSchema.max}`,
            code: 'MAX',
            severity: 'error',
            value: fieldValue
          });
        }
      }
      
      if (fieldSchema.pattern && typeof fieldValue === 'string') {
        if (!fieldSchema.pattern.test(fieldValue)) {
          errors.push({
            field,
            message: fieldSchema.message || `${field} has invalid format`,
            code: 'PATTERN',
            severity: 'error',
            value: fieldValue
          });
        }
      }
      
      if (fieldSchema.enum && !fieldSchema.enum.includes(fieldValue)) {
        errors.push({
          field,
          message: fieldSchema.message || `${field} must be one of: ${fieldSchema.enum.join(', ')}`,
          code: 'ENUM',
          severity: 'error',
          value: fieldValue
        });
      }
      
      if (fieldSchema.custom && !fieldSchema.custom(fieldValue)) {
        errors.push({
          field,
          message: fieldSchema.message || `${field} failed custom validation`,
          code: 'CUSTOM',
          severity: 'error',
          value: fieldValue
        });
      }
      
      validated[field] = fieldValue;
    }
  }
  
  // Check for extra fields
  if (schema.strict && !schema.allowExtraFields) {
    for (const field of Object.keys(value as any)) {
      if (!(field in schema.fields)) {
        warnings.push({
          field,
          message: `Unknown field: ${field}`,
          code: 'EXTRA_FIELD',
          severity: 'warning',
          value: (value as any)[field]
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? validated as T : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

function validateType(value: any, type: FieldType): boolean {
  switch (type) {
    case 'string': return CommonValidators.string(value);
    case 'number': return CommonValidators.number(value);
    case 'boolean': return CommonValidators.boolean(value);
    case 'date': return value instanceof Date || !isNaN(Date.parse(value));
    case 'email': return CommonValidators.string(value) && CommonValidators.email(value);
    case 'url': return CommonValidators.string(value) && CommonValidators.url(value);
    case 'uuid': return CommonValidators.string(value) && CommonValidators.uuid(value);
    case 'json': {
      try {
        JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
    case 'object': return CommonValidators.object(value);
    case 'any': return true;
    default: return false;
  }
}