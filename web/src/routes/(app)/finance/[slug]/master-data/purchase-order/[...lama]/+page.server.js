import { redirect } from '@sveltejs/kit';

// Alamat lama Purchase Order — sekarang ada di modul Pengadaan.
export function load({ params }) {
	const sisa = params.lama === 'new' ? 'baru' : params.lama;
	throw redirect(308, `/finance/${params.slug}/pengadaan/po${sisa ? `/${sisa}` : ''}`);
}
