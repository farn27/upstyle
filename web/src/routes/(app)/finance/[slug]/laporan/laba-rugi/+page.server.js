import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	throw redirect(303, `/finance/${params.slug}/laporan?tab=labarugi`);
}
