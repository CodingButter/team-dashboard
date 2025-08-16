import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatToIso, formatDate, isToday, getRelativeTime } from './date'

describe('date utilities', () => {
  let mockDate: Date

  beforeEach(() => {
    // Reset any date mocks
    vi.clearAllMocks()
    mockDate = new Date('2023-12-15T10:30:00.000Z')
  })

  describe('formatToIso', () => {
    it('formats date to ISO string', () => {
      const result = formatToIso(mockDate)
      expect(result).toBe('2023-12-15T10:30:00.000Z')
    })

    it('handles different dates', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      expect(formatToIso(date)).toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('formatDate', () => {
    it('formats date to YYYY-MM-DD', () => {
      const result = formatDate(mockDate)
      expect(result).toBe('2023-12-15')
    })

    it('handles different dates', () => {
      const date = new Date('2024-01-01T23:59:59.999Z')
      expect(formatDate(date)).toBe('2024-01-01')
    })

    it('handles dates with different times', () => {
      const morning = new Date('2023-12-15T08:00:00.000Z')
      const evening = new Date('2023-12-15T20:00:00.000Z')
      
      expect(formatDate(morning)).toBe('2023-12-15')
      expect(formatDate(evening)).toBe('2023-12-15')
    })
  })

  describe('isToday', () => {
    beforeEach(() => {
      // Mock the current date to be December 15, 2023
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-12-15T15:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true for today\'s date', () => {
      const today = new Date('2023-12-15T08:00:00.000Z')
      expect(isToday(today)).toBe(true)
    })

    it('correctly handles local timezone dates', () => {
      // This test verifies the function works with actual current date
      const now = new Date()
      expect(isToday(now)).toBe(true)
    })

    it('returns false for yesterday', () => {
      const yesterday = new Date('2023-12-14T15:00:00.000Z')
      expect(isToday(yesterday)).toBe(false)
    })

    it('returns false for tomorrow', () => {
      const tomorrow = new Date('2023-12-16T15:00:00.000Z')
      expect(isToday(tomorrow)).toBe(false)
    })
  })

  describe('getRelativeTime', () => {
    beforeEach(() => {
      // Mock current time to December 15, 2023, 15:00:00
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-12-15T15:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Just now" for very recent times', () => {
      const recent = new Date('2023-12-15T14:59:30.000Z') // 30 seconds ago
      expect(getRelativeTime(recent)).toBe('Just now')
    })

    it('returns minutes ago for times within an hour', () => {
      const fiveMinutesAgo = new Date('2023-12-15T14:55:00.000Z')
      const oneMinuteAgo = new Date('2023-12-15T14:59:00.000Z')
      
      expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago')
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago')
    })

    it('uses singular form for 1 minute', () => {
      const oneMinuteAgo = new Date('2023-12-15T14:59:00.000Z')
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago')
    })

    it('returns hours ago for times within a day', () => {
      const twoHoursAgo = new Date('2023-12-15T13:00:00.000Z')
      const oneHourAgo = new Date('2023-12-15T14:00:00.000Z')
      
      expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago')
      expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago')
    })

    it('uses singular form for 1 hour', () => {
      const oneHourAgo = new Date('2023-12-15T14:00:00.000Z')
      expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago')
    })

    it('returns days ago for older times', () => {
      const twoDaysAgo = new Date('2023-12-13T15:00:00.000Z')
      const oneDayAgo = new Date('2023-12-14T15:00:00.000Z')
      
      expect(getRelativeTime(twoDaysAgo)).toBe('2 days ago')
      expect(getRelativeTime(oneDayAgo)).toBe('1 day ago')
    })

    it('uses singular form for 1 day', () => {
      const oneDayAgo = new Date('2023-12-14T15:00:00.000Z')
      expect(getRelativeTime(oneDayAgo)).toBe('1 day ago')
    })

    it('handles edge cases correctly', () => {
      // Exactly 1 hour ago
      const exactlyOneHour = new Date('2023-12-15T14:00:00.000Z')
      expect(getRelativeTime(exactlyOneHour)).toBe('1 hour ago')
      
      // Exactly 1 day ago
      const exactlyOneDay = new Date('2023-12-14T15:00:00.000Z')
      expect(getRelativeTime(exactlyOneDay)).toBe('1 day ago')
    })
  })
})