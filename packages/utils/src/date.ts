/**
 * Date formatting and manipulation utilities
 */

/**
 * Formats date to ISO string
 * @param date - Date to format
 * @returns ISO formatted date string
 */
export const formatToIso = (date: Date): string => {
  return date.toISOString()
}

/**
 * Formats date for display (YYYY-MM-DD)
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

/**
 * Checks if date is today
 * @param date - Date to check
 * @returns Boolean indicating if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

/**
 * Gets relative time string (e.g., "2 hours ago")
 * @param date - Date to get relative time for
 * @returns Relative time string
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}