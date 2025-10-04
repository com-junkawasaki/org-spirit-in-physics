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
3. Run database migrations to set up the schema

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm supabase db push

# Generate TypeScript types
pnpm supabase gen types typescript --local > src/lib/database.types.ts
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test
```