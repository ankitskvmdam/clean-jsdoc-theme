/**
 * Date and time utility functions
 *
 * @remarks
 * Provides common date manipulation and formatting utilities.
 *
 * @packageDocumentation
 */

/**
 * Date format options
 *
 * @public
 */
export interface DateFormatOptions {
  /**
   * Locale for formatting
   * @defaultValue 'en-US'
   */
  locale?: string

  /**
   * Timezone for display
   * @defaultValue undefined (local timezone)
   */
  timezone?: string
}

/**
 * Time units in milliseconds
 *
 * @public
 */
export const TIME_UNITS = {
  /** Milliseconds in a second */
  SECOND: 1000,
  /** Milliseconds in a minute */
  MINUTE: 60 * 1000,
  /** Milliseconds in an hour */
  HOUR: 60 * 60 * 1000,
  /** Milliseconds in a day */
  DAY: 24 * 60 * 60 * 1000,
  /** Milliseconds in a week */
  WEEK: 7 * 24 * 60 * 60 * 1000,
  /** Average milliseconds in a month (30 days) */
  MONTH: 30 * 24 * 60 * 60 * 1000,
  /** Average milliseconds in a year (365 days) */
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const

/**
 * Formats a date using Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param format - Format style or options
 * @param options - Additional options
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date(), 'short') // '12/15/2024'
 * formatDate(new Date(), 'long') // 'December 15, 2024'
 * formatDate(new Date(), 'full', { locale: 'de-DE' }) // 'Sonntag, 15. Dezember 2024'
 * ```
 *
 * @public
 */
export function formatDate(
  date: Date | number | string,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  options: DateFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date)
  const { locale = 'en-US', timezone } = options

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: format,
    timeZone: timezone,
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d)
}

/**
 * Formats a time using Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param format - Format style
 * @param options - Additional options
 * @returns Formatted time string
 *
 * @example
 * ```typescript
 * formatTime(new Date(), 'short') // '2:30 PM'
 * formatTime(new Date(), 'medium') // '2:30:45 PM'
 * formatTime(new Date(), 'long') // '2:30:45 PM EST'
 * ```
 *
 * @public
 */
export function formatTime(
  date: Date | number | string,
  format: 'short' | 'medium' | 'long' = 'short',
  options: DateFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date)
  const { locale = 'en-US', timezone } = options

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeStyle: format,
    timeZone: timezone,
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d)
}

/**
 * Formats a date and time together
 *
 * @param date - Date to format
 * @param dateFormat - Date format style
 * @param timeFormat - Time format style
 * @param options - Additional options
 * @returns Formatted datetime string
 *
 * @example
 * ```typescript
 * formatDateTime(new Date(), 'short', 'short')
 * // '12/15/2024, 2:30 PM'
 * ```
 *
 * @public
 */
export function formatDateTime(
  date: Date | number | string,
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium',
  timeFormat: 'short' | 'medium' | 'long' = 'short',
  options: DateFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date)
  const { locale = 'en-US', timezone } = options

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: dateFormat,
    timeStyle: timeFormat,
    timeZone: timezone,
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d)
}

/**
 * Returns a relative time string (e.g., "3 days ago")
 *
 * @param date - Date to compare
 * @param baseDate - Base date for comparison (default: now)
 * @param options - Format options
 * @returns Relative time string
 *
 * @example
 * ```typescript
 * const yesterday = new Date(Date.now() - 86400000)
 * getRelativeTime(yesterday) // '1 day ago'
 *
 * const nextWeek = new Date(Date.now() + 7 * 86400000)
 * getRelativeTime(nextWeek) // 'in 1 week'
 * ```
 *
 * @public
 */
