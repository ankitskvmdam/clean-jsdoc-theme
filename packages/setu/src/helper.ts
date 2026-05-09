export function makeStringSafeForOSFilename(str: string) {
  // We will get filepath or any string that contains characters
  // that may not be valid in a filename, so we clean it up.
  return str.replace(/[^a-zA-Z0-9_\-.]/g, '_');
}
