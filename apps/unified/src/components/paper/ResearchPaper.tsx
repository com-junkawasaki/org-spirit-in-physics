// Merkle DAG: components.research_paper
// Main research paper layout component with JSON-LD annotations

interface Author {
  name: string;
  email?: string;
  affiliation: string;
}

interface ResearchPaperProps {
  title: string;
  description: string;
  authors: Author[];
  date: string;
  affiliations: string[];
  schemaId?: string;
  children?: React.ReactNode;
}

export default function ResearchPaper({
  title,
  description,
  authors,
  date,
  affiliations,
  children,
}: ResearchPaperProps) {
  // Note: JSON-LD schemas loading is commented out as it requires Astro-specific imports
  // TODO: Implement schema loading for Next.js if needed
  // const schemas = getCombinedContext();

  return (
    <>
      <article className="prose prose-lg dark:prose-invert w-full max-w-none py-8 prose-headings:max-w-none prose-p:max-w-none prose-ul:max-w-none prose-ol:max-w-none prose-li:max-w-none">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">{description}</p>

          <div className="mb-4">
            <strong>Authors:</strong>
            {authors.map((author, index) => (
              <span key={index}>
                {author.name}
                {author.email && (
                  <a href={`mailto:${author.email}`} className="ml-1">
                    ({author.email})
                  </a>
                )}
                {index < authors.length - 1 && ', '}
              </span>
            ))}
          </div>

          <div className="mb-4">
            <strong>Affiliation:</strong> {affiliations.join(', ')}
          </div>

          <time dateTime={date} className="text-sm text-gray-500">
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        {children}
      </article>

      {/* JSON-LD schemas would be added here if needed */}
      {/* <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas, null, 2) }} /> */}
    </>
  );
}
