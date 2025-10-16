import { redirect } from 'next/navigation'

// Merkle DAG: root_page -> landing_redirect
export default function HomePage() {
  redirect('/dashboard')
}
