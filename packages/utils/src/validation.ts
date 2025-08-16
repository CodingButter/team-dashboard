import { z } from 'zod'

/**
 * Common validation schemas using Zod
 */

export const EmailSchema = z.string().email()
export const UrlSchema = z.string().url()
export const UuidSchema = z.string().uuid()

/**
 * Validates if a string is a valid email
 * @param email - Email string to validate
 * @returns boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success
}

/**
 * Validates if a string is a valid URL
 * @param url - URL string to validate
 * @returns boolean indicating if URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  return UrlSchema.safeParse(url).success
}