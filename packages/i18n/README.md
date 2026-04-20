# @clean-jsdoc-theme/i18n

Internal: localization tooling for clean-jsdoc-theme v5.

The localization tooling. Everything translation-related in one place: the .po-style JSON schema (strings + orphaned + @meta), the extractor that walks doclets and produces locale files, the translator function that build-time code uses to look up strings with graceful English fallback, and the orphan-handling logic that preserves old translations when English evolves.
Also exposes hooks for optional LLM-assisted translation (Claude/DeepL providers) and drift detection reports. Works standalone — someone could use it to localize any markdown-producing pipeline, not just JSDoc.
