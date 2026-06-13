/**
 * A tiny, fully-documented sample module that exists to demonstrate
 * `clean-jsdoc-theme`'s **multi-language** documentation support.
 *
 * clean-jsdoc-theme renders this API reference in several languages from a
 * single source. Class and method descriptions, parameter docs, and example
 * captions are translated per locale, while the UI chrome — search, the
 * sidebar, the table of contents, and settings — is localized too. Use the
 * globe control beside the title to switch languages; every page links to its
 * counterpart in each configured language, and anything not yet translated
 * gracefully falls back to the default language.
 *
 * @module widget-kit
 * @summary A documented sample module showcasing localized API docs.
 */

/**
 * A reusable UI widget — the running example for this documentation site.
 *
 * This class shows how each documented member (the constructor, fields, and
 * methods) renders its own section, and how their prose is translated for every
 * configured locale while the code stays the same.
 *
 * @example <caption>Create and render a widget</caption>
 * const w = new Widget('save', { label: 'Save' });
 * document.body.append(w.render());
 */
export class Widget {
  /**
   * Create a widget.
   *
   * @param {string} id - A unique identifier for the widget.
   * @param {object} [options={}] - Optional configuration.
   * @param {string} [options.label] - Visible text for the widget.
   * @param {boolean} [options.disabled=false] - Whether the widget starts disabled.
   */
  constructor(id, options = {}) {
    /** The widget's unique identifier. */
    this.id = id;
    /** The visible label, or the id when none was given. */
    this.label = options.label ?? id;
    /** Whether the widget is currently disabled. */
    this.disabled = options.disabled ?? false;
  }

  /**
   * Render the widget to a detached DOM element.
   *
   * @returns {HTMLButtonElement} A button element representing the widget.
   * @example
   * const el = new Widget('ok', { label: 'OK' }).render();
   */
  render() {
    const button = document.createElement('button');
    button.textContent = this.label;
    button.disabled = this.disabled;
    return button;
  }

  /**
   * Enable or disable the widget.
   *
   * @param {boolean} disabled - `true` to disable, `false` to enable.
   * @returns {Widget} The widget instance, so calls can be chained.
   */
  setDisabled(disabled) {
    this.disabled = disabled;
    return this;
  }
}

/**
 * Create a widget from a plain configuration object — a small convenience
 * wrapper over the {@link Widget} constructor.
 *
 * @param {object} config - The widget configuration.
 * @param {string} config.id - The widget's unique identifier.
 * @param {string} [config.label] - Visible text for the widget.
 * @returns {Widget} A new widget instance.
 */
export function createWidget(config) {
  return new Widget(config.id, { label: config.label });
}
