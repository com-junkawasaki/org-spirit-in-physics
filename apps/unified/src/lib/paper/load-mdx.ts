// Merkle DAG: lib.paper.load_mdx
// Utility to load MDX files with frontmatter parsing

import matter from 'gray-matter';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface PaperFrontmatter {
  title: string;
  description: string;
  authors: Array<{
    name: string;
    email?: string;
    affiliation: string;
  }>;
  date: string;
  affiliations: string[];
  schemaId?: string;
}

export interface LoadedMDX {
  frontmatter: PaperFrontmatter;
  content: string;
}

/**
 * Load MDX file and parse frontmatter
 */
export function loadMDX(filePath: string): LoadedMDX {
  const fullPath = join(process.cwd(), 'src', filePath);
  const fileContents = readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  
  return {
    frontmatter: data as PaperFrontmatter,
    content,
  };
}
