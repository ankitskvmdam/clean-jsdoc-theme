/**
 * Internal metadata added by TaffyDB to every record.
 */
export interface TJSDocSaltyMetadata {
  ___id: string; // Internal Unique ID
  ___s: boolean; // Internal status
}

/**
 * Represents the result set or the DB instance itself.
 * It is a callable function that also has helper methods.
 */
export interface TJSDocSaltyCollection<T> {
  // Calling the instance/collection performs a query
  (
    query?: Partial<T> | object | ((record: T & TJSDocSaltyMetadata) => boolean)
  ): TJSDocSaltyCollection<T>;

  // --- Data Retrieval ---
  /** Returns all matched records as an array */
  get(): (T & TJSDocSaltyMetadata)[];
  /** Returns the first matched record or false if none found */
  first(): (T & TJSDocSaltyMetadata) | false;
  /** Returns the last matched record or false if none found */
  last(): (T & TJSDocSaltyMetadata) | false;
  /** Returns the number of matched records */
  count(): number;

  // --- Collection Manipulation ---
  /** Inserts one or more records into the database */
  insert(data: T | T[]): TJSDocSaltyCollection<T>;
  /** Updates matched records with new values */
  update(values: Partial<T>): TJSDocSaltyCollection<T>;
  /** Removes matched records from the database. Returns count of removed items. */
  remove(): number;

  // --- Utilities ---
  /** Iterates over matched records */
  each(
    callback: (record: T & TJSDocSaltyMetadata, index: number) => void | false
  ): TJSDocSaltyCollection<T>;
  /** Maps matched records to a new array */
  map<U>(callback: (record: T & TJSDocSaltyMetadata, index: number) => U): U[];
  /** Sorts the collection (e.g., "name asc", "price desc") */
  order(sortString: string): TJSDocSaltyCollection<T>;
  /** Limits the results to a specific range */
  limit(n: number): TJSDocSaltyCollection<T>;
  /** Returns an array of unique values for a specific key */
  distinct(key: keyof T): TJSDocSaltyCollection<T>[];
  /** Returns an array of arrays containing only specific fields */
  select(...keys: (keyof T)[]): TJSDocSaltyCollection<T>[][];
}
