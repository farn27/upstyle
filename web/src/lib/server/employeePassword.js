import argon2 from 'argon2';

const HASH_PREFIX = '$argon2';

export async function hashEmployeePassword(plainPassword) {
	return argon2.hash(plainPassword);
}

/**
 * @returns {{ valid: boolean, needsRehash: boolean }}
 */
export async function verifyEmployeePassword(storedPassword, plainPassword) {
	if (!storedPassword) {
		return { valid: false, needsRehash: false };
	}

	if (!storedPassword.startsWith(HASH_PREFIX)) {
		const valid = storedPassword === plainPassword;
		return { valid, needsRehash: valid };
	}

	try {
		const valid = await argon2.verify(storedPassword, plainPassword);
		const needsRehash = valid && argon2.needsRehash(storedPassword);
		return { valid, needsRehash };
	} catch {
		return { valid: false, needsRehash: false };
	}
}
