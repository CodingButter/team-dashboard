import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * @param inputs - CSS class values to merge
 * @returns Merged CSS class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}