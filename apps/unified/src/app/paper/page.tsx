// Merkle DAG: pages.index -> content.papers.spirit_in_physics
// Main research paper page - displays spirit-in-physics.mdx content
// Note: This is a placeholder. Full implementation requires converting Astro components to React.

import { redirect } from 'next/navigation';

// Redirect to spirit-in-physics page for now
export default function PaperIndexPage() {
  redirect('/paper/spirit-in-physics');
}
