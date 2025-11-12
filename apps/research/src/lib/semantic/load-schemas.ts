// Merkle DAG: lib.semantic.load_schemas
// Schema loader utility for JSON-LD schemas

import researchPaperSchema from '../../schemas/research-paper.jsonld?raw';
import authorsSchema from '../../schemas/authors.jsonld?raw';
import affiliationsSchema from '../../schemas/affiliations.jsonld?raw';
import sectionsSchema from '../../schemas/sections.jsonld?raw';
import equationsSchema from '../../schemas/equations.jsonld?raw';
import referencesSchema from '../../schemas/references.jsonld?raw';

interface LoadedSchemas {
  researchPaper: any;
  authors: any;
  affiliations: any;
  sections: any;
  equations: any;
  references: any;
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
    ],
  };
}

