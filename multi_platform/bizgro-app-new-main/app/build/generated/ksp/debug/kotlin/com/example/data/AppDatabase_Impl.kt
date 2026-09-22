package com.example.`data`

import androidx.room.InvalidationTracker
import androidx.room.RoomOpenDelegate
import androidx.room.migration.AutoMigrationSpec
import androidx.room.migration.Migration
import androidx.room.util.TableInfo
import androidx.room.util.TableInfo.Companion.read
import androidx.room.util.dropFtsSyncTriggers
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.execSQL
import javax.`annotation`.processing.Generated
import kotlin.Lazy
import kotlin.String
import kotlin.Suppress
import kotlin.collections.List
import kotlin.collections.Map
import kotlin.collections.MutableList
import kotlin.collections.MutableMap
import kotlin.collections.MutableSet
import kotlin.collections.Set
import kotlin.collections.mutableListOf
import kotlin.collections.mutableMapOf
import kotlin.collections.mutableSetOf
import kotlin.reflect.KClass

@Generated(value = ["androidx.room.RoomProcessor"])
@Suppress(names = ["UNCHECKED_CAST", "DEPRECATION", "REDUNDANT_PROJECTION", "REMOVAL"])
public class AppDatabase_Impl : AppDatabase() {
  private val _appDao: Lazy<AppDao> = lazy {
    AppDao_Impl(this)
  }

