// MDX components configuration for Next.js
// @next/mdx automatically handles MDX component types

export function useMDXComponents(components: Record<string, React.ComponentType<any>>): Record<string, React.ComponentType<any>> {
  return {
    ...components,
  };
}
