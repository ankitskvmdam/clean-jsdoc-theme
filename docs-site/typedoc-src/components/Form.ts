/**
 * Form Components
 *
 * @remarks
 * Components for building forms with validation support.
 *
 * @packageDocumentation
 */

import { Component, ComponentProps } from './base/Component'

/**
 * Form field validation rule
 *
 * @public
 */
export interface ValidationRule {
  /** Rule type */
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  /** Rule value (varies by type) */
  value?: unknown
  /** Error message when validation fails */
  message: string
  /** Custom validation function (for 'custom' type) */
  validator?: (value: unknown) => boolean
}

/**
 * Validation result
 *
 * @public
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Error messages if validation failed */
  errors: string[]
}

/**
 * Form field props
 *
 * @public
 */
export interface FormFieldProps extends ComponentProps {
  /** Field name */
  name: string
  /** Field label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Field value */
  value?: unknown
  /** Default value */
  defaultValue?: unknown
  /** Whether field is required */
  required?: boolean
  /** Whether field is read-only */
  readOnly?: boolean
  /** Validation rules */
  rules?: ValidationRule[]
  /** Help text displayed below field */
  helpText?: string
  /** Error message to display */
  error?: string
  /** Value change handler */
  onChange?: (value: unknown) => void
  /** Blur handler */
  onBlur?: () => void
  /** Focus handler */
  onFocus?: () => void
}

/**
 * Form field state
 *
 * @public
 */
export interface FormFieldState {
  /** Current field value */
  value: unknown
  /** Whether field has been touched */
  touched: boolean
  /** Whether field has been modified */
  dirty: boolean
  /** Current validation errors */
  errors: string[]
  /** Whether field is being validated */
  validating: boolean
}

/**
 * Abstract form field component
 *
 * @remarks
 * Base class for all form field components. Provides:
 * - Value management
 * - Validation support
 * - Touch/dirty state tracking
 * - Error display
 *
 * @typeParam P - Props type (extends FormFieldProps)
 * @typeParam V - Value type
 *
 * @example
 * ```typescript
 * class TextField extends FormField<TextFieldProps, string> {
 *   protected parseValue(rawValue: unknown): string {
 *     return String(rawValue ?? '')
 *   }
 *
 *   public render(): string {
 *     return `<input type="text" value="${this.getValue()}" />`
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class FormField<
  P extends FormFieldProps = FormFieldProps,
  V = unknown,
> extends Component<P, FormFieldState> {
  /**
   * Gets the initial state
   *
   * @returns Initial field state
   */
  protected getInitialState(): FormFieldState {
    return {
      value: this.props.defaultValue ?? this.props.value ?? this.getDefaultValue(),
      touched: false,
      dirty: false,
      errors: [],
      validating: false,
    }
  }

  /**
   * Gets the default value for this field type
   *
   * @returns Default value
   * @virtual
   */
  protected getDefaultValue(): V {
    return undefined as unknown as V
  }

  /**
   * Parses raw input value to the field's value type
   *
   * @param rawValue - Raw input value
   * @returns Parsed value
   * @virtual
   */
  protected abstract parseValue(rawValue: unknown): V

  /**
   * Formats the value for display
   *
   * @param value - Value to format
   * @returns Formatted string
   * @virtual
   */
  protected formatValue(value: V): string {
    return String(value ?? '')
  }

  /**
   * Gets the current field value
   *
   * @returns Current value
   */
  public getValue(): V {
    return this.internalState.value as V
  }

  /**
   * Sets the field value
   *
   * @param value - New value
   * @param options - Set options
   */
  public setValue(value: V, options: { validate?: boolean } = {}): void {
    const prevValue = this.internalState.value

    this.setState({
      value,
      dirty: value !== this.props.defaultValue,
    })

    this.emit('change', { value, previousValue: prevValue })
    this.props.onChange?.(value)

    if (options.validate !== false) {
      this.validate()
    }
  }

  /**
   * Handles input change event
   *
   * @param rawValue - Raw input value
   */
  protected handleChange(rawValue: unknown): void {
    const value = this.parseValue(rawValue)
    this.setValue(value)
  }

  /**
   * Handles field focus
   */
  protected handleFocus(): void {
    this.emit('focus', { name: this.props.name })
    this.props.onFocus?.()
  }

  /**
   * Handles field blur
   */
  protected handleBlur(): void {
    if (!this.internalState.touched) {
      this.setState({ touched: true })
    }
    this.validate()
    this.emit('blur', { name: this.props.name })
    this.props.onBlur?.()
  }

  /**
   * Validates the current field value
   *
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = field.validate()
   * if (!result.valid) {
   *   console.log('Errors:', result.errors)
   * }
   * ```
   */
  public validate(): ValidationResult {
    const errors: string[] = []
    const value = this.getValue()
    const rules = this.props.rules ?? []

    // Check required
    if (this.props.required && this.isEmpty(value)) {
      errors.push(`${this.props.label ?? this.props.name} is required`)
    }

    // Check custom rules
    for (const rule of rules) {
      if (!this.checkRule(rule, value)) {
        errors.push(rule.message)
      }
    }

    this.setState({ errors })

    const result = {
      valid: errors.length === 0,
      errors,
    }

    this.emit('validate', result)
    return result
  }

  /**
   * Checks if a value is empty
   *
   * @param value - Value to check
   * @returns True if empty
   * @virtual
   */
  protected isEmpty(value: V): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    return false
  }

  /**
   * Checks a single validation rule
   *
   * @param rule - Rule to check
   * @param value - Value to validate
   * @returns True if rule passes
   */
  protected checkRule(rule: ValidationRule, value: V): boolean {
    switch (rule.type) {
      case 'required':
        return !this.isEmpty(value)

      case 'minLength':
        return (
          typeof value === 'string' && value.length >= (rule.value as number)
        )

      case 'maxLength':
        return (
          typeof value === 'string' && value.length <= (rule.value as number)
        )

      case 'pattern':
        return typeof value === 'string' && (rule.value as RegExp).test(value)

      case 'custom':
        return rule.validator ? rule.validator(value) : true

      default:
        return true
    }
  }

  /**
   * Resets the field to its default state
   */
  public reset(): void {
    this.setState({
      value: this.props.defaultValue ?? this.getDefaultValue(),
      touched: false,
      dirty: false,
      errors: [],
    })
    this.emit('reset', { name: this.props.name })
  }

  /**
   * Whether the field has validation errors
   */
  public get hasErrors(): boolean {
    return this.internalState.errors.length > 0
  }

  /**
   * Whether the field has been touched
   */
  public get isTouched(): boolean {
    return this.internalState.touched
  }

  /**
   * Whether the field has been modified
   */
  public get isDirty(): boolean {
    return this.internalState.dirty
  }
}

