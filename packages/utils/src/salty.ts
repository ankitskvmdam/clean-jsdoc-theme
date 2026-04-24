export interface TJSDocSaltyMetadata {
  ___id: string;
  ___s: boolean;
}

export interface TJSDocSaltyCollection<T> {
  (
    query?: Partial<T> | object | ((record: T & TJSDocSaltyMetadata) => boolean)
  ): TJSDocSaltyCollection<T>;

  get(): (T & TJSDocSaltyMetadata)[];
  first(): (T & TJSDocSaltyMetadata) | false;
  last(): (T & TJSDocSaltyMetadata) | false;
  count(): number;
  insert(data: T | T[]): TJSDocSaltyCollection<T>;
  update(values: Partial<T>): TJSDocSaltyCollection<T>;
  remove(): number;
  each(
    callback: (record: T & TJSDocSaltyMetadata, index: number) => void | false
  ): TJSDocSaltyCollection<T>;
  map<U>(callback: (record: T & TJSDocSaltyMetadata, index: number) => U): U[];
  order(sortString: string): TJSDocSaltyCollection<T>;
  /** In-place sort on the underlying items array (e.g. "name asc, version desc") */
  sort(keys: string): boolean;
  limit(n: number): TJSDocSaltyCollection<T>;
  distinct(key: keyof T): TJSDocSaltyCollection<T>[];
  select(...keys: (keyof T)[]): TJSDocSaltyCollection<T>[][];
}
