import type { ComponentType } from 'svelte';

export interface PaperMetadata {
	title: string;
	description: string;
	authors: Array<{
		name: string;
		email?: string;
		affiliation?: string;
	}>;
	date: string;
	affiliations?: string[];
	schemaId?: string;
	slug: string;
}

export async function loadPaper(slug: string): Promise<{
	metadata: PaperMetadata;
	component: ComponentType;
}> {
	try {
		// Dynamic import of MDX file
		const module = await import(`../paper/content/${slug}.mdx`);
		const component = module.default;
		
		// Extract metadata from frontmatter
		const metadata: PaperMetadata = {
			title: module.metadata?.title || slug,
			description: module.metadata?.description || '',
			authors: module.metadata?.authors || [],
			date: module.metadata?.date || '',
			affiliations: module.metadata?.affiliations || [],
			schemaId: module.metadata?.schemaId,
			slug
		};
		
		return { metadata, component };
	} catch (error) {
		console.error(`Failed to load paper: ${slug}`, error);
		throw error;
	}
}

export async function listPapers(): Promise<PaperMetadata[]> {
	// In a real implementation, this would scan the content directory
	// For now, return a hardcoded list
	return [
		{
			title: 'Spirit in Physics: A Quantitative Approach to Measuring Spirituality',
			description: 'A research paper on quantifying spirituality through word association experiments and emotion analysis',
			authors: [
				{
					name: 'Jumma Kawasaki',
					email: 'jumma@example.com',
					affiliation: 'GFTD Co., Ltd.'
				}
			],
			date: '2024-01-01',
			affiliations: ['GFTD Co., Ltd.'],
			schemaId: 'https://spirit-in-physics.gftd.ai/paper/spirit-in-physics',
			slug: 'spirit-in-physics'
		}
	];
}
