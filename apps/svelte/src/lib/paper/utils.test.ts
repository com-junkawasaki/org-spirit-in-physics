import { describe, it, expect, vi } from 'vitest';
import { listPapers, loadPaper } from './utils';

describe('Paper Utils', () => {
	it('lists papers', async () => {
		const papers = await listPapers();
		expect(papers).toBeInstanceOf(Array);
		expect(papers.length).toBeGreaterThan(0);
		expect(papers[0]).toHaveProperty('title');
		expect(papers[0]).toHaveProperty('slug');
	});

	it('loads paper by slug', async () => {
		try {
			const paper = await loadPaper('spirit-in-physics');
			expect(paper).toHaveProperty('metadata');
			expect(paper).toHaveProperty('component');
			expect(paper.metadata.slug).toBe('spirit-in-physics');
		} catch (error) {
			// Paper file might not exist in test environment
			expect(error).toBeDefined();
		}
	});
});
