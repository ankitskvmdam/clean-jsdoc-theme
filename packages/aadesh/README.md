# @clean-jsdoc-theme/aadesh

CLI for clean-jsdoc-theme i18n and build workflows.

The command-line interface. Provides the clean-jsdoc binary with subcommands for workflows that live outside jsdoc -c — primarily the i18n cycle (extract, translate, report) and a few maintenance utilities (doctor for config validation, scaffold for generating example projects).
Importantly, the CLI doesn't re-implement anything — it's a thin wrapper over core and i18n. Users who prefer programmatic access import those packages directly.
