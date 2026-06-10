declare module '@jsdoc/salty' {
  export function taffy<T>(
    items?: T[]
  ): import('@clean-jsdoc-theme/utils').TJSDocSaltyCollection<T>;
}
