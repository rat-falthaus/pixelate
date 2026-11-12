import { escapeXml } from '../color';
import type { BackgroundMode } from '../types';
import type { GridBox } from './types';

/** Render the escaped message independently from the brand logo or fallback signature. */
export function renderMessage(
  messageBox: GridBox | null,
  tileSize: number,
  background: BackgroundMode,
  message: string,
  fontFamily: string,
): string[] {
  if (!messageBox) return [];
  const backgroundColor = background === 'white' ? '#FFFFFF' : '#080A09';
  const foregroundColor = background === 'white' ? '#080A09' : '#FFFFFF';
  const messageX = messageBox.col * tileSize;
  const messageY = messageBox.row * tileSize;
  const messageWidth = messageBox.cols * tileSize;
  const messageHeight = messageBox.rows * tileSize;
  const elements = ['<g id="message-overlay" data-draggable="message">'];

  if (background !== 'transparent') {
    elements.push(
      `<rect x="${messageX}" y="${messageY}" width="${messageWidth}" height="${messageHeight}" fill="${backgroundColor}"/>`,
    );
  }
  const firstBaseline = messageY + Math.round(tileSize * 0.48) + messageBox.fontSize * 0.82;
  messageBox.lines.forEach((line, index) => {
    const baseline = Number((firstBaseline + index * messageBox.lineHeight).toFixed(2));
    elements.push(
      `<text x="${messageX + Math.round(tileSize * 0.65)}" y="${baseline}" fill="${foregroundColor}" font-family="${escapeXml(fontFamily)}" font-size="${messageBox.fontSize}" font-weight="800" letter-spacing="0.015em">${escapeXml(line)}</text>`,
    );
  });
  elements.push('</g>');

  return elements;
}
