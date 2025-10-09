# Spirit in Physics - Importer

## TerminusDB Migration Complete

This importer has been fully migrated from Supabase to **TerminusDB**, a powerful graph database that provides:

- **RDF-based data modeling** for complex relationships
- **WOQL query language** for advanced graph traversals
- **Git-like versioning** for data change tracking
- **JSON-LD schema definitions** for structured data

## Architecture Overview

### Data Model (RDF Graph)
- **Participant**: Experiment participants with demographics
- **Consent**: Participant consent information
- **ExperimentSession**: Individual experiment sessions
- **WordStimulus**: Stimulus words used in experiments
- **ResponseData**: Participant responses with reaction times, emotions, and physiological data

### Relationships
- Participant → has_consent → Consent
- Participant → has_session → ExperimentSession
- Participant → has_response → ResponseData
- ResponseData → belongs_to_session → ExperimentSession
- ResponseData → uses_stimulus → WordStimulus

## Key Components

### 1. TerminusDB Client (`terminusdb_client.py`)
Core client for database operations using WOQL queries.

### 2. Data Import (`import_to_terminusdb.py`)
Import experimental data from various sources into TerminusDB.

### 3. Data Access Layer (`src/terminusdb_data_access.py`)
High-level CRUD operations for all data entities.

### 4. Migration Script (`migrate_supabase_to_terminusdb.py`)
Migrate existing Supabase data to TerminusDB.

### 5. Temporal Activities (`src/activities/terminusdb_activities.py`)
Workflow activities for Hume AI emotion analysis integration.

## Setup

1. **Install Dependencies:**
   ```bash
   cd apps/importer
   pnpm install
   ```

2. **Configure TerminusDB:**
   Update `config.yaml` with TerminusDB connection details:
   ```yaml
   terminusdb:
     url: "http://localhost:6363"
     user: "admin"
     password: "root"
   ```

3. **Load Schema:**
   ```bash
   python -c "from terminusdb_client import TerminusDBClient; client = TerminusDBClient(); client.connect(); client.load_schema('terminusdb_schema.jsonld')"
   ```

## Usage

### Import Data
```bash
python import_to_terminusdb.py
```

### Migrate from Supabase
```bash
python migrate_supabase_to_terminusdb.py
```

### Query Data
```python
from src.terminusdb_data_access import TerminusDBDataAccess

config = {
    "url": "http://localhost:6363",
    "user": "admin",
    "password": "root",
    "database_id": "spirit_in_physics"
}

data_access = TerminusDBDataAccess(config)
data_access.connect()

# Get participants
participants = data_access.get_participants()

# Get response data
responses = data_access.get_response_data(participant_id="participant_001")
```

## WOQL Query Examples

### Find Participants with High Spirit Scores
```python
query = WOQLQuery().woql_and(
    WOQLQuery().triple("v:Participant", "rdf:type", "scm:Participant"),
    WOQLQuery().triple("v:Participant", "scm:id", "v:Id"),
    WOQLQuery().triple("v:Response", "belongs_to_participant", "v:Participant"),
    WOQLQuery().triple("v:Response", "scm:emotion_confidence", "v:Confidence"),
    WOQLQuery().greater("v:Confidence", 0.8)
)
```

### Graph Traversal for Emotion Patterns
```python
query = WOQLQuery().woql_and(
    WOQLQuery().triple("v:Participant", "has_response", "v:Response"),
    WOQLQuery().triple("v:Response", "belongs_to_session", "v:Session"),
    WOQLQuery().triple("v:Response", "uses_stimulus", "v:Stimulus"),
    WOQLQuery().triple("v:Stimulus", "scm:word", "v:Word"),
    WOQLQuery().triple("v:Response", "scm:emotion", "v:Emotion")
)
```

## Benefits of TerminusDB Migration

1. **Flexible Relationships**: Natural representation of complex data relationships
2. **Advanced Queries**: Graph traversal capabilities for pattern discovery
3. **Version Control**: Git-like versioning for data changes
4. **Scalability**: Efficient handling of connected data structures
5. **Extensibility**: Easy addition of new relationship types and properties

## Previous Supabase Implementation

The system was previously built on Supabase (PostgreSQL) with a relational schema. Key differences:

| Aspect | Supabase (Previous) | TerminusDB (Current) |
|--------|-------------------|---------------------|
| Data Model | Relational tables | RDF triples |
| Query Language | SQL | WOQL |
| Relationships | Foreign keys | Named edges |
| Schema | Fixed DDL | JSON-LD flexible |
| Versioning | Manual migrations | Git-like built-in |
| Extensibility | ALTER TABLE | Dynamic properties |

## Migration Status

✅ **Completed:**
- RDF schema design (`terminusdb_schema.jsonld`)
- TerminusDB client implementation
- Data import scripts conversion
- Temporal workflow activities
- Data access layer (CRUD operations)
- Migration script from Supabase
- Story narrative updates

🔄 **Next Steps:**
- Performance benchmarking
- Query optimization
- Advanced analytics queries
- API endpoint updates
