/** Reject active SVG content and external references before local rasterization. */
export async function sanitizeSvgLogo(file: File): Promise<Blob> {
  const source = await file.text();
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error("SVG logos cannot contain document declarations.");
  const documentSvg = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    documentSvg.querySelector("parsererror") ||
    documentSvg.documentElement.localName !== "svg" ||
    documentSvg.documentElement.namespaceURI !== "http://www.w3.org/2000/svg"
  ) {
    throw new Error("Choose a valid SVG logo.");
  }
  const prohibited = new Set([
    "script",
    "style",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
    "animate",
    "animateMotion",
    "animateTransform",
    "set",
  ]);
  for (const element of [
    documentSvg.documentElement,
    ...Array.from(documentSvg.querySelectorAll("*")),
  ]) {
    if (prohibited.has(element.localName))
      throw new Error("SVG logos cannot contain active content.");
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "style" || name === "xml:base") {
        throw new Error("SVG logos cannot contain scripts, inline styles, or remote content.");
      }
      if ((name === "href" || name.endsWith(":href")) && value && !value.startsWith("#")) {
        throw new Error("SVG logos cannot reference external files.");
      }
      if (/url\s*\(/i.test(value) && !/^url\(\s*#[\w.-]+\s*\)$/i.test(value)) {
        throw new Error("SVG logos cannot reference external files.");
      }
    }
  }
  return new Blob([new XMLSerializer().serializeToString(documentSvg.documentElement)], {
    type: "image/svg+xml",
  });
}
