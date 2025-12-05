// Merkle DAG: pages.spirit_in_physics
// Main research paper page with MDX support

import ResearchLayout from '@/app/researcher/layout';
import ResearchPaper from '@/components/paper/ResearchPaper';
import { loadMDX } from '@/lib/paper/load-mdx';
import { evaluate } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import * as runtime from 'react/jsx-runtime';

export default async function SpiritInPhysicsPage() {
  // Load MDX content with frontmatter
  const { frontmatter, content } = loadMDX('content/paper/papers/spirit-in-physics.mdx');
  
  // Evaluate MDX content to get the component
  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex],
  });
  
  return (
    <ResearchLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <ResearchPaper
          title={frontmatter.title}
          description={frontmatter.description}
          authors={frontmatter.authors}
          date={frontmatter.date}
          affiliations={frontmatter.affiliations}
          {...(frontmatter.schemaId !== undefined ? { schemaId: frontmatter.schemaId } : {})}
        >
          <MDXContent />
        </ResearchPaper>
      </div>
    </ResearchLayout>
  );
}
