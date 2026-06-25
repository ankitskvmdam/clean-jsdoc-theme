/**
 * Product model module
 *
 * @remarks
 * Contains product and inventory related data structures.
 *
 * @packageDocumentation
 */

/**
 * Product category enumeration
 *
 * @public
 */
export enum ProductCategory {
  /** Electronic devices and accessories */
  Electronics = 'electronics',
  /** Clothing and apparel */
  Clothing = 'clothing',
  /** Books and publications */
  Books = 'books',
  /** Home and garden items */
  HomeGarden = 'home_garden',
  /** Sports and outdoor equipment */
  Sports = 'sports',
  /** Toys and games */
  Toys = 'toys',
  /** Food and beverages */
  Food = 'food',
  /** Health and beauty products */
  HealthBeauty = 'health_beauty',
}

/**
 * Product availability status
 *
 * @public
 */
export enum AvailabilityStatus {
  /** Product is in stock and available */
  InStock = 'in_stock',
  /** Product has limited stock remaining */
  LowStock = 'low_stock',
  /** Product is currently out of stock */
  OutOfStock = 'out_of_stock',
  /** Product is available for pre-order */
  PreOrder = 'pre_order',
  /** Product has been discontinued */
  Discontinued = 'discontinued',
}

/**
 * Price information structure
 *
 * @public
 */
export interface Price {
  /**
   * Price amount in smallest currency unit (e.g., cents)
   * @example 1999 represents $19.99
   */
  amount: number

  /**
   * Currency code (ISO 4217)
   * @example 'USD', 'EUR', 'CNY'
   */
  currency: string

  /**
   * Optional original price for displaying discounts
   */
  originalAmount?: number

  /**
   * Discount percentage if applicable
   * @minimum 0
   * @maximum 100
   */
  discountPercent?: number
}

/**
 * Product dimensions
 *
 * @remarks
 * All measurements are in metric units.
 *
 * @public
 */
export interface Dimensions {
  /** Length in centimeters */
  length: number
  /** Width in centimeters */
  width: number
  /** Height in centimeters */
  height: number
  /** Weight in grams */
  weight: number
}

/**
 * Product variant options
 *
 * @typeParam T - Type of the variant value
 * @public
 */
export interface ProductVariant<T = string> {
  /** Variant identifier */
  id: string
  /** Variant name (e.g., "Red", "Large") */
  name: string
  /** Variant value */
  value: T
  /** Price adjustment for this variant */
  priceAdjustment?: number
  /** Stock quantity for this variant */
  stock: number
  /** SKU for this variant */
  sku: string
}

/**
 * Product review interface
 *
 * @public
 */
export interface ProductReview {
  /** Review identifier */
  id: string
  /** Reviewer's user ID */
  userId: string
  /** Reviewer's display name */
  userName: string
  /** Rating from 1 to 5 */
  rating: 1 | 2 | 3 | 4 | 5
  /** Review title */
  title: string
  /** Review content */
  content: string
  /** Helpful votes count */
  helpfulVotes: number
  /** Review creation date */
  createdAt: Date
  /** Whether the review is verified purchase */
  verifiedPurchase: boolean
}

/**
 * Complete product interface
 *
 * @public
 */
export interface IProduct {
  /** Unique product identifier */
  readonly id: string
  /** Product SKU (Stock Keeping Unit) */
  sku: string
  /** Product name */
  name: string
  /** Short description (max 200 chars) */
  shortDescription: string
  /** Full product description (supports markdown) */
  description: string
  /** Product category */
  category: ProductCategory
  /** Product tags for searching */
  tags: string[]
  /** Price information */
  price: Price
  /** Current availability status */
  availability: AvailabilityStatus
  /** Current stock quantity */
  stockQuantity: number
  /** Product images URLs */
  images: string[]
  /** Product dimensions and weight */
  dimensions?: Dimensions
  /** Product variants (colors, sizes, etc.) */
  variants: ProductVariant[]
  /** Average rating (1-5) */
  averageRating: number
  /** Total number of reviews */
  reviewCount: number
  /** Product creation date */
  readonly createdAt: Date
  /** Last update date */
  updatedAt: Date
  /** Whether product is featured */
  isFeatured: boolean
  /** Whether product is active/visible */
  isActive: boolean
}

/**
 * Product class implementation
 *
 * @remarks
 * Provides a complete product model with utility methods for
 * price calculations, stock management, and data transformation.
 *
 * @example
 * ```typescript
 * const product = new Product({
 *   id: 'prod-123',
 *   sku: 'WIDGET-001',
 *   name: 'Super Widget',
 *   shortDescription: 'The best widget ever made',
 *   description: '## Features\n- Durable\n- Lightweight\n- Eco-friendly',
 *   category: ProductCategory.Electronics,
 *   tags: ['widget', 'gadget', 'popular'],
 *   price: { amount: 2999, currency: 'USD' },
 *   availability: AvailabilityStatus.InStock,
 *   stockQuantity: 100,
 *   images: ['https://example.com/widget.jpg'],
 *   variants: [],
 *   averageRating: 4.5,
 *   reviewCount: 42,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   isFeatured: true,
 *   isActive: true
 * })
 *
 * console.log(product.getFormattedPrice()) // "$29.99"
 * ```
 *
 * @public
 */
