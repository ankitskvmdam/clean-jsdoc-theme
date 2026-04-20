# @clean-jsdoc-theme/core

Internal: doclet processing and MDX generation for clean-jsdoc-theme v5.

The JSDoc brain. Understands the JSDoc data model and turns it into clean MDX. This is where all the JSDoc-specific logic lives — doclet filtering, longname-to-filename slugging, type expression parsing (Array<Map<string, T>> → a structured tree), inheritance chain resolution, cross-reference link resolution (@link MyClass → correct URL), and the markdown generation itself via mdast-util-to-markdown.Has zero knowledge of HTML, Astro, or any rendering target. Outputs MDX strings + frontmatter. This separation means someone could write their own Next.js renderer using core without touching our Astro code.
