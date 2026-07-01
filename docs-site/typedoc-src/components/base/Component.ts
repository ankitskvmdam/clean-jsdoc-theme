/**
 * UI Component Base Classes
 *
 * @remarks
 * Abstract base classes and interfaces for building UI components.
 *
 * @packageDocumentation
 */

/**
 * Component lifecycle states
 *
 * @public
 */
export enum ComponentState {
  /** Component is being created */
  Creating = 'creating',
  /** Component is mounted and ready */
  Mounted = 'mounted',
  /** Component is being updated */
  Updating = 'updating',
  /** Component is being destroyed */
  Destroying = 'destroying',
  /** Component has been destroyed */
  Destroyed = 'destroyed',
}

/**
 * Component properties base interface
 *
 * @public
 */
export interface ComponentProps {
  /** Unique component identifier */
  id?: string
  /** CSS class names */
  className?: string
  /** Inline styles */
  style?: Record<string, string | number>
  /** Child components or content */
  children?: unknown
  /** Whether component is visible */
  visible?: boolean
  /** Whether component is disabled */
  disabled?: boolean
}

/**
 * Component event handler type
 *
 * @typeParam T - Event data type
 * @public
 */
export type ComponentEventHandler<T = unknown> = (event: ComponentEvent<T>) => void

/**
 * Component event
 *
 * @typeParam T - Event data type
 * @public
 */
export interface ComponentEvent<T = unknown> {
  /** Event type */
  type: string
  /** Event source component */
  source: Component
  /** Event data */
  data?: T
  /** Event timestamp */
  timestamp: number
  /** Stops event propagation */
  stopPropagation(): void
  /** Prevents default behavior */
  preventDefault(): void
}

/**
 * Component lifecycle hooks interface
 *
 * @public
 */
export interface LifecycleHooks {
  /**
   * Called before component mounts
   */
  onBeforeMount?(): void

  /**
   * Called after component mounts
   */
  onMounted?(): void

  /**
   * Called before component updates
   *
   * @param prevProps - Previous props
   * @param nextProps - Next props
   */
  onBeforeUpdate?(prevProps: ComponentProps, nextProps: ComponentProps): void

  /**
   * Called after component updates
   *
   * @param prevProps - Previous props
   */
  onUpdated?(prevProps: ComponentProps): void

  /**
   * Called before component unmounts
   */
  onBeforeUnmount?(): void

  /**
   * Called after component unmounts
   */
  onUnmounted?(): void

  /**
   * Called when an error occurs in the component
   *
   * @param error - The error that occurred
   */
  onError?(error: Error): void
}