export function getRelativeTime(
  date: Date | number | string,
  baseDate: Date = new Date(),
  options: DateFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date)
  const { locale = 'en-US' } = options

  const diff = d.getTime() - baseDate.getTime()
  const absDiff = Math.abs(diff)

  let value: number
  let unit: Intl.RelativeTimeFormatUnit

  if (absDiff < TIME_UNITS.MINUTE) {
    value = Math.round(diff / TIME_UNITS.SECOND)
    unit = 'second'
  } else if (absDiff < TIME_UNITS.HOUR) {
    value = Math.round(diff / TIME_UNITS.MINUTE)
    unit = 'minute'
  } else if (absDiff < TIME_UNITS.DAY) {
    value = Math.round(diff / TIME_UNITS.HOUR)
    unit = 'hour'
  } else if (absDiff < TIME_UNITS.WEEK) {
    value = Math.round(diff / TIME_UNITS.DAY)
    unit = 'day'
  } else if (absDiff < TIME_UNITS.MONTH) {
    value = Math.round(diff / TIME_UNITS.WEEK)
    unit = 'week'
  } else if (absDiff < TIME_UNITS.YEAR) {
    value = Math.round(diff / TIME_UNITS.MONTH)
    unit = 'month'
  } else {
    value = Math.round(diff / TIME_UNITS.YEAR)
    unit = 'year'
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  return rtf.format(value, unit)
}

/**
 * Adds a duration to a date
 *
 * @param date - Base date
 * @param amount - Amount to add
 * @param unit - Unit of time
 * @returns New date with added duration
 *
 * @example
 * ```typescript
 * const now = new Date()
 * addTime(now, 1, 'day') // Tomorrow
 * addTime(now, -1, 'week') // Last week
 * addTime(now, 2, 'hours') // 2 hours from now
 * ```
 *
 * @public
 */
export function addTime(
  date: Date,
  amount: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const result = new Date(date)

  switch (unit) {
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount)
      break
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount)
      break
    case 'hours':
      result.setHours(result.getHours() + amount)
      break
    case 'days':
      result.setDate(result.getDate() + amount)
      break
    case 'weeks':
      result.setDate(result.getDate() + amount * 7)
      break
    case 'months':
      result.setMonth(result.getMonth() + amount)
      break
    case 'years':
      result.setFullYear(result.getFullYear() + amount)
      break
  }

  return result
}

/**
 * Gets the start of a time period
 *
 * @param date - Input date
 * @param unit - Time unit
 * @returns Start of the period
 *
 * @example
 * ```typescript
 * startOf(new Date('2024-03-15 14:30:00'), 'day')
 * // 2024-03-15 00:00:00
 *
 * startOf(new Date('2024-03-15'), 'month')
 * // 2024-03-01 00:00:00
 * ```
 *
 * @public
 */
export function startOf(date: Date, unit: 'day' | 'week' | 'month' | 'year'): Date {
  const result = new Date(date)

  switch (unit) {
    case 'day':
      result.setHours(0, 0, 0, 0)
      break
    case 'week':
      result.setHours(0, 0, 0, 0)
      result.setDate(result.getDate() - result.getDay())
      break
    case 'month':
      result.setHours(0, 0, 0, 0)
      result.setDate(1)
      break
    case 'year':
      result.setHours(0, 0, 0, 0)
      result.setMonth(0, 1)
      break
  }

  return result
}

/**
 * Gets the end of a time period
 *
 * @param date - Input date
 * @param unit - Time unit
 * @returns End of the period
 *
 * @example
 * ```typescript
 * endOf(new Date('2024-03-15'), 'day')
 * // 2024-03-15 23:59:59.999
 *
 * endOf(new Date('2024-03-15'), 'month')
 * // 2024-03-31 23:59:59.999
 * ```
 *
 * @public
 */
export function endOf(date: Date, unit: 'day' | 'week' | 'month' | 'year'): Date {
  const result = new Date(date)

  switch (unit) {
    case 'day':
      result.setHours(23, 59, 59, 999)
      break
    case 'week':
      result.setHours(23, 59, 59, 999)
      result.setDate(result.getDate() + (6 - result.getDay()))
      break
    case 'month':
      result.setMonth(result.getMonth() + 1, 0)
      result.setHours(23, 59, 59, 999)
      break
    case 'year':
      result.setMonth(11, 31)
      result.setHours(23, 59, 59, 999)
      break
  }

  return result
}

