// Merkle DAG: lib.semantic.load_schemas
// Schema loader utility for JSON-LD schemas

import researchPaperSchema from '@/schemas/paper/research-paper.jsonld?raw';
import authorsSchema from '@/schemas/paper/authors.jsonld?raw';
import affiliationsSchema from '@/schemas/paper/affiliations.jsonld?raw';
import sectionsSchema from '@/schemas/paper/sections.jsonld?raw';
import equationsSchema from '@/schemas/paper/equations.jsonld?raw';
import referencesSchema from '@/schemas/paper/references.jsonld?raw';
import pipelineStepsSchema from '@/schemas/paper/pipeline-steps.jsonld?raw';
import visualizationSchema from '@/schemas/paper/visualization.jsonld?raw';

interface LoadedSchemas {
  researchPaper: any;
  authors: any;
  affiliations: any;
  sections: any;
  equations: any;
  references: any;
  pipelineSteps: any;
  visualization: any;
}

/**
 * Load all JSON-LD schemas
 */
export function loadSchemas(): LoadedSchemas {
  return {
    researchPaper: JSON.parse(researchPaperSchema),
    authors: JSON.parse(authorsSchema),
    affiliations: JSON.parse(affiliationsSchema),
    sections: JSON.parse(sectionsSchema),
    equations: JSON.parse(equationsSchema),
    references: JSON.parse(referencesSchema),
    pipelineSteps: JSON.parse(pipelineStepsSchema),
    visualization: JSON.parse(visualizationSchema),
  };
}

/**
 * Get combined JSON-LD context for all schemas
 */
export function getCombinedContext() {
  const schemas = loadSchemas();
  return {
    '@context': schemas.researchPaper['@context'],
    '@graph': [
      schemas.researchPaper,
      ...(schemas.authors['@graph'] || []),
      ...(schemas.affiliations['@graph'] || []),
      ...(schemas.sections['@graph'] || []),
      ...(schemas.equations['@graph'] || []),
      ...(schemas.references['@graph'] || []),
      ...(schemas.pipelineSteps['@graph'] || []),
      ...(schemas.visualization['@graph'] || []),
    ],
  };
}

