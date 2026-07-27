package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface AppDao {
    // --- UnitBisnis ---
    @Query("SELECT * FROM unit_bisnis ORDER BY id DESC")
    fun getAllUnits(): Flow<List<UnitBisnis>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnit(unit: UnitBisnis): Long

    @Query("DELETE FROM unit_bisnis WHERE id = :id")
    suspend fun deleteUnit(id: Int)

    @Query("SELECT * FROM unit_bisnis WHERE id = :id LIMIT 1")
    suspend fun getUnitById(id: Int): UnitBisnis?

    // --- Products ---
    @Query("SELECT * FROM products WHERE unitId = :unitId ORDER BY nama ASC")
    fun getProductsByUnit(unitId: Int): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE unitId = :unitId ORDER BY nama ASC")
    suspend fun getProductsByUnitSync(unitId: Int): List<Product>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product)

    @Query("UPDATE products SET stok = :newStock WHERE id = :productId")
    suspend fun updateProductStock(productId: String, newStock: Int)

    @Query("SELECT * FROM products WHERE id = :productId LIMIT 1")
    suspend fun getProductById(productId: String): Product?

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProduct(id: String)

    // --- Product Variants ---
    @Query("SELECT * FROM product_variants WHERE productId = :productId")
    fun getVariantsByProduct(productId: String): Flow<List<ProductVariant>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVariant(variant: ProductVariant)

    // --- Employees ---
    @Query("SELECT * FROM employees WHERE unitId = :unitId ORDER BY fullName ASC")
    fun getEmployeesByUnit(unitId: Int): Flow<List<Employee>>

    @Query("SELECT * FROM employees WHERE unitId = :unitId ORDER BY fullName ASC")
    suspend fun getEmployeesByUnitSync(unitId: Int): List<Employee>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployee(employee: Employee)

    @Query("DELETE FROM employees WHERE id = :id")
    suspend fun deleteEmployee(id: Int)

    @Query("SELECT * FROM employees WHERE unitId = :unitId AND pin = :pin LIMIT 1")
    suspend fun getEmployeeByPin(unitId: Int, pin: String): Employee?

    // --- Transactions ---
    @Query("SELECT * FROM transactions WHERE unitId = :unitId ORDER BY tanggal DESC")
    fun getTransactionsByUnit(unitId: Int): Flow<List<Transaction>>

    @Query("SELECT * FROM transactions WHERE unitId = :unitId ORDER BY tanggal DESC")
    suspend fun getTransactionsByUnitSync(unitId: Int): List<Transaction>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: Transaction)

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun deleteTransaction(id: Int)

    // --- Stock Logs ---
    @Query("SELECT * FROM stock_logs WHERE unitId = :unitId ORDER BY tanggal DESC")
    fun getStockLogsByUnit(unitId: Int): Flow<List<StockLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStockLog(log: StockLog)

    // --- POS Customers ---
    @Query("SELECT * FROM pos_customers WHERE unitId = :unitId ORDER BY namaCustomer ASC")
    fun getCustomersByUnit(unitId: Int): Flow<List<PosCustomer>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomer(customer: PosCustomer)

    // --- POS Orders & Order Items ---
    @Query("SELECT * FROM pos_orders WHERE unitId = :unitId ORDER BY tanggal DESC")
    fun getOrdersByUnit(unitId: Int): Flow<List<PosOrder>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: PosOrder)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrderItem(item: PosOrderItem)

    @Query("SELECT * FROM pos_order_items WHERE orderId = :orderId")
    fun getOrderItems(orderId: String): Flow<List<PosOrderItem>>

    // --- Attendance ---
    @Query("SELECT * FROM attendance WHERE employeeId IN (SELECT id FROM employees WHERE unitId = :unitId) ORDER BY id DESC")
    fun getAttendanceByUnit(unitId: Int): Flow<List<Attendance>>

    @Query("SELECT * FROM attendance WHERE employeeId = :employeeId AND date = :date LIMIT 1")
    suspend fun getAttendanceForEmployeeToday(employeeId: Int, date: String): Attendance?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAttendance(attendance: Attendance)

    // --- Payroll ---
    @Query("SELECT * FROM payroll WHERE employeeId IN (SELECT id FROM employees WHERE unitId = :unitId) ORDER BY id DESC")
    fun getPayrollByUnit(unitId: Int): Flow<List<Payroll>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayroll(payroll: Payroll)

    // --- CRM Deals ---
    @Query("SELECT * FROM crm_deals WHERE unitId = :unitId ORDER BY id DESC")
    fun getDealsByUnit(unitId: Int): Flow<List<CrmDeal>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDeal(deal: CrmDeal)

    @Query("UPDATE crm_deals SET stage = :newStage WHERE id = :dealId")
    suspend fun updateDealStage(dealId: Int, newStage: String)

    @Query("DELETE FROM crm_deals WHERE id = :id")
    suspend fun deleteDeal(id: Int)

    // --- Riwayat Aksi (Audit Trail) ---
    @Query("SELECT * FROM riwayat_aksi WHERE unitId = :unitId ORDER BY waktu DESC LIMIT 100")
    fun getRiwayatAksiByUnit(unitId: Int): Flow<List<RiwayatAksi>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRiwayatAksi(aksi: RiwayatAksi)

    // --- Sync Clear Queries ---
    @Query("DELETE FROM unit_bisnis")
    suspend fun clearUnits()

    @Query("DELETE FROM products WHERE unitId = :unitId")
    suspend fun clearProductsByUnit(unitId: Int)

    @Query("DELETE FROM product_variants WHERE productId NOT IN (SELECT id FROM products)")
    suspend fun clearOrphanVariants()

    @Query("DELETE FROM employees WHERE unitId = :unitId")
    suspend fun clearEmployeesByUnit(unitId: Int)

    @Query("DELETE FROM transactions WHERE unitId = :unitId")
    suspend fun clearTransactionsByUnit(unitId: Int)

    @Query("DELETE FROM stock_logs WHERE unitId = :unitId")
    suspend fun clearStockLogsByUnit(unitId: Int)

    @Query("DELETE FROM pos_customers WHERE unitId = :unitId")
    suspend fun clearCustomersByUnit(unitId: Int)

    @Query("DELETE FROM pos_orders WHERE unitId = :unitId")
    suspend fun clearOrdersByUnit(unitId: Int)

    @Query("DELETE FROM pos_order_items WHERE orderId NOT IN (SELECT id FROM pos_orders)")
    suspend fun clearOrphanOrderItems()

    @Query("DELETE FROM attendance WHERE employeeId NOT IN (SELECT id FROM employees)")
    suspend fun clearOrphanAttendance()

    @Query("DELETE FROM payroll WHERE employeeId NOT IN (SELECT id FROM employees)")
    suspend fun clearOrphanPayroll()

    @Query("DELETE FROM crm_deals WHERE unitId = :unitId")
    suspend fun clearDealsByUnit(unitId: Int)

    @Query("DELETE FROM riwayat_aksi WHERE unitId = :unitId")
    suspend fun clearRiwayatAksiByUnit(unitId: Int)
}
