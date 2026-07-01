/**
 * String utility functions
 *
 * @remarks
 * A collection of commonly used string manipulation utilities.
 *
 * @packageDocumentation
 */

/**
 * Capitalizes the first letter of a string
 *
 * @param str - The input string
 * @returns String with first letter capitalized
 *
 * @example
 * ```typescript
 * capitalize('hello') // 'Hello'
 * capitalize('WORLD') // 'WORLD'
 * capitalize('') // ''
 * ```
 *
 * @public
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Converts a string to camelCase
 *
 * @param str - The input string (can be kebab-case, snake_case, or space-separated)
 * @returns camelCased string
 *
 * @example
 * ```typescript
 * camelCase('hello-world') // 'helloWorld'
 * camelCase('hello_world') // 'helloWorld'
 * camelCase('Hello World') // 'helloWorld'
 * ```
 *
 * @public
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toLowerCase())
}

/**
 * Converts a string to kebab-case
 *
 * @param str - The input string
 * @returns kebab-cased string
 *
 * @example
 * ```typescript
 * kebabCase('helloWorld') // 'hello-world'
 * kebabCase('HelloWorld') // 'hello-world'
 * kebabCase('hello_world') // 'hello-world'
 * ```
 *
 * @public
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * Converts a string to snake_case
 *
 * @param str - The input string
 * @returns snake_cased string
 *
 * @example
 * ```typescript
 * snakeCase('helloWorld') // 'hello_world'
 * snakeCase('HelloWorld') // 'hello_world'
 * snakeCase('hello-world') // 'hello_world'
 * ```
 *
 * @public
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

/**
 * Converts a string to PascalCase
 *
 * @param str - The input string
 * @returns PascalCased string
 *
 * @example
 * ```typescript
 * pascalCase('hello-world') // 'HelloWorld'
 * pascalCase('hello_world') // 'HelloWorld'
 * pascalCase('helloWorld') // 'HelloWorld'
 * ```
 *
 * @public
 */
export function pascalCase(str: string): string {
  return capitalize(camelCase(str))
}

/**
 * Truncates a string to a specified length
 *
 * @param str - The input string
 * @param maxLength - Maximum length of the result
 * @param suffix - Suffix to append if truncated
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncate('Hello World', 5) // 'Hello...'
 * truncate('Hello World', 5, '…') // 'Hello…'
 * truncate('Hi', 10) // 'Hi'
 * ```
 *
 * @public
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + suffix
}

/**
 * Pads a string on the left
 *
 * @param str - The input string
 * @param length - Target length
 * @param char - Character to pad with
 * @returns Padded string
 *
 * @example
 * ```typescript
 * padLeft('5', 3, '0') // '005'
 * padLeft('hello', 10, ' ') // '     hello'
 * ```
 *
 * @public
 */
export function padLeft(str: string, length: number, char = ' '): string {
  if (str.length >= length) return str
  return char.repeat(length - str.length) + str
}

/**
 * Pads a string on the right
 *
 * @param str - The input string
 * @param length - Target length
 * @param char - Character to pad with
 * @returns Padded string
 *
 * @example
 * ```typescript
 * padRight('5', 3, '0') // '500'
 * padRight('hello', 10, '.') // 'hello.....'
 * ```
 *
 * @public
 */
export function padRight(str: string, length: number, char = ' '): string {
  if (str.length >= length) return str
  return str + char.repeat(length - str.length)
}

/**
 * Checks if a string is empty or contains only whitespace
 *
 * @param str - The input string
 * @returns True if string is empty or whitespace only
 *
 * @example
 * ```typescript
 * isBlank('') // true
 * isBlank('   ') // true
 * isBlank('hello') // false
 * isBlank('  hi  ') // false
 * ```
 *
 * @public
 */
export function isBlank(str: string): boolean {
  return str.trim().length === 0
}

/**
 * Escapes HTML special characters in a string
 *
 * @param str - The input string
 * @returns String with HTML characters escaped
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>')
 * // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 *
 * @public
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => escapeMap[char])
}

/**
 * Unescapes HTML special characters in a string
 *
 * @param str - The escaped string
 * @returns String with HTML characters unescaped
 *
 * @example
 * ```typescript
 * unescapeHtml('&lt;div&gt;') // '<div>'
 * ```
 *
 * @public
 */
export function unescapeHtml(str: string): string {
  const unescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  }
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => unescapeMap[entity] ?? entity)
}

/**
 * Generates a slug from a string
 *
 * @param str - The input string
 * @returns URL-safe slug
 *
 * @example
 * ```typescript
 * slugify('Hello World!') // 'hello-world'
 * slugify('TypeScript & JavaScript') // 'typescript-and-javascript'
 * slugify('你好世界') // '' (non-ASCII removed)
 * ```
 *
 * @public
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Word wrap options
 *
 * @public
 */
export interface WordWrapOptions {
  /**
   * Maximum line width
   * @defaultValue 80
   */
  width?: number

  /**
   * String to use for newlines
   * @defaultValue '\n'
   */
  newline?: string

  /**
   * Whether to cut words longer than width
   * @defaultValue false
   */
  cut?: boolean
}

/**
 * Wraps text to a specified width
 *
 * @param str - The input string
 * @param options - Word wrap options
 * @returns Wrapped string
 *
 * @example
 * ```typescript
 * wordWrap('This is a long line that needs wrapping', { width: 20 })
 * // 'This is a long line\nthat needs wrapping'
 * ```
 *
 * @public
 */
export function wordWrap(str: string, options: WordWrapOptions = {}): string {
  const { width = 80, newline = '\n', cut = false } = options

  if (str.length <= width) return str

  const words = str.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (cut && word.length > width) {
      // Split long words
      let remaining = word
      while (remaining.length > 0) {
        if (currentLine.length > 0) {
          if (currentLine.length + 1 + remaining.length <= width) {
            currentLine += ' ' + remaining
            remaining = ''
          } else {
            const available = width - currentLine.length - 1
            if (available > 0) {
              currentLine += ' ' + remaining.slice(0, available)
              remaining = remaining.slice(available)
            }
            lines.push(currentLine)
            currentLine = ''
          }
        } else {
          const slice = remaining.slice(0, width)
          remaining = remaining.slice(width)
          if (remaining.length === 0) {
            currentLine = slice
          } else {
            lines.push(slice)
          }
        }
      }
    } else if (currentLine.length === 0) {
      currentLine = word
    } else if (currentLine.length + 1 + word.length <= width) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines.join(newline)
}

/**
 * String template interpolation
 *
 * @param template - Template string with placeholders
 * @param values - Object with replacement values
 * @returns Interpolated string
 *
 * @example
 * ```typescript
 * interpolate('Hello, {name}!', { name: 'World' }) // 'Hello, World!'
 * interpolate('{a} + {b} = {c}', { a: 1, b: 2, c: 3 }) // '1 + 2 = 3'
 * ```
 *
 * @public
 */
export function interpolate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in values ? String(values[key]) : match
  })
}
