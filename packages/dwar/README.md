# @clean-jsdoc-theme/dwar

Internal: Astro theme integration for clean-jsdoc-theme v5.

The Astro integration. Glue between the generated MDX (from core) and an Astro site. Ships an Astro integration (defineIntegration) that sets up the content collection schema for JSDoc-generated pages, wires in the ui components, provides default routing, and configures sensible defaults for search and navigation.
If you're using Starlight underneath, this package contains the Starlight config, component overrides map, and any Starlight-specific adapters. If you eventually swap Starlight for a custom Astro layout, this is the only package that changes.