export class Product implements IProduct {
  /** @inheritDoc */
  public readonly id: string
  /** @inheritDoc */
  public sku!: string
  /** @inheritDoc */
  public name!: string
  /** @inheritDoc */
  public shortDescription!: string
  /** @inheritDoc */
  public description!: string
  /** @inheritDoc */
  public category!: ProductCategory
  /** @inheritDoc */
  public tags!: string[]
  /** @inheritDoc */
  public price!: Price
  /** @inheritDoc */
  public availability!: AvailabilityStatus
  /** @inheritDoc */
  public stockQuantity!: number
  /** @inheritDoc */
  public images!: string[]
  /** @inheritDoc */
  public dimensions?: Dimensions
  /** @inheritDoc */
  public variants!: ProductVariant[]
  /** @inheritDoc */
  public averageRating!: number
  /** @inheritDoc */
  public reviewCount!: number
  /** @inheritDoc */
  public readonly createdAt: Date
  /** @inheritDoc */
  public updatedAt!: Date
  /** @inheritDoc */
  public isFeatured!: boolean
  /** @inheritDoc */
  public isActive!: boolean

  /**
   * Creates a new Product instance
   *
   * @param data - Product data
   */
  constructor(data: IProduct) {
    Object.assign(this, data)
    this.id = data.id
    this.createdAt = data.createdAt
  }

  /**
   * Formats the price for display
   *
   * @param locale - Locale for formatting (default: 'en-US')
   * @returns Formatted price string
   *
   * @example
   * ```typescript
   * product.getFormattedPrice() // "$29.99"
   * product.getFormattedPrice('de-DE') // "29,99 €"
   * ```
   */
  public getFormattedPrice(locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.price.currency,
    }).format(this.price.amount / 100)
  }

  /**
   * Calculates the discount amount
   *
   * @returns Discount amount in smallest currency unit, or 0 if no discount
   */
  public getDiscountAmount(): number {
    if (!this.price.originalAmount || !this.price.discountPercent) {
      return 0
    }
    return Math.round((this.price.originalAmount * this.price.discountPercent) / 100)
  }

  /**
   * Checks if the product is available for purchase
   *
   * @returns True if product can be purchased
   */
  public canPurchase(): boolean {
    return (
      this.isActive &&
      this.stockQuantity > 0 &&
      (this.availability === AvailabilityStatus.InStock ||
        this.availability === AvailabilityStatus.LowStock ||
        this.availability === AvailabilityStatus.PreOrder)
    )
  }

  /**
   * Updates stock quantity and availability status
   *
   * @param quantity - New stock quantity
   * @returns The updated product instance
   *
   * @example
   * ```typescript
   * product.updateStock(5) // Sets to low stock
   * product.updateStock(0) // Sets to out of stock
   * ```
   */
  public updateStock(quantity: number): this {
    this.stockQuantity = Math.max(0, quantity)

    if (this.stockQuantity === 0) {
      this.availability = AvailabilityStatus.OutOfStock
    } else if (this.stockQuantity <= 10) {
      this.availability = AvailabilityStatus.LowStock
    } else {
      this.availability = AvailabilityStatus.InStock
    }

    this.updatedAt = new Date()
    return this
  }

  /**
   * Gets a specific variant by ID
   *
   * @typeParam T - Variant value type
   * @param variantId - The variant identifier
   * @returns The variant or undefined if not found
   */
  public getVariant<T = string>(variantId: string): ProductVariant<T> | undefined {
    return this.variants.find((v) => v.id === variantId) as ProductVariant<T> | undefined
  }

  /**
   * Calculates total price for a variant
   *
   * @param variantId - Optional variant ID
   * @returns Total price amount including variant adjustment
   */
  public getTotalPrice(variantId?: string): number {
    let total = this.price.amount
    if (variantId) {
      const variant = this.getVariant(variantId)
      if (variant?.priceAdjustment) {
        total += variant.priceAdjustment
      }
    }
    return total
  }
}

/**
 * Product collection for managing multiple products
 *
 * @typeParam T - Product type (must extend IProduct)
 * @public
 */
export class ProductCollection<T extends IProduct = Product> {
  /**
   * Internal product storage
   * @internal
   */
  private readonly products: Map<string, T> = new Map()

  /**
   * Creates a new ProductCollection
   *
   * @param initialProducts - Optional initial products array
   */
  constructor(initialProducts?: T[]) {
    if (initialProducts) {
      for (const product of initialProducts) {
        this.products.set(product.id, product)
      }
    }
  }

  /**
   * Gets the number of products in the collection
   */
  public get size(): number {
    return this.products.size
  }

  /**
   * Adds a product to the collection
   *
   * @param product - Product to add
   * @returns This collection for chaining
   */
  public add(product: T): this {
    this.products.set(product.id, product)
    return this
  }

  /**
   * Removes a product from the collection
   *
   * @param productId - ID of product to remove
   * @returns True if product was removed
   */
  public remove(productId: string): boolean {
    return this.products.delete(productId)
  }

  /**
   * Gets a product by ID
   *
   * @param productId - Product ID
   * @returns The product or undefined
   */
  public get(productId: string): T | undefined {
    return this.products.get(productId)
  }

  /**
   * Filters products by category
   *
   * @param category - Category to filter by
   * @returns Array of matching products
   */
  public filterByCategory(category: ProductCategory): T[] {
    return Array.from(this.products.values()).filter((p) => p.category === category)
  }

  /**
   * Searches products by name or tags
   *
   * @param query - Search query
   * @returns Array of matching products
   */
  public search(query: string): T[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.products.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Gets all products as an array
   *
   * @returns Array of all products
   */
  public toArray(): T[] {
    return Array.from(this.products.values())
  }

  /**
   * Iterates over all products
   *
   * @yields Each product in the collection
   */
  public *[Symbol.iterator](): Iterator<T> {
    yield* this.products.values()
  }
}