/**
 * Text input field props
 *
 * @public
 */
export interface TextFieldProps extends FormFieldProps {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  /** Minimum length */
  minLength?: number
  /** Maximum length */
  maxLength?: number
  /** Auto-complete setting */
  autoComplete?: string
}

/**
 * Text input field component
 *
 * @example
 * ```typescript
 * const emailField = new TextField({
 *   name: 'email',
 *   label: 'Email Address',
 *   type: 'email',
 *   required: true,
 *   rules: [
 *     { type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
 *   ]
 * })
 * ```
 *
 * @public
 */
export class TextField extends FormField<TextFieldProps, string> {
  protected parseValue(rawValue: unknown): string {
    return String(rawValue ?? '')
  }

  protected getDefaultValue(): string {
    return ''
  }

  public render(): string {
    const { type = 'text', name, placeholder, disabled, readOnly } = this.props
    const value = this.formatValue(this.getValue())

    return `<input
      type="${type}"
      name="${name}"
      value="${value}"
      placeholder="${placeholder ?? ''}"
      ${disabled ? 'disabled' : ''}
      ${readOnly ? 'readonly' : ''}
    />`
  }
}

/**
 * Select field option
 *
 * @public
 */
export interface SelectOption {
  /** Option value */
  value: string | number
  /** Option label */
  label: string
  /** Whether option is disabled */
  disabled?: boolean
  /** Option group */
  group?: string
}

/**
 * Select field props
 *
 * @public
 */
export interface SelectFieldProps extends FormFieldProps {
  /** Available options */
  options: SelectOption[]
  /** Allow multiple selection */
  multiple?: boolean
  /** Placeholder for empty state */
  emptyLabel?: string
}

/**
 * Select dropdown field component
 *
 * @example
 * ```typescript
 * const countrySelect = new SelectField({
 *   name: 'country',
 *   label: 'Country',
 *   options: [
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' },
 *     { value: 'cn', label: 'China' }
 *   ]
 * })
 * ```
 *
 * @public
 */
export class SelectField extends FormField<SelectFieldProps, string | string[]> {
  protected parseValue(rawValue: unknown): string | string[] {
    if (this.props.multiple) {
      return Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)]
    }
    return String(rawValue ?? '')
  }

  protected getDefaultValue(): string | string[] {
    return this.props.multiple ? [] : ''
  }

  public render(): string {
    const { name, options, disabled, multiple, emptyLabel } = this.props
    const value = this.getValue()

    const optionElements = options
      .map((opt) => {
        const selected = multiple
          ? (value as string[]).includes(String(opt.value))
          : value === String(opt.value)

        return `<option
          value="${opt.value}"
          ${selected ? 'selected' : ''}
          ${opt.disabled ? 'disabled' : ''}
        >${opt.label}</option>`
      })
      .join('\n')

    return `<select
      name="${name}"
      ${disabled ? 'disabled' : ''}
      ${multiple ? 'multiple' : ''}
    >
      ${emptyLabel ? `<option value="">${emptyLabel}</option>` : ''}
      ${optionElements}
    </select>`
  }
}

/**
 * Checkbox field props
 *
 * @public
 */
export interface CheckboxFieldProps extends FormFieldProps {
  /** Checkbox label text */
  checkboxLabel?: string
}

/**
 * Checkbox field component
 *
 * @public
 */
export class CheckboxField extends FormField<CheckboxFieldProps, boolean> {
  protected parseValue(rawValue: unknown): boolean {
    return Boolean(rawValue)
  }

  protected getDefaultValue(): boolean {
    return false
  }

  protected isEmpty(value: boolean): boolean {
    // A checkbox is never "empty" - it's either checked or not
    return false
  }

  public render(): string {
    const { name, disabled, checkboxLabel } = this.props
    const checked = this.getValue()

    return `<label>
      <input
        type="checkbox"
        name="${name}"
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
      />
      ${checkboxLabel ?? ''}
    </label>`
  }
}
