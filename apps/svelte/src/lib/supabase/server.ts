import { createServerClient } from '@supabase/ssr';
import { cookies } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createSupabaseServerClient() {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookies().getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies().set(name, value, options);
				});
			}
		}
	});
}
