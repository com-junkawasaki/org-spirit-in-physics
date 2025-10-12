# Spirit in Physics - Analyzer

## ArangoDB Migration Complete

This analyzer has been fully migrated from Supabase to **ArangoDB**, a powerful multi-model database.

## Key Changes

### Configuration (`config.yaml`)
- **Before**: Supabase URL and service role key
- **After**: TerminusDB URL, user, password, and database name

### Dependencies (`requirements.txt`)
- **Before**: `supabase`
- **After**: `terminusdb-client`

### Data Access (`src/pipeline/data_loader.py`)
- **Before**: Supabase client queries
- **After**: WOQL queries against TerminusDB

### Data Storage (`src/pipeline/data_storer.py`)
- **Before**: Supabase table inserts
- **After**: RDF document creation with relationships

## WOQL Query Examples

### Get Unprocessed Responses
```python
query = WOQLQuery().woql_and(
    WOQLQuery().triple("v:Response", "rdf:type", "scm:ResponseData"),
    WOQLQuery().triple("v:Response", "scm:id", "v:Id"),
    WOQLQuery().triple("v:Response", "scm:stimulus_word", "v:StimulusWord"),
    WOQLQuery().triple("v:Response", "scm:response_word", "v:ResponseWord"),
    WOQLQuery().triple("v:Response", "belongs_to_participant", "v:Participant"),
    WOQLQuery().limit(limit)
)
```

### Store Analysis Results
```python
query = WOQLQuery().woql_and(
    WOQLQuery().insert(result_doc),
    WOQLQuery().link(run_iri, "has_result", result_iri),
    WOQLQuery().link(response_iri, "has_analysis_result", result_iri)
)
```

## Migration Benefits

1. **Flexible Data Model**: RDF triples allow dynamic relationship creation
2. **Advanced Queries**: Graph traversal for complex data relationships
3. **Version Control**: Git-like versioning for data changes
4. **Unified System**: Consistent data access across all components

## Usage

```bash
# Install dependencies
pip install -r requirements.txt

# Run analysis
python src/main.py
```