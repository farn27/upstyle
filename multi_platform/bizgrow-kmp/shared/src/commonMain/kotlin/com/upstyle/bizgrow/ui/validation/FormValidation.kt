package com.upstyle.bizgrow.ui.validation

/**
 * Form validation utilities for consistent input validation across the app
 */

// ─── Validation Result ────────────────────────────────────────────────────────
sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val message: String) : ValidationResult()
    
    val isValid: Boolean get() = this is Valid
    val errorMessage: String? get() = (this as? Invalid)?.message
}

// ─── Validators ───────────────────────────────────────────────────────────────

fun String.validateRequired(fieldName: String = "Field"): ValidationResult {
    return if (this.isBlank()) {
        ValidationResult.Invalid("$fieldName tidak boleh kosong")
    } else {
        ValidationResult.Valid
    }
}

fun String.validateEmail(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Valid // Optional field
    
    val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
    return if (emailRegex.matches(this)) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("Format email tidak valid")
    }
}

fun String.validatePhone(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Valid // Optional field
    
    // Indonesian phone format: 08xx, +62, 62xxx
    val phoneRegex = "^(\\+62|62|0)[0-9]{9,13}$".toRegex()
    return if (phoneRegex.matches(this.replace("-", "").replace(" ", ""))) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("Format nomor telepon tidak valid (contoh: 08123456789)")
    }
}

fun String.validateMinLength(minLength: Int, fieldName: String = "Field"): ValidationResult {
    return if (this.length < minLength) {
        ValidationResult.Invalid("$fieldName minimal $minLength karakter")
    } else {
        ValidationResult.Valid
    }
}

fun String.validateMaxLength(maxLength: Int, fieldName: String = "Field"): ValidationResult {
    return if (this.length > maxLength) {
        ValidationResult.Invalid("$fieldName maksimal $maxLength karakter")
    } else {
        ValidationResult.Valid
    }
}

fun String.validateNumeric(fieldName: String = "Field"): ValidationResult {
    return if (this.isBlank()) {
        ValidationResult.Invalid("$fieldName tidak boleh kosong")
    } else if (this.toDoubleOrNull() == null) {
        ValidationResult.Invalid("$fieldName harus berupa angka")
    } else {
        ValidationResult.Valid
    }
}

fun String.validatePositiveNumber(fieldName: String = "Field"): ValidationResult {
    val number = this.toDoubleOrNull()
    return when {
        this.isBlank() -> ValidationResult.Invalid("$fieldName tidak boleh kosong")
        number == null -> ValidationResult.Invalid("$fieldName harus berupa angka")
        number <= 0 -> ValidationResult.Invalid("$fieldName harus lebih dari 0")
        else -> ValidationResult.Valid
    }
}

fun String.validatePassword(): ValidationResult {
    return when {
        this.isBlank() -> ValidationResult.Invalid("Password tidak boleh kosong")
        this.length < 6 -> ValidationResult.Invalid("Password minimal 6 karakter")
        else -> ValidationResult.Valid
    }
}

fun String.validatePasswordMatch(otherPassword: String): ValidationResult {
    return if (this != otherPassword) {
        ValidationResult.Invalid("Password tidak cocok")
    } else {
        ValidationResult.Valid
    }
}

fun String.validateNotEmpty(fieldName: String = "Field"): ValidationResult {
    return validateRequired(fieldName)
}

// ─── Multi-field Validators ───────────────────────────────────────────────────

/**
 * Validate multiple fields and return first error or Valid
 */
fun validateAll(vararg validations: ValidationResult): ValidationResult {
    val firstError = validations.firstOrNull { it is ValidationResult.Invalid }
    return firstError ?: ValidationResult.Valid
}

/**
 * Validate multiple fields and return all errors
 */
fun validateAllErrors(vararg validations: ValidationResult): List<String> {
    return validations.filterIsInstance<ValidationResult.Invalid>().map { it.message }
}

