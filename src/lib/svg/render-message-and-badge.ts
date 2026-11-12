import { escapeXml } from '../color';
import type { BackgroundMode } from '../types';
import type { GridBox } from './types';

/** Render escaped message text and optional brand signature into SVG overlay groups. */
export function renderMessageAndBadge(
  messageBox: GridBox | null,
  badgeBox: GridBox | null,
  tileSize: number,
  background: BackgroundMode,
  message: string,
  brandSignature: string,
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

  if (badgeBox && brandSignature.trim()) {
    const x = badgeBox.col * tileSize;
    const y = badgeBox.row * tileSize;
    const width = badgeBox.cols * tileSize;
    const height = badgeBox.rows * tileSize;
    if (background !== 'transparent') {
      elements.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${backgroundColor}"/>`,
      );
    }
    const iconSize = Math.round(height * 0.56);
    const iconX = x + Math.round(tileSize * 0.35);
    const iconY = y + Math.round((height - iconSize) / 2);
    const fontSize = Math.max(10, Math.round(iconSize * 0.68));
    elements.push(`<g id="brand-signature" fill="${foregroundColor}">`);
    elements.push(
      `<path d="M${iconX} ${iconY}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}zM${iconX + iconSize * 0.52} ${iconY}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}zM${iconX} ${iconY + iconSize * 0.52}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}z"/>`,
    );
    elements.push(
      `<text x="${iconX + iconSize + tileSize * 0.35}" y="${y + height * 0.58}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="800">${escapeXml(brandSignature.trim())}</text>`,
    );
    elements.push('</g>');
  }
  return elements;
}
