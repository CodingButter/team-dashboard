/**
 * String formatting utilities
 */

/**
 * Capitalizes first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Converts string to kebab-case
 * @param str - String to convert
 * @returns Kebab-case string
 */
export const toKebabCase = (str: string): string => {
  return str.replace(/\s+/g, '-').toLowerCase()
}

/**
 * Truncates string to specified length with ellipsis
 * @param str - String to truncate
 * @param length - Maximum length
 * @returns Truncated string
 */
export const truncate = (str: string, length: number): string => {
  return str.length <= length ? str : str.slice(0, length) + '...'
}