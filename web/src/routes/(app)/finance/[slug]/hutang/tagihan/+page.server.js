import { redirect } from '@sveltejs/kit';

export function load({ params }) {
	throw redirect(303, `/finance/${params.slug}/hutang`);
}
