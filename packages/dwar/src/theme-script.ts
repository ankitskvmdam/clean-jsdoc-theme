/**
 * Pre-hydration theme script. Inlined into every page's `<head>` BEFORE the
 * stylesheet `<link>` so the data-theme attribute is set on `<html>` before
 * paint — preventing the FOUC that would otherwise happen with rang's
 * `ThemeToggle` (which only applies the theme post-mount).
 *
 * It also re-applies the reading preferences persisted by rang's `Settings`
 * island (font size + line spacing) for the same reason — the values must be
 * on `<html>` before first paint, otherwise the page reflows on hydration.
 * Storage keys + values are kept in sync with `rang/src/components/Settings.tsx`.
 */

const PRE_HYDRATION_THEME_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){d.dataset.theme=t}else if(matchMedia('(prefers-color-scheme: dark)').matches){d.dataset.theme='dark'}var fs=localStorage.getItem('clean-font-size');if(fs==='sm'){d.style.fontSize='15px'}else if(fs==='lg'){d.style.fontSize='18px'}var ls=localStorage.getItem('clean-line-spacing');if(ls==='compact'){d.style.setProperty('--clean-line-height','1.4')}else if(ls==='relaxed'){d.style.setProperty('--clean-line-height','1.8')}}catch(_){}}());`;

export function getPreHydrationThemeScript(): string {
  return PRE_HYDRATION_THEME_SCRIPT;
}
