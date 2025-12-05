// Merkle DAG: components.reference_list
// Bibliography component with citation graph

interface Reference {
  id: string;
  citation: string;
  doi?: string;
  url?: string;
}

interface ReferenceListProps {
  references: Reference[];
}

export default function ReferenceList({ references }: ReferenceListProps) {
  return (
    <section id="references" className="mt-12">
      <h2 className="text-3xl font-bold mb-6">References</h2>
      <ol className="list-decimal list-inside space-y-3 prose prose-lg dark:prose-invert">
        {references.map((ref) => (
          <li key={ref.id} id={ref.id} className="mb-4">
            <span>{ref.citation}</span>
            {ref.doi && (
              <a
                href={`https://doi.org/${ref.doi}`}
                className="ml-2 text-blue-600 dark:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                DOI: {ref.doi}
              </a>
            )}
            {ref.url && (
              <a
                href={ref.url}
                className="ml-2 text-blue-600 dark:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Link
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
