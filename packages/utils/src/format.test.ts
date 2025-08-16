import { describe, it, expect } from 'vitest'
import { capitalize, toKebabCase, truncate } from './format'

describe('format utilities', () => {
  describe('capitalize', () => {
    it('capitalizes the first letter of a string', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
    })

    it('handles empty strings', () => {
      expect(capitalize('')).toBe('')
    })

    it('handles single character strings', () => {
      expect(capitalize('a')).toBe('A')
    })

    it('does not change already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello')
    })

    it('only capitalizes the first letter', () => {
      expect(capitalize('hello world')).toBe('Hello world')
    })

    it('handles non-alphabetic first characters', () => {
      expect(capitalize('123abc')).toBe('123abc')
      expect(capitalize('!hello')).toBe('!hello')
    })
  })

  describe('toKebabCase', () => {
    it('converts spaces to hyphens', () => {
      expect(toKebabCase('hello world')).toBe('hello-world')
      expect(toKebabCase('multiple word string')).toBe('multiple-word-string')
    })

    it('converts to lowercase', () => {
      expect(toKebabCase('Hello World')).toBe('hello-world')
      expect(toKebabCase('UPPERCASE STRING')).toBe('uppercase-string')
    })

    it('handles multiple consecutive spaces', () => {
      expect(toKebabCase('hello    world')).toBe('hello-world')
      expect(toKebabCase('  spaced  out  ')).toBe('-spaced-out-')
    })

    it('handles strings without spaces', () => {
      expect(toKebabCase('hello')).toBe('hello')
      expect(toKebabCase('HELLO')).toBe('hello')
    })

    it('handles empty strings', () => {
      expect(toKebabCase('')).toBe('')
    })

    it('handles strings with only spaces', () => {
      expect(toKebabCase('   ')).toBe('-')
    })
  })

  describe('truncate', () => {
    it('truncates strings longer than the specified length', () => {
      expect(truncate('hello world', 8)).toBe('hello wo...')
      expect(truncate('this is a long string', 10)).toBe('this is a ...')
    })

    it('returns the original string if it is shorter than or equal to the length', () => {
      expect(truncate('hello', 10)).toBe('hello')
      expect(truncate('hello', 5)).toBe('hello')
    })

    it('handles empty strings', () => {
      expect(truncate('', 5)).toBe('')
    })

    it('handles zero length', () => {
      expect(truncate('hello', 0)).toBe('...')
    })

    it('handles negative length', () => {
      expect(truncate('hello', -1)).toBe('hell...')
    })

    it('handles length of 1', () => {
      expect(truncate('hello', 1)).toBe('h...')
    })

    it('handles length of 2', () => {
      expect(truncate('hello', 2)).toBe('he...')
    })

    it('handles strings exactly at the boundary', () => {
      expect(truncate('hello', 5)).toBe('hello')
      expect(truncate('hello', 4)).toBe('hell...')
    })
  })
})