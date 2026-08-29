// Shared blog collection loading. All three page entrypoints inline the same
// #blog-data payload, so the shape is defined once here.

import { getCollection } from 'astro:content';
import type { BlogListEntry } from './page-meta';

export interface BlogPostJson {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  description: string;
  tags: string[];
  body: string;
}

// Frontmatter dates parse as UTC midnight, so format in UTC too — otherwise
// every date renders a day early for anyone west of Greenwich.
export const POST_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
};

/** Published posts, newest first. */
export async function getPublishedPosts() {
  return (await getCollection('blog'))
    .filter(post => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function toBlogJson(posts: Awaited<ReturnType<typeof getPublishedPosts>>): string {
  return JSON.stringify(
    posts.map(post => ({
      slug: post.id.replace(/\.md$/, ''),
      title: post.data.title,
      date: post.data.date.toLocaleDateString('en-US', POST_DATE_FORMAT),
      updated: post.data.updated?.toLocaleDateString('en-US', POST_DATE_FORMAT),
      description: post.data.description,
      tags: post.data.tags,
      body: post.body,
    }))
  );
}

/** Slimmed-down entries for the /blog listing's no-JS mirror. */
export function toBlogList(posts: Awaited<ReturnType<typeof getPublishedPosts>>): BlogListEntry[] {
  return posts.map(post => ({
    slug: post.id.replace(/\.md$/, ''),
    title: post.data.title,
    date: post.data.date.toLocaleDateString('en-US', POST_DATE_FORMAT),
    description: post.data.description,
  }));
}
