// Merkle DAG: components.author_info
// Author metadata component with JSON-LD annotations

interface Author {
  name: string;
  email?: string;
  affiliation: string;
}

interface AuthorInfoProps {
  authors: Author[];
}

export default function AuthorInfo({ authors }: AuthorInfoProps) {
  return (
    <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Authors</h3>
      <ul className="space-y-2">
        {authors.map((author, index) => (
          <li key={index}>
            <strong>{author.name}</strong>
            {author.email && (
              <a
                href={`mailto:${author.email}`}
                className="ml-2 text-blue-600 dark:text-blue-400"
              >
                {author.email}
              </a>
            )}
            <span className="ml-2 text-gray-600 dark:text-gray-400">{author.affiliation}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
