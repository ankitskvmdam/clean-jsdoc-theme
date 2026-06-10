/**
 * Core pipeline classes, grouped into two `@category` subgroups under `Core`:
 * `Core/Parsing` and `Core/Schema`. `@order` controls both the **subgroup**
 * position (a subgroup sorts by the min `order` of its members) and the **leaf**
 * position inside each subgroup.
 *
 * Because Schema's members carry the lowest order (1, 2) and Parsing's the
 * higher (3, 4), the **Schema** subgroup renders *before* **Parsing** in the
 * sidebar — even though "Parsing" sorts earlier alphabetically. That's the
 * "order the parent of multiple children" case.
 */

/**
 * A schema definition describing the shape of a record.
 *
 * @category Core/Schema
 * @order 1
 */
export class Schema {
  /** The named fields this schema declares. */
  readonly fields: string[];

  constructor(fields: string[]) {
    this.fields = fields;
  }

  /** Whether `name` is a declared field. */
  has(name: string): boolean {
    return this.fields.includes(name);
  }
}

/**
 * Validates records against a {@link Schema}. Inside the `Core/Schema`
 * subgroup this sorts *after* {@link Schema} (order 2 vs 1).
 *
 * @category Core/Schema
 * @order 2
 */
export class Validator {
  constructor(private readonly schema: Schema) {}

  /** Returns the unknown keys in `record` (empty when valid). */
  validate(record: Record<string, unknown>): string[] {
    return Object.keys(record).filter((k) => !this.schema.has(k));
  }
}

/**
 * Parses a token stream into a structured tree. Lowest order in the
 * `Core/Parsing` subgroup, so it leads that subgroup.
 *
 * @category Core/Parsing
 * @order 3
 */
export class Parser {
  /** Parse a flat token list into a nested array tree. */
  parse(tokens: string[]): unknown[] {
    return tokens.map((t) => t.split('.'));
  }
}

/**
 * Splits raw source text into a token stream. Highest order in `Core/Parsing`,
 * so it sorts last inside that subgroup.
 *
 * @category Core/Parsing
 * @order 4
 */
export class Tokenizer {
  /** Split `input` on whitespace into tokens. */
  tokenize(input: string): string[] {
    return input.split(/\s+/).filter(Boolean);
  }
}
