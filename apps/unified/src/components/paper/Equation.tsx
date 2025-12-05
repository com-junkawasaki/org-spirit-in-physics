// Merkle DAG: components.equation
// KaTeX equation renderer with semantic markup
// Note: KaTeX rendering is handled by remark-math and rehype-katex in MDX

interface EquationProps {
  id?: string;
  equation: string;
  display?: 'inline' | 'block';
  schemaId?: string;
}

export default function Equation({ id, equation, display = 'block' }: EquationProps) {
  const isBlock = display === 'block';

  if (isBlock) {
    return (
      <div id={id} className="my-8 overflow-x-auto">
        <div className="katex-display" dangerouslySetInnerHTML={{ __html: equation }} />
      </div>
    );
  }

  return (
    <span id={id} className="katex-inline" dangerouslySetInnerHTML={{ __html: equation }} />
  );
}
