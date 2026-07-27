package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "unit_bisnis")
data class UnitBisnis(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val namaUnit: String,
    val slug: String,
    val alamat: String,
    val modalAwal: Double,
    val kategori: String,
    val isPortalActive: Boolean = true
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey val id: String, // UUID
    val sku: String,
    val nama: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int,
    val kategori: String,
    val unitId: Int
)

@Entity(tableName = "product_variants")
data class ProductVariant(
    @PrimaryKey val id: String,
    val productId: String,
    val namaVariasi: String,
    val sku: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int
)

@Entity(tableName = "employees")
data class Employee(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String, // Plaintext or simple pin for authentication
    val role: String, // e.g. "Staff", "Manager"
    val unitId: Int
)

@Entity(tableName = "transactions")
data class Transaction(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val unitId: Int,
    val kategoriTrx: String, // "MASUK" or "KELUAR"
    val nominal: Double,
    val tanggal: Long, // unix timestamp
    val keterangan: String
)

@Entity(tableName = "stock_logs")
data class StockLog(
    @PrimaryKey val id: String,
    val productId: String,
    val productName: String,
    val unitId: Int,
    val stokAwal: Int,
    val perubahan: Int,
    val stokAkhir: Int,
    val alasan: String, // "POS", "RESTOCK", "DAMAGE"
    val tanggal: Long
)

@Entity(tableName = "pos_customers")
data class PosCustomer(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val unitId: Int,
    val namaCustomer: String,
    val email: String,
    val telepon: String
)

@Entity(tableName = "pos_orders")
data class PosOrder(
    @PrimaryKey val id: String,
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int?,
    val subtotal: Double,
    val total: Double,
    val paymentMethod: String, // "TUNAI", "QRIS", "DEBIT"
    val status: String, // "COMPLETED"
    val tanggal: Long
)

@Entity(tableName = "pos_order_items")
data class PosOrderItem(
    @PrimaryKey val id: String,
    val orderId: String,
    val productId: String,
    val productName: String,
    val qty: Int,
    val price: Double
)

@Entity(tableName = "attendance")
data class Attendance(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val employeeId: Int,
    val date: String, // YYYY-MM-DD
    val checkIn: String, // HH:MM
    val checkOut: String?, // HH:MM or null
    val status: String // "HADIR", "IZIN", "ALFA"
)

@Entity(tableName = "payroll")
data class Payroll(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val employeeId: Int,
    val monthYear: String, // e.g., "June 2026"
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val status: String // "DIBAYAR", "PENDING"
)

@Entity(tableName = "crm_deals")
data class CrmDeal(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String, // "PROSPECT", "NEGOTIATION", "WON", "LOST"
    val phone: String,
    val unitId: Int
)

@Entity(tableName = "riwayat_aksi")
data class RiwayatAksi(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val unitId: Int,
    val pesan: String,
    val tipe: String, // "INFO", "WARNING", "SUCCESS"
    val waktu: Long,
    val kategori: String // "FINANCE", "INVENTORY", "POS", "HR", "CRM"
)
