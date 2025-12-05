// Merkle DAG: components.section
// Section wrapper component with JSON-LD annotations

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  schemaId?: string;
  children?: React.ReactNode;
}

export default function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      {description && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      )}
      {children}
    </section>
  );
}