/**
 * Abstract base component class
 *
 * @remarks
 * Provides a foundation for building UI components with:
 * - Lifecycle management
 * - Event handling
 * - Props management
 * - State management
 *
 * @typeParam P - Props type (extends ComponentProps)
 * @typeParam S - State type
 *
 * @example
 * ```typescript
 * interface ButtonProps extends ComponentProps {
 *   label: string
 *   onClick?: () => void
 * }
 *
 * interface ButtonState {
 *   isPressed: boolean
 * }
 *
 * class Button extends Component<ButtonProps, ButtonState> {
 *   protected getInitialState(): ButtonState {
 *     return { isPressed: false }
 *   }
 *
 *   public render(): string {
 *     return `<button class="${this.props.className}">
 *       ${this.props.label}
 *     </button>`
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class Component<
  P extends ComponentProps = ComponentProps,
  S extends object = object,
> implements LifecycleHooks
{
  /**
   * Unique component instance ID
   * @readonly
   */
  public readonly instanceId: string

  /**
   * Current component state
   */
  private _state: ComponentState = ComponentState.Creating

  /**
   * Component props
   */
  protected _props: P

  /**
   * Component internal state
   */
  protected _internalState: S

  /**
   * Event handlers map
   */
  private eventHandlers: Map<string, Set<ComponentEventHandler>> = new Map()

  /**
   * Parent component reference
   */
  protected parent?: Component

  /**
   * Child components
   */
  protected children: Component[] = []

  /**
   * Creates a new Component instance
   *
   * @param props - Initial component props
   */
  constructor(props: P) {
    this.instanceId = `component-${Math.random().toString(36).substr(2, 9)}`
    this._props = props
    this._internalState = this.getInitialState()
  }

  /**
   * Gets the current component lifecycle state
   */
  public get state(): ComponentState {
    return this._state
  }

  /**
   * Gets the current props
   */
  public get props(): Readonly<P> {
    return this._props
  }

  /**
   * Gets the internal component state
   */
  protected get internalState(): Readonly<S> {
    return this._internalState
  }

  /**
   * Returns the initial internal state
   *
   * @returns Initial state object
   * @virtual
   */
  protected getInitialState(): S {
    return {} as S
  }

  /**
   * Updates the internal state
   *
   * @param updates - Partial state updates
   *
   * @example
   * ```typescript
   * this.setState({ count: this.internalState.count + 1 })
   * ```
   */
  protected setState(updates: Partial<S>): void {
    const prevState = { ...this._internalState }
    this._internalState = { ...this._internalState, ...updates }
    this.onStateChange(prevState, this._internalState)
  }

  /**
   * Called when internal state changes
   *
   * @param prevState - Previous state
   * @param newState - New state
   * @virtual
   */
  protected onStateChange(_prevState: S, _newState: S): void {
    // Override in subclass
  }

  /**
   * Updates component props
   *
   * @param nextProps - New props
   */
  public setProps(nextProps: Partial<P>): void {
    const prevProps = { ...this._props }
    this._props = { ...this._props, ...nextProps }

    if (this._state === ComponentState.Mounted) {
      this._state = ComponentState.Updating
      this.onBeforeUpdate?.(prevProps, this._props)
      this.update()
      this.onUpdated?.(prevProps)
      this._state = ComponentState.Mounted
    }
  }

  /**
   * Mounts the component
   */
  public mount(): void {
    if (this._state !== ComponentState.Creating) {
      throw new Error('Component can only be mounted once')
    }

    this.onBeforeMount?.()
    this._state = ComponentState.Mounted
    this.onMounted?.()
  }

  /**
   * Unmounts the component
   */
  public unmount(): void {
    if (this._state === ComponentState.Destroyed) {
      return
    }

    this._state = ComponentState.Destroying
    this.onBeforeUnmount?.()

    // Unmount children first
    for (const child of this.children) {
      child.unmount()
    }

    this.children = []
    this.eventHandlers.clear()

    this._state = ComponentState.Destroyed
    this.onUnmounted?.()
  }

  /**
   * Adds an event listener
   *
   * @typeParam T - Event data type
   * @param event - Event type
   * @param handler - Event handler
   * @returns Function to remove the listener
   *
   * @example
   * ```typescript
   * const off = button.on('click', (event) => {
   *   console.log('Button clicked!', event.data)
   * })
   *
   * // Later: remove listener
   * off()
   * ```
   */
  public on<T>(event: string, handler: ComponentEventHandler<T>): () => void {
    let handlers = this.eventHandlers.get(event)
    if (!handlers) {
      handlers = new Set()
      this.eventHandlers.set(event, handlers)
    }
    handlers.add(handler as ComponentEventHandler)

    return () => {
      handlers?.delete(handler as ComponentEventHandler)
    }
  }

  /**
   * Removes an event listener
   *
   * @param event - Event type
   * @param handler - Event handler to remove
   */
  public off(event: string, handler: ComponentEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  /**
   * Emits an event
   *
   * @typeParam T - Event data type
   * @param type - Event type
   * @param data - Event data
   *
   * @example
   * ```typescript
   * this.emit('valueChange', { oldValue: 1, newValue: 2 })
   * ```
   */
  protected emit<T>(type: string, data?: T): void {
    let propagationStopped = false
    let defaultPrevented = false

    const event: ComponentEvent<T> = {
      type,
      source: this,
      data,
      timestamp: Date.now(),
      stopPropagation: () => {
        propagationStopped = true
      },
      preventDefault: () => {
        defaultPrevented = true
      },
    }

    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      for (const handler of handlers) {
        handler(event)
        if (propagationStopped) break
      }
    }

    // Bubble to parent if not stopped
    if (!propagationStopped && this.parent) {
      this.parent.emit(type, data)
    }
  }

  /**
   * Adds a child component
   *
   * @param child - Child component to add
   */
  public addChild(child: Component): void {
    child.parent = this
    this.children.push(child)
  }

  /**
   * Removes a child component
   *
   * @param child - Child component to remove
   * @returns True if child was removed
   */
  public removeChild(child: Component): boolean {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      child.parent = undefined
      return true
    }
    return false
  }

  /**
   * Finds a child component by ID
   *
   * @param id - Component ID to find
   * @returns Found component or undefined
   */
  public findChildById(id: string): Component | undefined {
    for (const child of this.children) {
      if (child.props.id === id) {
        return child
      }
      const found = child.findChildById(id)
      if (found) {
        return found
      }
    }
    return undefined
  }

  /**
   * Updates the component
   *
   * @virtual
   */
  protected update(): void {
    // Override in subclass
  }

  /**
   * Renders the component
   *
   * @returns Rendered output
   * @virtual
   */
  public abstract render(): unknown

  // Lifecycle hooks (to be overridden)
  public onBeforeMount?(): void
  public onMounted?(): void
  public onBeforeUpdate?(_prevProps: ComponentProps, _nextProps: ComponentProps): void
  public onUpdated?(_prevProps: ComponentProps): void
  public onBeforeUnmount?(): void
  public onUnmounted?(): void
  public onError?(_error: Error): void
}

/**
 * Function component type
 *
 * @typeParam P - Props type
 * @public
 */
export type FunctionComponent<P extends ComponentProps = ComponentProps> = (props: P) => unknown

/**
 * Higher-order component type
 *
 * @typeParam P - Input props type
 * @typeParam R - Output props type
 * @public
 */
export type HOC<P extends ComponentProps, R extends ComponentProps = P> = (
  WrappedComponent: typeof Component<P>
) => typeof Component<R>

/**
 * Component factory function
 *
 * @typeParam P - Props type
 * @param render - Render function
 * @returns Function component
 *
 * @example
 * ```typescript
 * const Greeting = createComponent<{ name: string }>((props) => {
 *   return `<h1>Hello, ${props.name}!</h1>`
 * })
 * ```
 *
 * @public
 */
export function createComponent<P extends ComponentProps>(
  render: FunctionComponent<P>
): FunctionComponent<P> {
  return render
}

/**
 * Combines multiple HOCs
 *
 * @param hocs - HOCs to compose
 * @returns Combined HOC
 *
 * @example
 * ```typescript
 * const enhance = compose(
 *   withLogging,
 *   withErrorBoundary,
 *   withStyles
 * )
 *
 * const EnhancedComponent = enhance(MyComponent)
 * ```
 *
 * @public
 */
export function compose<P extends ComponentProps>(
  ...hocs: Array<HOC<P, P>>
): HOC<P, P> {
  return (WrappedComponent) => {
    return hocs.reduceRight((acc, hoc) => hoc(acc), WrappedComponent)
  }
}
