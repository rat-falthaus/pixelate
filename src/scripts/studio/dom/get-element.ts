/**
 * Resolve a required studio element, failing explicitly when markup is incomplete.
 * @param id Element ID defined by the Astro components.
 * @typeParam T Expected DOM element type at the call site.
 */
export function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Studio element "${id}" is missing from the page.`);
  return element as T;
}
