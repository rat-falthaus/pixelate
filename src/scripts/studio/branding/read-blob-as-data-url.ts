/** Read a local blob as an embeddable data URI, rejecting file-reader failures. */
export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The local brand asset could not be read."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("The local brand asset could not be read."));
    reader.readAsDataURL(blob);
  });
}