  protected override fun createOpenDelegate(): RoomOpenDelegate {
    val _openDelegate: RoomOpenDelegate = object : RoomOpenDelegate(1,
        "320f9337705ea1b1bf86e3fe5b0df0ab", "083a07fb00a720476fb34929a87752c1") {
      public override fun createAllTables(connection: SQLiteConnection) {
        connection.execSQL("CREATE TABLE IF NOT EXISTS `unit_bisnis` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `namaUnit` TEXT NOT NULL, `slug` TEXT NOT NULL, `alamat` TEXT NOT NULL, `modalAwal` REAL NOT NULL, `kategori` TEXT NOT NULL, `isPortalActive` INTEGER NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `products` (`id` TEXT NOT NULL, `sku` TEXT NOT NULL, `nama` TEXT NOT NULL, `hargaBeli` REAL NOT NULL, `hargaJual` REAL NOT NULL, `stok` INTEGER NOT NULL, `kategori` TEXT NOT NULL, `unitId` INTEGER NOT NULL, PRIMARY KEY(`id`))")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `product_variants` (`id` TEXT NOT NULL, `productId` TEXT NOT NULL, `namaVariasi` TEXT NOT NULL, `sku` TEXT NOT NULL, `hargaBeli` REAL NOT NULL, `hargaJual` REAL NOT NULL, `stok` INTEGER NOT NULL, PRIMARY KEY(`id`))")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `employees` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `fullName` TEXT NOT NULL, `position` TEXT NOT NULL, `salary` REAL NOT NULL, `pin` TEXT NOT NULL, `role` TEXT NOT NULL, `unitId` INTEGER NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `transactions` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `unitId` INTEGER NOT NULL, `kategoriTrx` TEXT NOT NULL, `nominal` REAL NOT NULL, `tanggal` INTEGER NOT NULL, `keterangan` TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `stock_logs` (`id` TEXT NOT NULL, `productId` TEXT NOT NULL, `productName` TEXT NOT NULL, `unitId` INTEGER NOT NULL, `stokAwal` INTEGER NOT NULL, `perubahan` INTEGER NOT NULL, `stokAkhir` INTEGER NOT NULL, `alasan` TEXT NOT NULL, `tanggal` INTEGER NOT NULL, PRIMARY KEY(`id`))")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `pos_customers` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `unitId` INTEGER NOT NULL, `namaCustomer` TEXT NOT NULL, `email` TEXT NOT NULL, `telepon` TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `pos_orders` (`id` TEXT NOT NULL, `orderNumber` TEXT NOT NULL, `unitId` INTEGER NOT NULL, `customerId` INTEGER, `subtotal` REAL NOT NULL, `total` REAL NOT NULL, `paymentMethod` TEXT NOT NULL, `status` TEXT NOT NULL, `tanggal` INTEGER NOT NULL, PRIMARY KEY(`id`))")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `pos_order_items` (`id` TEXT NOT NULL, `orderId` TEXT NOT NULL, `productId` TEXT NOT NULL, `productName` TEXT NOT NULL, `qty` INTEGER NOT NULL, `price` REAL NOT NULL, PRIMARY KEY(`id`))")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `attendance` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `employeeId` INTEGER NOT NULL, `date` TEXT NOT NULL, `checkIn` TEXT NOT NULL, `checkOut` TEXT, `status` TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `payroll` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `employeeId` INTEGER NOT NULL, `monthYear` TEXT NOT NULL, `salary` REAL NOT NULL, `allowance` REAL NOT NULL, `deduction` REAL NOT NULL, `netSalary` REAL NOT NULL, `status` TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `crm_deals` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `contactName` TEXT NOT NULL, `companyName` TEXT NOT NULL, `dealValue` REAL NOT NULL, `stage` TEXT NOT NULL, `phone` TEXT NOT NULL, `unitId` INTEGER NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `riwayat_aksi` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `unitId` INTEGER NOT NULL, `pesan` TEXT NOT NULL, `tipe` TEXT NOT NULL, `waktu` INTEGER NOT NULL, `kategori` TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)")
        connection.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, '320f9337705ea1b1bf86e3fe5b0df0ab')")
      }

      public override fun dropAllTables(connection: SQLiteConnection) {
        connection.execSQL("DROP TABLE IF EXISTS `unit_bisnis`")
        connection.execSQL("DROP TABLE IF EXISTS `products`")
        connection.execSQL("DROP TABLE IF EXISTS `product_variants`")
        connection.execSQL("DROP TABLE IF EXISTS `employees`")
        connection.execSQL("DROP TABLE IF EXISTS `transactions`")
        connection.execSQL("DROP TABLE IF EXISTS `stock_logs`")
        connection.execSQL("DROP TABLE IF EXISTS `pos_customers`")
        connection.execSQL("DROP TABLE IF EXISTS `pos_orders`")
        connection.execSQL("DROP TABLE IF EXISTS `pos_order_items`")
        connection.execSQL("DROP TABLE IF EXISTS `attendance`")
        connection.execSQL("DROP TABLE IF EXISTS `payroll`")
        connection.execSQL("DROP TABLE IF EXISTS `crm_deals`")
        connection.execSQL("DROP TABLE IF EXISTS `riwayat_aksi`")
      }

      public override fun onCreate(connection: SQLiteConnection) {
      }

      public override fun onOpen(connection: SQLiteConnection) {
        internalInitInvalidationTracker(connection)
      }

      public override fun onPreMigrate(connection: SQLiteConnection) {
        dropFtsSyncTriggers(connection)
      }

      public override fun onPostMigrate(connection: SQLiteConnection) {
      }

      public override fun onValidateSchema(connection: SQLiteConnection):
          RoomOpenDelegate.ValidationResult {
        val _columnsUnitBisnis: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsUnitBisnis.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("namaUnit", TableInfo.Column("namaUnit", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("slug", TableInfo.Column("slug", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("alamat", TableInfo.Column("alamat", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("modalAwal", TableInfo.Column("modalAwal", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("kategori", TableInfo.Column("kategori", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsUnitBisnis.put("isPortalActive", TableInfo.Column("isPortalActive", "INTEGER", true,
            0, null, TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysUnitBisnis: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesUnitBisnis: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoUnitBisnis: TableInfo = TableInfo("unit_bisnis", _columnsUnitBisnis,
            _foreignKeysUnitBisnis, _indicesUnitBisnis)
        val _existingUnitBisnis: TableInfo = read(connection, "unit_bisnis")
        if (!_infoUnitBisnis.equals(_existingUnitBisnis)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |unit_bisnis(com.example.data.UnitBisnis).
              | Expected:
              |""".trimMargin() + _infoUnitBisnis + """
              |
              | Found:
              |""".trimMargin() + _existingUnitBisnis)
        }
        val _columnsProducts: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsProducts.put("id", TableInfo.Column("id", "TEXT", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("sku", TableInfo.Column("sku", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("nama", TableInfo.Column("nama", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("hargaBeli", TableInfo.Column("hargaBeli", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("hargaJual", TableInfo.Column("hargaJual", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("stok", TableInfo.Column("stok", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("kategori", TableInfo.Column("kategori", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProducts.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysProducts: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesProducts: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoProducts: TableInfo = TableInfo("products", _columnsProducts, _foreignKeysProducts,
            _indicesProducts)
        val _existingProducts: TableInfo = read(connection, "products")
        if (!_infoProducts.equals(_existingProducts)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |products(com.example.data.Product).
              | Expected:
              |""".trimMargin() + _infoProducts + """
              |
              | Found:
              |""".trimMargin() + _existingProducts)
        }
        val _columnsProductVariants: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsProductVariants.put("id", TableInfo.Column("id", "TEXT", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("productId", TableInfo.Column("productId", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("namaVariasi", TableInfo.Column("namaVariasi", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("sku", TableInfo.Column("sku", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("hargaBeli", TableInfo.Column("hargaBeli", "REAL", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("hargaJual", TableInfo.Column("hargaJual", "REAL", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsProductVariants.put("stok", TableInfo.Column("stok", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysProductVariants: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesProductVariants: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoProductVariants: TableInfo = TableInfo("product_variants", _columnsProductVariants,
            _foreignKeysProductVariants, _indicesProductVariants)
        val _existingProductVariants: TableInfo = read(connection, "product_variants")
        if (!_infoProductVariants.equals(_existingProductVariants)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |product_variants(com.example.data.ProductVariant).
              | Expected:
              |""".trimMargin() + _infoProductVariants + """
              |
              | Found:
              |""".trimMargin() + _existingProductVariants)
        }
        val _columnsEmployees: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsEmployees.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("fullName", TableInfo.Column("fullName", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("position", TableInfo.Column("position", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("salary", TableInfo.Column("salary", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("pin", TableInfo.Column("pin", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("role", TableInfo.Column("role", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsEmployees.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysEmployees: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesEmployees: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoEmployees: TableInfo = TableInfo("employees", _columnsEmployees,
            _foreignKeysEmployees, _indicesEmployees)
        val _existingEmployees: TableInfo = read(connection, "employees")
        if (!_infoEmployees.equals(_existingEmployees)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |employees(com.example.data.Employee).
              | Expected:
              |""".trimMargin() + _infoEmployees + """
              |
              | Found:
              |""".trimMargin() + _existingEmployees)
        }
        val _columnsTransactions: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsTransactions.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsTransactions.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsTransactions.put("kategoriTrx", TableInfo.Column("kategoriTrx", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsTransactions.put("nominal", TableInfo.Column("nominal", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsTransactions.put("tanggal", TableInfo.Column("tanggal", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsTransactions.put("keterangan", TableInfo.Column("keterangan", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysTransactions: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesTransactions: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoTransactions: TableInfo = TableInfo("transactions", _columnsTransactions,
            _foreignKeysTransactions, _indicesTransactions)
        val _existingTransactions: TableInfo = read(connection, "transactions")
        if (!_infoTransactions.equals(_existingTransactions)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |transactions(com.example.data.Transaction).
              | Expected:
              |""".trimMargin() + _infoTransactions + """
              |
              | Found:
              |""".trimMargin() + _existingTransactions)
        }
        val _columnsStockLogs: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsStockLogs.put("id", TableInfo.Column("id", "TEXT", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("productId", TableInfo.Column("productId", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("productName", TableInfo.Column("productName", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("stokAwal", TableInfo.Column("stokAwal", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("perubahan", TableInfo.Column("perubahan", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("stokAkhir", TableInfo.Column("stokAkhir", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("alasan", TableInfo.Column("alasan", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsStockLogs.put("tanggal", TableInfo.Column("tanggal", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysStockLogs: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesStockLogs: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoStockLogs: TableInfo = TableInfo("stock_logs", _columnsStockLogs,
            _foreignKeysStockLogs, _indicesStockLogs)
        val _existingStockLogs: TableInfo = read(connection, "stock_logs")
        if (!_infoStockLogs.equals(_existingStockLogs)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |stock_logs(com.example.data.StockLog).
              | Expected:
              |""".trimMargin() + _infoStockLogs + """
              |
              | Found:
              |""".trimMargin() + _existingStockLogs)
        }
        val _columnsPosCustomers: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsPosCustomers.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosCustomers.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosCustomers.put("namaCustomer", TableInfo.Column("namaCustomer", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsPosCustomers.put("email", TableInfo.Column("email", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosCustomers.put("telepon", TableInfo.Column("telepon", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysPosCustomers: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesPosCustomers: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoPosCustomers: TableInfo = TableInfo("pos_customers", _columnsPosCustomers,
            _foreignKeysPosCustomers, _indicesPosCustomers)
        val _existingPosCustomers: TableInfo = read(connection, "pos_customers")
        if (!_infoPosCustomers.equals(_existingPosCustomers)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |pos_customers(com.example.data.PosCustomer).
              | Expected:
              |""".trimMargin() + _infoPosCustomers + """
              |
              | Found:
              |""".trimMargin() + _existingPosCustomers)
        }
        val _columnsPosOrders: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsPosOrders.put("id", TableInfo.Column("id", "TEXT", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("orderNumber", TableInfo.Column("orderNumber", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("customerId", TableInfo.Column("customerId", "INTEGER", false, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("subtotal", TableInfo.Column("subtotal", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("total", TableInfo.Column("total", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("paymentMethod", TableInfo.Column("paymentMethod", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("status", TableInfo.Column("status", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrders.put("tanggal", TableInfo.Column("tanggal", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysPosOrders: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesPosOrders: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoPosOrders: TableInfo = TableInfo("pos_orders", _columnsPosOrders,
            _foreignKeysPosOrders, _indicesPosOrders)
        val _existingPosOrders: TableInfo = read(connection, "pos_orders")
        if (!_infoPosOrders.equals(_existingPosOrders)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |pos_orders(com.example.data.PosOrder).
              | Expected:
              |""".trimMargin() + _infoPosOrders + """
              |
              | Found:
              |""".trimMargin() + _existingPosOrders)
        }
        val _columnsPosOrderItems: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsPosOrderItems.put("id", TableInfo.Column("id", "TEXT", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrderItems.put("orderId", TableInfo.Column("orderId", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrderItems.put("productId", TableInfo.Column("productId", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrderItems.put("productName", TableInfo.Column("productName", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrderItems.put("qty", TableInfo.Column("qty", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPosOrderItems.put("price", TableInfo.Column("price", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysPosOrderItems: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesPosOrderItems: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoPosOrderItems: TableInfo = TableInfo("pos_order_items", _columnsPosOrderItems,
            _foreignKeysPosOrderItems, _indicesPosOrderItems)
        val _existingPosOrderItems: TableInfo = read(connection, "pos_order_items")
        if (!_infoPosOrderItems.equals(_existingPosOrderItems)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |pos_order_items(com.example.data.PosOrderItem).
              | Expected:
              |""".trimMargin() + _infoPosOrderItems + """
              |
              | Found:
              |""".trimMargin() + _existingPosOrderItems)
        }
        val _columnsAttendance: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsAttendance.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAttendance.put("employeeId", TableInfo.Column("employeeId", "INTEGER", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAttendance.put("date", TableInfo.Column("date", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAttendance.put("checkIn", TableInfo.Column("checkIn", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAttendance.put("checkOut", TableInfo.Column("checkOut", "TEXT", false, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAttendance.put("status", TableInfo.Column("status", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysAttendance: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesAttendance: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoAttendance: TableInfo = TableInfo("attendance", _columnsAttendance,
            _foreignKeysAttendance, _indicesAttendance)
        val _existingAttendance: TableInfo = read(connection, "attendance")
        if (!_infoAttendance.equals(_existingAttendance)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |attendance(com.example.data.Attendance).
              | Expected:
              |""".trimMargin() + _infoAttendance + """
              |
              | Found:
              |""".trimMargin() + _existingAttendance)
        }
        val _columnsPayroll: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsPayroll.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("employeeId", TableInfo.Column("employeeId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("monthYear", TableInfo.Column("monthYear", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("salary", TableInfo.Column("salary", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("allowance", TableInfo.Column("allowance", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("deduction", TableInfo.Column("deduction", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("netSalary", TableInfo.Column("netSalary", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsPayroll.put("status", TableInfo.Column("status", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysPayroll: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesPayroll: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoPayroll: TableInfo = TableInfo("payroll", _columnsPayroll, _foreignKeysPayroll,
            _indicesPayroll)
        val _existingPayroll: TableInfo = read(connection, "payroll")
        if (!_infoPayroll.equals(_existingPayroll)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |payroll(com.example.data.Payroll).
              | Expected:
              |""".trimMargin() + _infoPayroll + """
              |
              | Found:
              |""".trimMargin() + _existingPayroll)
        }
        val _columnsCrmDeals: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsCrmDeals.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("contactName", TableInfo.Column("contactName", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("companyName", TableInfo.Column("companyName", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("dealValue", TableInfo.Column("dealValue", "REAL", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("stage", TableInfo.Column("stage", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("phone", TableInfo.Column("phone", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsCrmDeals.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysCrmDeals: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesCrmDeals: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoCrmDeals: TableInfo = TableInfo("crm_deals", _columnsCrmDeals,
            _foreignKeysCrmDeals, _indicesCrmDeals)
        val _existingCrmDeals: TableInfo = read(connection, "crm_deals")
        if (!_infoCrmDeals.equals(_existingCrmDeals)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |crm_deals(com.example.data.CrmDeal).
              | Expected:
              |""".trimMargin() + _infoCrmDeals + """
              |
              | Found:
              |""".trimMargin() + _existingCrmDeals)
        }
        val _columnsRiwayatAksi: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsRiwayatAksi.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsRiwayatAksi.put("unitId", TableInfo.Column("unitId", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsRiwayatAksi.put("pesan", TableInfo.Column("pesan", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsRiwayatAksi.put("tipe", TableInfo.Column("tipe", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsRiwayatAksi.put("waktu", TableInfo.Column("waktu", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsRiwayatAksi.put("kategori", TableInfo.Column("kategori", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysRiwayatAksi: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesRiwayatAksi: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoRiwayatAksi: TableInfo = TableInfo("riwayat_aksi", _columnsRiwayatAksi,
            _foreignKeysRiwayatAksi, _indicesRiwayatAksi)
        val _existingRiwayatAksi: TableInfo = read(connection, "riwayat_aksi")
        if (!_infoRiwayatAksi.equals(_existingRiwayatAksi)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |riwayat_aksi(com.example.data.RiwayatAksi).
              | Expected:
              |""".trimMargin() + _infoRiwayatAksi + """
              |
              | Found:
              |""".trimMargin() + _existingRiwayatAksi)
        }
        return RoomOpenDelegate.ValidationResult(true, null)
      }
    }
    return _openDelegate
  }

  protected override fun createInvalidationTracker(): InvalidationTracker {
    val _shadowTablesMap: MutableMap<String, String> = mutableMapOf()
    val _viewTables: MutableMap<String, Set<String>> = mutableMapOf()
    return InvalidationTracker(this, _shadowTablesMap, _viewTables, "unit_bisnis", "products",
        "product_variants", "employees", "transactions", "stock_logs", "pos_customers",
        "pos_orders", "pos_order_items", "attendance", "payroll", "crm_deals", "riwayat_aksi")
  }

  public override fun clearAllTables() {
    super.performClear(false, "unit_bisnis", "products", "product_variants", "employees",
        "transactions", "stock_logs", "pos_customers", "pos_orders", "pos_order_items",
        "attendance", "payroll", "crm_deals", "riwayat_aksi")
  }

  protected override fun getRequiredTypeConverterClasses(): Map<KClass<*>, List<KClass<*>>> {
    val _typeConvertersMap: MutableMap<KClass<*>, List<KClass<*>>> = mutableMapOf()
    _typeConvertersMap.put(AppDao::class, AppDao_Impl.getRequiredConverters())
    return _typeConvertersMap
  }

  public override fun getRequiredAutoMigrationSpecClasses(): Set<KClass<out AutoMigrationSpec>> {
    val _autoMigrationSpecsSet: MutableSet<KClass<out AutoMigrationSpec>> = mutableSetOf()
    return _autoMigrationSpecsSet
  }

  public override
      fun createAutoMigrations(autoMigrationSpecs: Map<KClass<out AutoMigrationSpec>, AutoMigrationSpec>):
      List<Migration> {
    val _autoMigrations: MutableList<Migration> = mutableListOf()
    return _autoMigrations
  }

  public override fun appDao(): AppDao = _appDao.value
}
