// Site-wide constants. Anything that ends up in a <head>, a sitemap, or a feed
// should read from here rather than hardcoding the domain again.

export const SITE_URL = 'https://ryanhughes.me';
export const SITE_TITLE = 'Ryan Hughes';
export const SITE_AUTHOR = 'Ryan Hughes';
export const TWITTER_HANDLE = '@ryanrhughes';

export const DEFAULT_DESCRIPTION =
  'Ryan Hughes — Builder, founder, open-source contributor. Partner & CIO at Oodle, Omarchy core team member.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.png`;

/** Absolute URL for a site-relative path ('', 'blog', 'podcast/foo'). */
export function absoluteUrl(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `${SITE_URL}/${clean}/` : `${SITE_URL}/`;
}

/** Trim prose to a meta-description-sized string on a word boundary. */
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—-]$/, '') + '…';
}
