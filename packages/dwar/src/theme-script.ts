/**
 * Pre-hydration theme script. Inlined into every page's `<head>` BEFORE the
 * stylesheet `<link>` so the data-theme attribute is set on `<html>` before
 * paint — preventing the FOUC that would otherwise happen with rang's
 * `ThemeToggle` (which only applies the theme post-mount).
 */

const PRE_HYDRATION_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}else if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark'}}catch(_){}}());`;

export function getPreHydrationThemeScript(): string {
  return PRE_HYDRATION_THEME_SCRIPT;
}
