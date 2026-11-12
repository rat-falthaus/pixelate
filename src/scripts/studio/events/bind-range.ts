/** Connect a range control to its displayed value and typed change callback. */
export function bindRange(
  input: HTMLInputElement,
  output: HTMLElement,
  onChange: (value: number) => void,
  suffix = "%",
): void {
  input.addEventListener("input", () => {
    const value = Number(input.value);
    output.textContent = `${value}${suffix}`;
    onChange(value);
  });
}
