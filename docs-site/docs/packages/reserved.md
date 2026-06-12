---
title: Reserved packages
group: Packages
order: 90
---

# Reserved packages

Two scoped packages are published to reserve their names on npm but are **not
usable yet**. Today they ship as Phase 1 stubs — a version constant and a
handful of type definitions — so nothing here is part of the supported API.
They're documented so you know what's coming and what the names are for.

## `@clean-jsdoc-theme/aadesh`

A command-line tool for clean-jsdoc-theme. The published binary name is
`clean-jsdoc`, and it's intended to drive build and i18n workflows from the
terminal — a single entry point for kicking off a build and (alongside
[bhasha](#clean-jsdoc-themebhasha)) the localization pipeline.

Today the source is a stub: the CLI entry just prints a "Phase 1 stub" line, and
the package already declares `commander` and `ora` as dependencies for the real
command surface to come.

> [!NOTE]
> 🚧 Under active development — stay tuned. Don't depend on this package yet.

Source:
[packages/aadesh](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh)

## `@clean-jsdoc-theme/bhasha`

Localization (i18n) tooling for clean-jsdoc-theme. The plan is an
extract → translate → build pipeline: pull translatable strings out of your
docs into per-locale files, manage translations, and feed them back into the
build so a site can ship in multiple languages.

Today the source defines the locale-file shape it will read and write — a
`LocaleFile` interface (a `@meta` block plus `strings` and `orphaned` maps) and a
`createEmptyLocale()` helper — but no extraction or build logic is wired up yet.

> [!NOTE]
> 🚧 Under active development — stay tuned. Don't depend on this package yet.

Source:
[packages/bhasha](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha)

---

For the packages you *can* use today, see the [Packages](/packages) landing page.
