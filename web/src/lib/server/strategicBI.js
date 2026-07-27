/**
 * Hitung metrik bisnis dari data transaksi nyata (bukan hardcoded).
 * @param {object} params
 * @param {number|string} params.totalMasuk
 * @param {number|string} params.totalKeluar
 * @param {number|string} [params.directCosts]
 * @param {number|string} [params.modalAwal]
 */
export function buildStrategicBI({ totalMasuk, totalKeluar, directCosts = 0, modalAwal = 0 }) {
	const masuk = Number(totalMasuk) || 0;
	const keluar = Number(totalKeluar) || 0;
	const direct = Number(directCosts) || 0;
	const modal = Number(modalAwal) || 0;
	const netProfit = masuk - keluar;

	const grossMargin = masuk > 0 ? ((masuk - direct) / masuk) * 100 : 0;
	const opEfficiency = masuk > 0 ? (keluar / masuk) * 100 : 0;

	const monthlyBurn = netProfit < 0 ? Math.abs(netProfit) : 0;
	const cashRunway =
		monthlyBurn > 0 && modal > 0
			? Math.max(1, Math.floor(modal / monthlyBurn))
			: netProfit >= 0
				? null
				: 0;

	let integrityScore = 5;
	if (grossMargin > 30) integrityScore += 2;
	else if (grossMargin > 15) integrityScore += 1;
	if (netProfit > 0) integrityScore += 2;
	else integrityScore -= 2;
	integrityScore = Math.max(1, Math.min(10, Number(integrityScore.toFixed(1))));

	const aiConfidence =
		masuk > 0 ? Math.min(95, Math.max(50, 55 + Math.round(grossMargin / 3))) : 45;

	let outlook = 'CAUTION';
	if (netProfit < 0) outlook = 'CRITICAL WATCH';
	else if (grossMargin >= 20) outlook = 'STABLE OUTLOOK';
	else if (grossMargin >= 10) outlook = 'MODERATE';

	let riskAssessment = 'LOW';
	if (netProfit < 0 || grossMargin < 10) riskAssessment = 'HIGH';
	else if (grossMargin < 20) riskAssessment = 'MEDIUM';

	return {
		margin: grossMargin.toFixed(1),
		efficiency: opEfficiency.toFixed(1),
		netProfit,
		outlook,
		integrityScore,
		cashRunway: cashRunway ?? 999,
		riskAssessment,
		aiConfidence
	};
}
