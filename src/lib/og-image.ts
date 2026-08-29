// Build-time Open Graph card generation.
//
// Rendered with sharp's pango-backed text API against a vendored copy of
// JetBrains Mono, so the output doesn't depend on fonts being installed on
// whatever machine runs the build.

import sharp from 'sharp';

// Relative to the project root, which is where `astro build` runs. Kept as
// plain paths so this file needs no Node type definitions.
const REGULAR = 'src/assets/fonts/JetBrainsMono-Regular.ttf';
const BOLD = 'src/assets/fonts/JetBrainsMono-Bold.ttf';

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 72;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;

// Tokyo Night, matching the site
const BG = '#1a1b26';
const FG = '#c0caf5';
const CYAN = '#7dcfff';
const COMMENT = '#565f89';
const GREEN = '#9ece6a';

export interface OgCard {
  /** Headline — the episode or post title */
  title: string;
  /** Small line above the title, e.g. "podcast" or "blog" */
  kicker: string;
  /** Small line below the title, e.g. "Aug 26, 2026 · 45 min" */
  footer?: string;
}

function escapeMarkup(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function textLayer(
  text: string,
  color: string,
  font: string,
  fontfile: string,
  width: number
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  const image = sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
      font,
      fontfile,
      rgba: true,
      width,
      wrap: 'word',
      spacing: 10,
    },
  }).png();

  const buffer = await image.toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
}

export async function renderOgCard(card: OgCard): Promise<Uint8Array> {
  // Long titles get a smaller size so they still fit three lines
  const titleSize = card.title.length > 90 ? 40 : card.title.length > 55 ? 48 : 56;

  const kicker = await textLayer(`~/${card.kicker}`, CYAN, 'JetBrains Mono 26', REGULAR, CONTENT_WIDTH);
  const title = await textLayer(card.title, FG, `JetBrains Mono Bold ${titleSize}`, BOLD, CONTENT_WIDTH);
  const site = await textLayer('ryanhughes.me', GREEN, 'JetBrains Mono 26', REGULAR, CONTENT_WIDTH);
  const footer = card.footer
    ? await textLayer(card.footer, COMMENT, 'JetBrains Mono 26', REGULAR, CONTENT_WIDTH)
    : null;

  // Vertically centre the title block, with the kicker above it
  const blockHeight = kicker.height + 28 + title.height + (footer ? 28 + footer.height : 0);
  const top = Math.max(MARGIN, Math.round((HEIGHT - blockHeight) / 2));

  const layers: sharp.OverlayOptions[] = [
    // Left accent rule, like a terminal gutter
    {
      input: {
        create: { width: 8, height: HEIGHT, channels: 4, background: CYAN },
      },
      left: 0,
      top: 0,
    },
    { input: kicker.buffer, left: MARGIN, top },
    { input: title.buffer, left: MARGIN, top: top + kicker.height + 28 },
  ];

  if (footer) {
    layers.push({
      input: footer.buffer,
      left: MARGIN,
      top: top + kicker.height + 28 + title.height + 28,
    });
  }

  layers.push({ input: site.buffer, left: MARGIN, top: HEIGHT - MARGIN - site.height });

  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}