/**
 * Checks if two dates are on the same day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 *
 * @example
 * ```typescript
 * isSameDay(new Date('2024-03-15 10:00'), new Date('2024-03-15 22:00')) // true
 * isSameDay(new Date('2024-03-15'), new Date('2024-03-16')) // false
 * ```
 *
 * @public
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Checks if a date is between two other dates
 *
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @param inclusive - Whether to include boundaries
 * @returns True if date is in range
 *
 * @example
 * ```typescript
 * const date = new Date('2024-03-15')
 * const start = new Date('2024-03-01')
 * const end = new Date('2024-03-31')
 *
 * isBetween(date, start, end) // true
 * ```
 *
 * @public
 */
export function isBetween(date: Date, start: Date, end: Date, inclusive = true): boolean {
  const time = date.getTime()
  const startTime = start.getTime()
  const endTime = end.getTime()

  if (inclusive) {
    return time >= startTime && time <= endTime
  }
  return time > startTime && time < endTime
}

/**
 * Gets the difference between two dates in a specific unit
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit of measurement
 * @returns Difference in the specified unit
 *
 * @example
 * ```typescript
 * const start = new Date('2024-01-01')
 * const end = new Date('2024-03-15')
 *
 * dateDiff(end, start, 'days') // 74
 * dateDiff(end, start, 'months') // 2.5 (approximate)
 * ```
 *
 * @public
 */
export function dateDiff(
  date1: Date,
  date2: Date,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): number {
  const diff = date1.getTime() - date2.getTime()

  switch (unit) {
    case 'seconds':
      return diff / TIME_UNITS.SECOND
    case 'minutes':
      return diff / TIME_UNITS.MINUTE
    case 'hours':
      return diff / TIME_UNITS.HOUR
    case 'days':
      return diff / TIME_UNITS.DAY
    case 'weeks':
      return diff / TIME_UNITS.WEEK
    case 'months':
      return diff / TIME_UNITS.MONTH
    case 'years':
      return diff / TIME_UNITS.YEAR
    default:
      return diff
  }
}

/**
 * Parses an ISO 8601 duration string
 *
 * @param duration - ISO 8601 duration string
 * @returns Duration in milliseconds
 *
 * @example
 * ```typescript
 * parseISODuration('PT1H30M') // 5400000 (1.5 hours in ms)
 * parseISODuration('P1D') // 86400000 (1 day in ms)
 * parseISODuration('P1Y2M3D') // ~36720000000
 * ```
 *
 * @public
 */
export function parseISODuration(duration: string): number {
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/
  const matches = duration.match(regex)

  if (!matches) {
    throw new Error(`Invalid ISO 8601 duration: ${duration}`)
  }

  const [, years, months, days, hours, minutes, seconds] = matches

  let ms = 0
  if (years) ms += parseInt(years) * TIME_UNITS.YEAR
  if (months) ms += parseInt(months) * TIME_UNITS.MONTH
  if (days) ms += parseInt(days) * TIME_UNITS.DAY
  if (hours) ms += parseInt(hours) * TIME_UNITS.HOUR
  if (minutes) ms += parseInt(minutes) * TIME_UNITS.MINUTE
  if (seconds) ms += parseInt(seconds) * TIME_UNITS.SECOND

  return ms
}

/**
 * Formats a duration in milliseconds to a human-readable string
 *
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(3661000) // '1h 1m 1s'
 * formatDuration(86400000) // '1d'
 * formatDuration(3600000, { verbose: true }) // '1 hour'
 * ```
 *
 * @public
 */
export function formatDuration(ms: number, options: { verbose?: boolean } = {}): string {
  const { verbose = false } = options

  const units = [
    { value: TIME_UNITS.DAY, short: 'd', long: 'day' },
    { value: TIME_UNITS.HOUR, short: 'h', long: 'hour' },
    { value: TIME_UNITS.MINUTE, short: 'm', long: 'minute' },
    { value: TIME_UNITS.SECOND, short: 's', long: 'second' },
  ]

  const parts: string[] = []
  let remaining = ms

  for (const unit of units) {
    const count = Math.floor(remaining / unit.value)
    if (count > 0) {
      if (verbose) {
        parts.push(`${count} ${unit.long}${count !== 1 ? 's' : ''}`)
      } else {
        parts.push(`${count}${unit.short}`)
      }
      remaining %= unit.value
    }
  }

  return parts.length > 0 ? parts.join(' ') : verbose ? '0 seconds' : '0s'
}
