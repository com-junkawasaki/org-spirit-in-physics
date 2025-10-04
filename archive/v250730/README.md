# Spirit in Physics - Research Process v2.0

This process is for experimental research on spirituality, based on Jung's word association test and computational modeling.

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database URL for migrations (optional, for local development)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and API keys from the project settings
3. Set up environment variables in `.env.local`
4. Run database migrations to set up the schema

```bash
# Install dependencies
pnpm install

# Start local Supabase (optional, for development)
pnpm supabase start

# Run database migrations
pnpm supabase db reset

# Stop local Supabase (when done)
pnpm supabase stop
```

**Note**: The database schema includes:
- `participants` - Participant information
- `participant_consents` - Consent data
- `participant_experiment_sessions` - Experiment session records
- `word_stimuli` - Stimulus words for the Jung test
- `participant_response_data` - Response data from participants

All tables have Row Level Security (RLS) enabled with appropriate policies.

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test
```