// ─── Specific Business Validators ─────────────────────────────────────────────

fun String.validateNIK(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Valid // Optional
    
    return if (this.length == 16 && this.all { it.isDigit() }) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("NIK harus 16 digit angka")
    }
}

fun String.validateNPWP(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Valid // Optional
    
    val cleaned = this.replace(".", "").replace("-", "")
    return if (cleaned.length == 15 && cleaned.all { it.isDigit() }) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("NPWP harus 15 digit angka")
    }
}

fun String.validateSKU(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Invalid("SKU tidak boleh kosong")
    
    return if (this.matches("^[A-Z0-9-]+$".toRegex())) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("SKU hanya boleh huruf kapital, angka, dan dash")
    }
}

fun String.validateBarcode(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Valid // Optional
    
    return if (this.length in 8..13 && this.all { it.isDigit() }) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("Barcode harus 8-13 digit angka")
    }
}

// ─── Currency Validators ──────────────────────────────────────────────────────

fun String.validateCurrency(fieldName: String = "Nominal", allowZero: Boolean = false): ValidationResult {
    val cleaned = this.replace("Rp", "").replace(".", "").replace(",", "").trim()
    val number = cleaned.toDoubleOrNull()
    
    return when {
        cleaned.isBlank() -> ValidationResult.Invalid("$fieldName tidak boleh kosong")
        number == null -> ValidationResult.Invalid("$fieldName harus berupa angka")
        !allowZero && number <= 0 -> ValidationResult.Invalid("$fieldName harus lebih dari 0")
        number < 0 -> ValidationResult.Invalid("$fieldName tidak boleh negatif")
        else -> ValidationResult.Valid
    }
}

// ─── Date Validators ──────────────────────────────────────────────────────────

fun String.validateDate(): ValidationResult {
    if (this.isBlank()) return ValidationResult.Invalid("Tanggal tidak boleh kosong")
    
    // Format: YYYY-MM-DD or DD-MM-YYYY
    val patterns = listOf(
        "^\\d{4}-\\d{2}-\\d{2}$".toRegex(),
        "^\\d{2}-\\d{2}-\\d{4}$".toRegex(),
        "^\\d{4}/\\d{2}/\\d{2}$".toRegex(),
        "^\\d{2}/\\d{2}/\\d{4}$".toRegex()
    )
    
    return if (patterns.any { it.matches(this) }) {
        ValidationResult.Valid
    } else {
        ValidationResult.Invalid("Format tanggal tidak valid (contoh: 2024-12-31)")
    }
}

// ─── Username Validator ───────────────────────────────────────────────────────

fun String.validateUsername(): ValidationResult {
    return when {
        this.isBlank() -> ValidationResult.Invalid("Username tidak boleh kosong")
        this.length < 3 -> ValidationResult.Invalid("Username minimal 3 karakter")
        this.length > 20 -> ValidationResult.Invalid("Username maksimal 20 karakter")
        !this.matches("^[a-zA-Z0-9._]+$".toRegex()) -> 
            ValidationResult.Invalid("Username hanya boleh huruf, angka, titik, dan underscore")
        else -> ValidationResult.Valid
    }
}

// ─── Form State Helper ────────────────────────────────────────────────────────

/**
 * Helper class to manage form validation state
 */
data class FormField<T>(
    val value: T,
    val error: String? = null,
    val touched: Boolean = false
) {
    val isValid: Boolean = error == null
    val showError: Boolean = touched && error != null
}

fun <T> FormField<T>.updateValue(newValue: T): FormField<T> {
    return copy(value = newValue, touched = true)
}

fun <T> FormField<T>.updateError(newError: String?): FormField<T> {
    return copy(error = newError)
}

fun <T> FormField<T>.markTouched(): FormField<T> {
    return copy(touched = true)
}

fun <T> FormField<T>.reset(initialValue: T): FormField<T> {
    return FormField(value = initialValue, error = null, touched = false)
}
