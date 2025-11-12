# Spirit in Physics - Research Paper Publication

Astro-based static site for publishing the "Spirit in Physics" research paper with MDX content management and comprehensive JSON-LD semantic annotations.

## Features

- **MDX Content Management**: Research paper content managed in MDX format with frontmatter metadata
- **Mathematical Equations**: KaTeX rendering for LaTeX equations
- **JSON-LD Semantic Annotations**: Comprehensive RDF/OWL/SKOS/SHACL structured data
- **Responsive Design**: Apple Human Interface Guidelines compliant, optimized for iPad/iPhone
- **Static Site Generation**: Fast, SEO-friendly static site with Astro

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
cd apps/research
pnpm install
```

### Development

```bash
pnpm dev
```

The site will be available at `http://localhost:4321`

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

## Project Structure

```
apps/research/
├── src/
│   ├── components/          # Astro components with JSON-LD annotations
│   │   ├── ResearchPaper.astro
│   │   ├── Section.astro
│   │   ├── Equation.astro
│   │   ├── AuthorInfo.astro
│   │   ├── ReferenceList.astro
│   │   └── TableOfContents.astro
│   ├── content/            # MDX content files
│   │   ├── config.ts       # Content collection config
│   │   └── papers/
│   │       └── spirit-in-physics.mdx
│   ├── layouts/            # Page layouts
│   │   └── ResearchLayout.astro
│   ├── lib/                # Utility functions
│   │   └── semantic/
│   │       └── load-schemas.ts
│   ├── pages/              # Astro pages
│   │   ├── index.astro
│   │   └── spirit-in-physics.astro
│   ├── schemas/            # JSON-LD schema files
│   │   ├── research-paper.jsonld
│   │   ├── authors.jsonld
│   │   ├── affiliations.jsonld
│   │   ├── sections.jsonld
│   │   ├── equations.jsonld
│   │   └── references.jsonld
│   └── types/              # TypeScript type definitions
│       └── content.d.ts
├── public/                 # Static assets
├── astro.config.mjs        # Astro configuration
├── tailwind.config.mjs     # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## JSON-LD Semantic Structure

The application uses comprehensive JSON-LD schemas following RDF/OWL/SKOS/SHACL principles:

- **Research Paper**: ScholarlyArticle schema with metadata
- **Authors**: Person entities with affiliations
- **Sections**: Article sections linked to the main paper
- **Equations**: Mathematical expressions with semantic markup
- **References**: Citation graph with DOI links

## Mathematical Equations

Equations are rendered using KaTeX. Use:

- Inline equations: `$...$`
- Block equations: `$$...$$`

## Docker

The application is containerized and can be run with Docker Compose:

```bash
docker-compose up research
```

## License

All rights reserved by Jun Kawasaki. @CC BY-NC-SA
