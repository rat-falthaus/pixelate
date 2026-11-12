/** Append one inset square to the compound path for its palette color. */
export function addTilePath(
  pathsByColor: Map<string, string[]>,
  color: string,
  col: number,
  row: number,
  tileSize: number,
  gap: number,
  drawSize: number,
): void {
  const x = Number((col * tileSize + gap).toFixed(2));
  const y = Number((row * tileSize + gap).toFixed(2));
  const command = `M${x} ${y}h${drawSize}v${drawSize}h-${drawSize}Z`;
  const commands = pathsByColor.get(color) ?? [];
  commands.push(command);
  pathsByColor.set(color, commands);
}
