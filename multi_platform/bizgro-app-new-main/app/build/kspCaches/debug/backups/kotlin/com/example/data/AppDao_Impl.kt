package com.example.`data`

import androidx.room.EntityInsertAdapter
import androidx.room.RoomDatabase
import androidx.room.coroutines.createFlow
import androidx.room.util.getColumnIndexOrThrow
import androidx.room.util.performSuspending
import androidx.sqlite.SQLiteStatement
import javax.`annotation`.processing.Generated
import kotlin.Boolean
import kotlin.Double
import kotlin.Int
import kotlin.Long
import kotlin.String
import kotlin.Suppress
import kotlin.Unit
import kotlin.collections.List
import kotlin.collections.MutableList
import kotlin.collections.mutableListOf
import kotlin.reflect.KClass
import kotlinx.coroutines.flow.Flow

@Generated(value = ["androidx.room.RoomProcessor"])
@Suppress(names = ["UNCHECKED_CAST", "DEPRECATION", "REDUNDANT_PROJECTION", "REMOVAL"])
public class AppDao_Impl(
  __db: RoomDatabase,
) : AppDao {
  private val __db: RoomDatabase

  private val __insertAdapterOfUnitBisnis: EntityInsertAdapter<UnitBisnis>

  private val __insertAdapterOfProduct: EntityInsertAdapter<Product>

  private val __insertAdapterOfProductVariant: EntityInsertAdapter<ProductVariant>

  private val __insertAdapterOfEmployee: EntityInsertAdapter<Employee>

  private val __insertAdapterOfTransaction: EntityInsertAdapter<Transaction>

  private val __insertAdapterOfStockLog: EntityInsertAdapter<StockLog>

  private val __insertAdapterOfPosCustomer: EntityInsertAdapter<PosCustomer>

  private val __insertAdapterOfPosOrder: EntityInsertAdapter<PosOrder>

  private val __insertAdapterOfPosOrderItem: EntityInsertAdapter<PosOrderItem>

  private val __insertAdapterOfAttendance: EntityInsertAdapter<Attendance>

  private val __insertAdapterOfPayroll: EntityInsertAdapter<Payroll>

  private val __insertAdapterOfCrmDeal: EntityInsertAdapter<CrmDeal>

  private val __insertAdapterOfRiwayatAksi: EntityInsertAdapter<RiwayatAksi>
  init {
    this.__db = __db
    this.__insertAdapterOfUnitBisnis = object : EntityInsertAdapter<UnitBisnis>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `unit_bisnis` (`id`,`namaUnit`,`slug`,`alamat`,`modalAwal`,`kategori`,`isPortalActive`) VALUES (nullif(?, 0),?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: UnitBisnis) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindText(2, entity.namaUnit)
        statement.bindText(3, entity.slug)
        statement.bindText(4, entity.alamat)
        statement.bindDouble(5, entity.modalAwal)
        statement.bindText(6, entity.kategori)
        val _tmp: Int = if (entity.isPortalActive) 1 else 0
        statement.bindLong(7, _tmp.toLong())
      }
    }
    this.__insertAdapterOfProduct = object : EntityInsertAdapter<Product>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `products` (`id`,`sku`,`nama`,`hargaBeli`,`hargaJual`,`stok`,`kategori`,`unitId`) VALUES (?,?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: Product) {
        statement.bindText(1, entity.id)
        statement.bindText(2, entity.sku)
        statement.bindText(3, entity.nama)
        statement.bindDouble(4, entity.hargaBeli)
        statement.bindDouble(5, entity.hargaJual)
        statement.bindLong(6, entity.stok.toLong())
        statement.bindText(7, entity.kategori)
        statement.bindLong(8, entity.unitId.toLong())
      }
    }
    this.__insertAdapterOfProductVariant = object : EntityInsertAdapter<ProductVariant>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `product_variants` (`id`,`productId`,`namaVariasi`,`sku`,`hargaBeli`,`hargaJual`,`stok`) VALUES (?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: ProductVariant) {
        statement.bindText(1, entity.id)
        statement.bindText(2, entity.productId)
        statement.bindText(3, entity.namaVariasi)
        statement.bindText(4, entity.sku)
        statement.bindDouble(5, entity.hargaBeli)
        statement.bindDouble(6, entity.hargaJual)
        statement.bindLong(7, entity.stok.toLong())
      }
    }
    this.__insertAdapterOfEmployee = object : EntityInsertAdapter<Employee>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `employees` (`id`,`fullName`,`position`,`salary`,`pin`,`role`,`unitId`) VALUES (nullif(?, 0),?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: Employee) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindText(2, entity.fullName)
        statement.bindText(3, entity.position)
        statement.bindDouble(4, entity.salary)
        statement.bindText(5, entity.pin)
        statement.bindText(6, entity.role)
        statement.bindLong(7, entity.unitId.toLong())
      }
    }
    this.__insertAdapterOfTransaction = object : EntityInsertAdapter<Transaction>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `transactions` (`id`,`unitId`,`kategoriTrx`,`nominal`,`tanggal`,`keterangan`) VALUES (nullif(?, 0),?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: Transaction) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindLong(2, entity.unitId.toLong())
        statement.bindText(3, entity.kategoriTrx)
        statement.bindDouble(4, entity.nominal)
        statement.bindLong(5, entity.tanggal)
        statement.bindText(6, entity.keterangan)
      }
    }
    this.__insertAdapterOfStockLog = object : EntityInsertAdapter<StockLog>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `stock_logs` (`id`,`productId`,`productName`,`unitId`,`stokAwal`,`perubahan`,`stokAkhir`,`alasan`,`tanggal`) VALUES (?,?,?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: StockLog) {
        statement.bindText(1, entity.id)
        statement.bindText(2, entity.productId)
        statement.bindText(3, entity.productName)
        statement.bindLong(4, entity.unitId.toLong())
        statement.bindLong(5, entity.stokAwal.toLong())
        statement.bindLong(6, entity.perubahan.toLong())
        statement.bindLong(7, entity.stokAkhir.toLong())
        statement.bindText(8, entity.alasan)
        statement.bindLong(9, entity.tanggal)
      }
    }
    this.__insertAdapterOfPosCustomer = object : EntityInsertAdapter<PosCustomer>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `pos_customers` (`id`,`unitId`,`namaCustomer`,`email`,`telepon`) VALUES (nullif(?, 0),?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: PosCustomer) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindLong(2, entity.unitId.toLong())
        statement.bindText(3, entity.namaCustomer)
        statement.bindText(4, entity.email)
        statement.bindText(5, entity.telepon)
      }
    }
    this.__insertAdapterOfPosOrder = object : EntityInsertAdapter<PosOrder>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `pos_orders` (`id`,`orderNumber`,`unitId`,`customerId`,`subtotal`,`total`,`paymentMethod`,`status`,`tanggal`) VALUES (?,?,?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: PosOrder) {
        statement.bindText(1, entity.id)
        statement.bindText(2, entity.orderNumber)
        statement.bindLong(3, entity.unitId.toLong())
        val _tmpCustomerId: Int? = entity.customerId
        if (_tmpCustomerId == null) {
          statement.bindNull(4)
        } else {
          statement.bindLong(4, _tmpCustomerId.toLong())
        }
        statement.bindDouble(5, entity.subtotal)
        statement.bindDouble(6, entity.total)
        statement.bindText(7, entity.paymentMethod)
        statement.bindText(8, entity.status)
        statement.bindLong(9, entity.tanggal)
      }
    }
    this.__insertAdapterOfPosOrderItem = object : EntityInsertAdapter<PosOrderItem>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `pos_order_items` (`id`,`orderId`,`productId`,`productName`,`qty`,`price`) VALUES (?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: PosOrderItem) {
        statement.bindText(1, entity.id)
        statement.bindText(2, entity.orderId)
        statement.bindText(3, entity.productId)
        statement.bindText(4, entity.productName)
        statement.bindLong(5, entity.qty.toLong())
        statement.bindDouble(6, entity.price)
      }
    }
    this.__insertAdapterOfAttendance = object : EntityInsertAdapter<Attendance>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `attendance` (`id`,`employeeId`,`date`,`checkIn`,`checkOut`,`status`) VALUES (nullif(?, 0),?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: Attendance) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindLong(2, entity.employeeId.toLong())
        statement.bindText(3, entity.date)
        statement.bindText(4, entity.checkIn)
        val _tmpCheckOut: String? = entity.checkOut
        if (_tmpCheckOut == null) {
          statement.bindNull(5)
        } else {
          statement.bindText(5, _tmpCheckOut)
        }
        statement.bindText(6, entity.status)
      }
    }
    this.__insertAdapterOfPayroll = object : EntityInsertAdapter<Payroll>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `payroll` (`id`,`employeeId`,`monthYear`,`salary`,`allowance`,`deduction`,`netSalary`,`status`) VALUES (nullif(?, 0),?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: Payroll) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindLong(2, entity.employeeId.toLong())
        statement.bindText(3, entity.monthYear)
        statement.bindDouble(4, entity.salary)
        statement.bindDouble(5, entity.allowance)
        statement.bindDouble(6, entity.deduction)
        statement.bindDouble(7, entity.netSalary)
        statement.bindText(8, entity.status)
      }
    }
    this.__insertAdapterOfCrmDeal = object : EntityInsertAdapter<CrmDeal>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `crm_deals` (`id`,`contactName`,`companyName`,`dealValue`,`stage`,`phone`,`unitId`) VALUES (nullif(?, 0),?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: CrmDeal) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindText(2, entity.contactName)
        statement.bindText(3, entity.companyName)
        statement.bindDouble(4, entity.dealValue)
        statement.bindText(5, entity.stage)
        statement.bindText(6, entity.phone)
        statement.bindLong(7, entity.unitId.toLong())
      }
    }
    this.__insertAdapterOfRiwayatAksi = object : EntityInsertAdapter<RiwayatAksi>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `riwayat_aksi` (`id`,`unitId`,`pesan`,`tipe`,`waktu`,`kategori`) VALUES (nullif(?, 0),?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: RiwayatAksi) {
        statement.bindLong(1, entity.id.toLong())
        statement.bindLong(2, entity.unitId.toLong())
        statement.bindText(3, entity.pesan)
        statement.bindText(4, entity.tipe)
        statement.bindLong(5, entity.waktu)
        statement.bindText(6, entity.kategori)
      }
    }
  }

  public override suspend fun insertUnit(unit: UnitBisnis): Long = performSuspending(__db, false,
      true) { _connection ->
    val _result: Long = __insertAdapterOfUnitBisnis.insertAndReturnId(_connection, unit)
    _result
  }

  public override suspend fun insertProduct(product: Product): Unit = performSuspending(__db, false,
      true) { _connection ->
    __insertAdapterOfProduct.insert(_connection, product)
  }

  public override suspend fun insertVariant(variant: ProductVariant): Unit = performSuspending(__db,
      false, true) { _connection ->
    __insertAdapterOfProductVariant.insert(_connection, variant)
  }

  public override suspend fun insertEmployee(employee: Employee): Unit = performSuspending(__db,
      false, true) { _connection ->
    __insertAdapterOfEmployee.insert(_connection, employee)
  }

  public override suspend fun insertTransaction(transaction: Transaction): Unit =
      performSuspending(__db, false, true) { _connection ->
    __insertAdapterOfTransaction.insert(_connection, transaction)
  }

  public override suspend fun insertStockLog(log: StockLog): Unit = performSuspending(__db, false,
      true) { _connection ->
    __insertAdapterOfStockLog.insert(_connection, log)
  }

  public override suspend fun insertCustomer(customer: PosCustomer): Unit = performSuspending(__db,
      false, true) { _connection ->
    __insertAdapterOfPosCustomer.insert(_connection, customer)
  }

  public override suspend fun insertOrder(order: PosOrder): Unit = performSuspending(__db, false,
      true) { _connection ->
    __insertAdapterOfPosOrder.insert(_connection, order)
  }

  public override suspend fun insertOrderItem(item: PosOrderItem): Unit = performSuspending(__db,
      false, true) { _connection ->
    __insertAdapterOfPosOrderItem.insert(_connection, item)
  }

  public override suspend fun insertAttendance(attendance: Attendance): Unit =
      performSuspending(__db, false, true) { _connection ->
    __insertAdapterOfAttendance.insert(_connection, attendance)
  }

  public override suspend fun insertPayroll(payroll: Payroll): Unit = performSuspending(__db, false,
      true) { _connection ->
    __insertAdapterOfPayroll.insert(_connection, payroll)
  }

  public override suspend fun insertDeal(deal: CrmDeal): Unit = performSuspending(__db, false, true)
      { _connection ->
    __insertAdapterOfCrmDeal.insert(_connection, deal)
  }

  public override suspend fun insertRiwayatAksi(aksi: RiwayatAksi): Unit = performSuspending(__db,
      false, true) { _connection ->
    __insertAdapterOfRiwayatAksi.insert(_connection, aksi)
  }

  public override fun getAllUnits(): Flow<List<UnitBisnis>> {
    val _sql: String = "SELECT * FROM unit_bisnis ORDER BY id DESC"
    return createFlow(__db, false, arrayOf("unit_bisnis")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfNamaUnit: Int = getColumnIndexOrThrow(_stmt, "namaUnit")
        val _columnIndexOfSlug: Int = getColumnIndexOrThrow(_stmt, "slug")
        val _columnIndexOfAlamat: Int = getColumnIndexOrThrow(_stmt, "alamat")
        val _columnIndexOfModalAwal: Int = getColumnIndexOrThrow(_stmt, "modalAwal")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _columnIndexOfIsPortalActive: Int = getColumnIndexOrThrow(_stmt, "isPortalActive")
        val _result: MutableList<UnitBisnis> = mutableListOf()
        while (_stmt.step()) {
          val _item: UnitBisnis
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpNamaUnit: String
          _tmpNamaUnit = _stmt.getText(_columnIndexOfNamaUnit)
          val _tmpSlug: String
          _tmpSlug = _stmt.getText(_columnIndexOfSlug)
          val _tmpAlamat: String
          _tmpAlamat = _stmt.getText(_columnIndexOfAlamat)
          val _tmpModalAwal: Double
          _tmpModalAwal = _stmt.getDouble(_columnIndexOfModalAwal)
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          val _tmpIsPortalActive: Boolean
          val _tmp: Int
          _tmp = _stmt.getLong(_columnIndexOfIsPortalActive).toInt()
          _tmpIsPortalActive = _tmp != 0
          _item =
              UnitBisnis(_tmpId,_tmpNamaUnit,_tmpSlug,_tmpAlamat,_tmpModalAwal,_tmpKategori,_tmpIsPortalActive)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getUnitById(id: Int): UnitBisnis? {
    val _sql: String = "SELECT * FROM unit_bisnis WHERE id = ? LIMIT 1"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfNamaUnit: Int = getColumnIndexOrThrow(_stmt, "namaUnit")
        val _columnIndexOfSlug: Int = getColumnIndexOrThrow(_stmt, "slug")
        val _columnIndexOfAlamat: Int = getColumnIndexOrThrow(_stmt, "alamat")
        val _columnIndexOfModalAwal: Int = getColumnIndexOrThrow(_stmt, "modalAwal")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _columnIndexOfIsPortalActive: Int = getColumnIndexOrThrow(_stmt, "isPortalActive")
        val _result: UnitBisnis?
        if (_stmt.step()) {
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpNamaUnit: String
          _tmpNamaUnit = _stmt.getText(_columnIndexOfNamaUnit)
          val _tmpSlug: String
          _tmpSlug = _stmt.getText(_columnIndexOfSlug)
          val _tmpAlamat: String
          _tmpAlamat = _stmt.getText(_columnIndexOfAlamat)
          val _tmpModalAwal: Double
          _tmpModalAwal = _stmt.getDouble(_columnIndexOfModalAwal)
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          val _tmpIsPortalActive: Boolean
          val _tmp: Int
          _tmp = _stmt.getLong(_columnIndexOfIsPortalActive).toInt()
          _tmpIsPortalActive = _tmp != 0
          _result =
              UnitBisnis(_tmpId,_tmpNamaUnit,_tmpSlug,_tmpAlamat,_tmpModalAwal,_tmpKategori,_tmpIsPortalActive)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getProductsByUnit(unitId: Int): Flow<List<Product>> {
    val _sql: String = "SELECT * FROM products WHERE unitId = ? ORDER BY nama ASC"
    return createFlow(__db, false, arrayOf("products")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfSku: Int = getColumnIndexOrThrow(_stmt, "sku")
        val _columnIndexOfNama: Int = getColumnIndexOrThrow(_stmt, "nama")
        val _columnIndexOfHargaBeli: Int = getColumnIndexOrThrow(_stmt, "hargaBeli")
        val _columnIndexOfHargaJual: Int = getColumnIndexOrThrow(_stmt, "hargaJual")
        val _columnIndexOfStok: Int = getColumnIndexOrThrow(_stmt, "stok")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: MutableList<Product> = mutableListOf()
        while (_stmt.step()) {
          val _item: Product
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpSku: String
          _tmpSku = _stmt.getText(_columnIndexOfSku)
          val _tmpNama: String
          _tmpNama = _stmt.getText(_columnIndexOfNama)
          val _tmpHargaBeli: Double
          _tmpHargaBeli = _stmt.getDouble(_columnIndexOfHargaBeli)
          val _tmpHargaJual: Double
          _tmpHargaJual = _stmt.getDouble(_columnIndexOfHargaJual)
          val _tmpStok: Int
          _tmpStok = _stmt.getLong(_columnIndexOfStok).toInt()
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _item =
              Product(_tmpId,_tmpSku,_tmpNama,_tmpHargaBeli,_tmpHargaJual,_tmpStok,_tmpKategori,_tmpUnitId)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getProductsByUnitSync(unitId: Int): List<Product> {
    val _sql: String = "SELECT * FROM products WHERE unitId = ? ORDER BY nama ASC"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfSku: Int = getColumnIndexOrThrow(_stmt, "sku")
        val _columnIndexOfNama: Int = getColumnIndexOrThrow(_stmt, "nama")
        val _columnIndexOfHargaBeli: Int = getColumnIndexOrThrow(_stmt, "hargaBeli")
        val _columnIndexOfHargaJual: Int = getColumnIndexOrThrow(_stmt, "hargaJual")
        val _columnIndexOfStok: Int = getColumnIndexOrThrow(_stmt, "stok")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: MutableList<Product> = mutableListOf()
        while (_stmt.step()) {
          val _item: Product
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpSku: String
          _tmpSku = _stmt.getText(_columnIndexOfSku)
          val _tmpNama: String
          _tmpNama = _stmt.getText(_columnIndexOfNama)
          val _tmpHargaBeli: Double
          _tmpHargaBeli = _stmt.getDouble(_columnIndexOfHargaBeli)
          val _tmpHargaJual: Double
          _tmpHargaJual = _stmt.getDouble(_columnIndexOfHargaJual)
          val _tmpStok: Int
          _tmpStok = _stmt.getLong(_columnIndexOfStok).toInt()
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _item =
              Product(_tmpId,_tmpSku,_tmpNama,_tmpHargaBeli,_tmpHargaJual,_tmpStok,_tmpKategori,_tmpUnitId)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getProductById(productId: String): Product? {
    val _sql: String = "SELECT * FROM products WHERE id = ? LIMIT 1"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, productId)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfSku: Int = getColumnIndexOrThrow(_stmt, "sku")
        val _columnIndexOfNama: Int = getColumnIndexOrThrow(_stmt, "nama")
        val _columnIndexOfHargaBeli: Int = getColumnIndexOrThrow(_stmt, "hargaBeli")
        val _columnIndexOfHargaJual: Int = getColumnIndexOrThrow(_stmt, "hargaJual")
        val _columnIndexOfStok: Int = getColumnIndexOrThrow(_stmt, "stok")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: Product?
        if (_stmt.step()) {
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpSku: String
          _tmpSku = _stmt.getText(_columnIndexOfSku)
          val _tmpNama: String
          _tmpNama = _stmt.getText(_columnIndexOfNama)
          val _tmpHargaBeli: Double
          _tmpHargaBeli = _stmt.getDouble(_columnIndexOfHargaBeli)
          val _tmpHargaJual: Double
          _tmpHargaJual = _stmt.getDouble(_columnIndexOfHargaJual)
          val _tmpStok: Int
          _tmpStok = _stmt.getLong(_columnIndexOfStok).toInt()
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _result =
              Product(_tmpId,_tmpSku,_tmpNama,_tmpHargaBeli,_tmpHargaJual,_tmpStok,_tmpKategori,_tmpUnitId)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getVariantsByProduct(productId: String): Flow<List<ProductVariant>> {
    val _sql: String = "SELECT * FROM product_variants WHERE productId = ?"
    return createFlow(__db, false, arrayOf("product_variants")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, productId)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfProductId: Int = getColumnIndexOrThrow(_stmt, "productId")
        val _columnIndexOfNamaVariasi: Int = getColumnIndexOrThrow(_stmt, "namaVariasi")
        val _columnIndexOfSku: Int = getColumnIndexOrThrow(_stmt, "sku")
        val _columnIndexOfHargaBeli: Int = getColumnIndexOrThrow(_stmt, "hargaBeli")
        val _columnIndexOfHargaJual: Int = getColumnIndexOrThrow(_stmt, "hargaJual")
        val _columnIndexOfStok: Int = getColumnIndexOrThrow(_stmt, "stok")
        val _result: MutableList<ProductVariant> = mutableListOf()
        while (_stmt.step()) {
          val _item: ProductVariant
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpProductId: String
          _tmpProductId = _stmt.getText(_columnIndexOfProductId)
          val _tmpNamaVariasi: String
          _tmpNamaVariasi = _stmt.getText(_columnIndexOfNamaVariasi)
          val _tmpSku: String
          _tmpSku = _stmt.getText(_columnIndexOfSku)
          val _tmpHargaBeli: Double
          _tmpHargaBeli = _stmt.getDouble(_columnIndexOfHargaBeli)
          val _tmpHargaJual: Double
          _tmpHargaJual = _stmt.getDouble(_columnIndexOfHargaJual)
          val _tmpStok: Int
          _tmpStok = _stmt.getLong(_columnIndexOfStok).toInt()
          _item =
              ProductVariant(_tmpId,_tmpProductId,_tmpNamaVariasi,_tmpSku,_tmpHargaBeli,_tmpHargaJual,_tmpStok)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getEmployeesByUnit(unitId: Int): Flow<List<Employee>> {
    val _sql: String = "SELECT * FROM employees WHERE unitId = ? ORDER BY fullName ASC"
    return createFlow(__db, false, arrayOf("employees")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfFullName: Int = getColumnIndexOrThrow(_stmt, "fullName")
        val _columnIndexOfPosition: Int = getColumnIndexOrThrow(_stmt, "position")
        val _columnIndexOfSalary: Int = getColumnIndexOrThrow(_stmt, "salary")
        val _columnIndexOfPin: Int = getColumnIndexOrThrow(_stmt, "pin")
        val _columnIndexOfRole: Int = getColumnIndexOrThrow(_stmt, "role")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: MutableList<Employee> = mutableListOf()
        while (_stmt.step()) {
          val _item: Employee
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpFullName: String
          _tmpFullName = _stmt.getText(_columnIndexOfFullName)
          val _tmpPosition: String
          _tmpPosition = _stmt.getText(_columnIndexOfPosition)
          val _tmpSalary: Double
          _tmpSalary = _stmt.getDouble(_columnIndexOfSalary)
          val _tmpPin: String
          _tmpPin = _stmt.getText(_columnIndexOfPin)
          val _tmpRole: String
          _tmpRole = _stmt.getText(_columnIndexOfRole)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _item = Employee(_tmpId,_tmpFullName,_tmpPosition,_tmpSalary,_tmpPin,_tmpRole,_tmpUnitId)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getEmployeesByUnitSync(unitId: Int): List<Employee> {
    val _sql: String = "SELECT * FROM employees WHERE unitId = ? ORDER BY fullName ASC"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfFullName: Int = getColumnIndexOrThrow(_stmt, "fullName")
        val _columnIndexOfPosition: Int = getColumnIndexOrThrow(_stmt, "position")
        val _columnIndexOfSalary: Int = getColumnIndexOrThrow(_stmt, "salary")
        val _columnIndexOfPin: Int = getColumnIndexOrThrow(_stmt, "pin")
        val _columnIndexOfRole: Int = getColumnIndexOrThrow(_stmt, "role")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: MutableList<Employee> = mutableListOf()
        while (_stmt.step()) {
          val _item: Employee
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpFullName: String
          _tmpFullName = _stmt.getText(_columnIndexOfFullName)
          val _tmpPosition: String
          _tmpPosition = _stmt.getText(_columnIndexOfPosition)
          val _tmpSalary: Double
          _tmpSalary = _stmt.getDouble(_columnIndexOfSalary)
          val _tmpPin: String
          _tmpPin = _stmt.getText(_columnIndexOfPin)
          val _tmpRole: String
          _tmpRole = _stmt.getText(_columnIndexOfRole)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _item = Employee(_tmpId,_tmpFullName,_tmpPosition,_tmpSalary,_tmpPin,_tmpRole,_tmpUnitId)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getEmployeeByPin(unitId: Int, pin: String): Employee? {
    val _sql: String = "SELECT * FROM employees WHERE unitId = ? AND pin = ? LIMIT 1"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _argIndex = 2
        _stmt.bindText(_argIndex, pin)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfFullName: Int = getColumnIndexOrThrow(_stmt, "fullName")
        val _columnIndexOfPosition: Int = getColumnIndexOrThrow(_stmt, "position")
        val _columnIndexOfSalary: Int = getColumnIndexOrThrow(_stmt, "salary")
        val _columnIndexOfPin: Int = getColumnIndexOrThrow(_stmt, "pin")
        val _columnIndexOfRole: Int = getColumnIndexOrThrow(_stmt, "role")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: Employee?
        if (_stmt.step()) {
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpFullName: String
          _tmpFullName = _stmt.getText(_columnIndexOfFullName)
          val _tmpPosition: String
          _tmpPosition = _stmt.getText(_columnIndexOfPosition)
          val _tmpSalary: Double
          _tmpSalary = _stmt.getDouble(_columnIndexOfSalary)
          val _tmpPin: String
          _tmpPin = _stmt.getText(_columnIndexOfPin)
          val _tmpRole: String
          _tmpRole = _stmt.getText(_columnIndexOfRole)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _result =
              Employee(_tmpId,_tmpFullName,_tmpPosition,_tmpSalary,_tmpPin,_tmpRole,_tmpUnitId)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getTransactionsByUnit(unitId: Int): Flow<List<Transaction>> {
    val _sql: String = "SELECT * FROM transactions WHERE unitId = ? ORDER BY tanggal DESC"
    return createFlow(__db, false, arrayOf("transactions")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfKategoriTrx: Int = getColumnIndexOrThrow(_stmt, "kategoriTrx")
        val _columnIndexOfNominal: Int = getColumnIndexOrThrow(_stmt, "nominal")
        val _columnIndexOfTanggal: Int = getColumnIndexOrThrow(_stmt, "tanggal")
        val _columnIndexOfKeterangan: Int = getColumnIndexOrThrow(_stmt, "keterangan")
        val _result: MutableList<Transaction> = mutableListOf()
        while (_stmt.step()) {
          val _item: Transaction
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpKategoriTrx: String
          _tmpKategoriTrx = _stmt.getText(_columnIndexOfKategoriTrx)
          val _tmpNominal: Double
          _tmpNominal = _stmt.getDouble(_columnIndexOfNominal)
          val _tmpTanggal: Long
          _tmpTanggal = _stmt.getLong(_columnIndexOfTanggal)
          val _tmpKeterangan: String
          _tmpKeterangan = _stmt.getText(_columnIndexOfKeterangan)
          _item =
              Transaction(_tmpId,_tmpUnitId,_tmpKategoriTrx,_tmpNominal,_tmpTanggal,_tmpKeterangan)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getTransactionsByUnitSync(unitId: Int): List<Transaction> {
    val _sql: String = "SELECT * FROM transactions WHERE unitId = ? ORDER BY tanggal DESC"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfKategoriTrx: Int = getColumnIndexOrThrow(_stmt, "kategoriTrx")
        val _columnIndexOfNominal: Int = getColumnIndexOrThrow(_stmt, "nominal")
        val _columnIndexOfTanggal: Int = getColumnIndexOrThrow(_stmt, "tanggal")
        val _columnIndexOfKeterangan: Int = getColumnIndexOrThrow(_stmt, "keterangan")
        val _result: MutableList<Transaction> = mutableListOf()
        while (_stmt.step()) {
          val _item: Transaction
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpKategoriTrx: String
          _tmpKategoriTrx = _stmt.getText(_columnIndexOfKategoriTrx)
          val _tmpNominal: Double
          _tmpNominal = _stmt.getDouble(_columnIndexOfNominal)
          val _tmpTanggal: Long
          _tmpTanggal = _stmt.getLong(_columnIndexOfTanggal)
          val _tmpKeterangan: String
          _tmpKeterangan = _stmt.getText(_columnIndexOfKeterangan)
          _item =
              Transaction(_tmpId,_tmpUnitId,_tmpKategoriTrx,_tmpNominal,_tmpTanggal,_tmpKeterangan)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getStockLogsByUnit(unitId: Int): Flow<List<StockLog>> {
    val _sql: String = "SELECT * FROM stock_logs WHERE unitId = ? ORDER BY tanggal DESC"
    return createFlow(__db, false, arrayOf("stock_logs")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfProductId: Int = getColumnIndexOrThrow(_stmt, "productId")
        val _columnIndexOfProductName: Int = getColumnIndexOrThrow(_stmt, "productName")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfStokAwal: Int = getColumnIndexOrThrow(_stmt, "stokAwal")
        val _columnIndexOfPerubahan: Int = getColumnIndexOrThrow(_stmt, "perubahan")
        val _columnIndexOfStokAkhir: Int = getColumnIndexOrThrow(_stmt, "stokAkhir")
        val _columnIndexOfAlasan: Int = getColumnIndexOrThrow(_stmt, "alasan")
        val _columnIndexOfTanggal: Int = getColumnIndexOrThrow(_stmt, "tanggal")
        val _result: MutableList<StockLog> = mutableListOf()
        while (_stmt.step()) {
          val _item: StockLog
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpProductId: String
          _tmpProductId = _stmt.getText(_columnIndexOfProductId)
          val _tmpProductName: String
          _tmpProductName = _stmt.getText(_columnIndexOfProductName)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpStokAwal: Int
          _tmpStokAwal = _stmt.getLong(_columnIndexOfStokAwal).toInt()
          val _tmpPerubahan: Int
          _tmpPerubahan = _stmt.getLong(_columnIndexOfPerubahan).toInt()
          val _tmpStokAkhir: Int
          _tmpStokAkhir = _stmt.getLong(_columnIndexOfStokAkhir).toInt()
          val _tmpAlasan: String
          _tmpAlasan = _stmt.getText(_columnIndexOfAlasan)
          val _tmpTanggal: Long
          _tmpTanggal = _stmt.getLong(_columnIndexOfTanggal)
          _item =
              StockLog(_tmpId,_tmpProductId,_tmpProductName,_tmpUnitId,_tmpStokAwal,_tmpPerubahan,_tmpStokAkhir,_tmpAlasan,_tmpTanggal)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getCustomersByUnit(unitId: Int): Flow<List<PosCustomer>> {
    val _sql: String = "SELECT * FROM pos_customers WHERE unitId = ? ORDER BY namaCustomer ASC"
    return createFlow(__db, false, arrayOf("pos_customers")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfNamaCustomer: Int = getColumnIndexOrThrow(_stmt, "namaCustomer")
        val _columnIndexOfEmail: Int = getColumnIndexOrThrow(_stmt, "email")
        val _columnIndexOfTelepon: Int = getColumnIndexOrThrow(_stmt, "telepon")
        val _result: MutableList<PosCustomer> = mutableListOf()
        while (_stmt.step()) {
          val _item: PosCustomer
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpNamaCustomer: String
          _tmpNamaCustomer = _stmt.getText(_columnIndexOfNamaCustomer)
          val _tmpEmail: String
          _tmpEmail = _stmt.getText(_columnIndexOfEmail)
          val _tmpTelepon: String
          _tmpTelepon = _stmt.getText(_columnIndexOfTelepon)
          _item = PosCustomer(_tmpId,_tmpUnitId,_tmpNamaCustomer,_tmpEmail,_tmpTelepon)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getOrdersByUnit(unitId: Int): Flow<List<PosOrder>> {
    val _sql: String = "SELECT * FROM pos_orders WHERE unitId = ? ORDER BY tanggal DESC"
    return createFlow(__db, false, arrayOf("pos_orders")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfOrderNumber: Int = getColumnIndexOrThrow(_stmt, "orderNumber")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfCustomerId: Int = getColumnIndexOrThrow(_stmt, "customerId")
        val _columnIndexOfSubtotal: Int = getColumnIndexOrThrow(_stmt, "subtotal")
        val _columnIndexOfTotal: Int = getColumnIndexOrThrow(_stmt, "total")
        val _columnIndexOfPaymentMethod: Int = getColumnIndexOrThrow(_stmt, "paymentMethod")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _columnIndexOfTanggal: Int = getColumnIndexOrThrow(_stmt, "tanggal")
        val _result: MutableList<PosOrder> = mutableListOf()
        while (_stmt.step()) {
          val _item: PosOrder
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpOrderNumber: String
          _tmpOrderNumber = _stmt.getText(_columnIndexOfOrderNumber)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpCustomerId: Int?
          if (_stmt.isNull(_columnIndexOfCustomerId)) {
            _tmpCustomerId = null
          } else {
            _tmpCustomerId = _stmt.getLong(_columnIndexOfCustomerId).toInt()
          }
          val _tmpSubtotal: Double
          _tmpSubtotal = _stmt.getDouble(_columnIndexOfSubtotal)
          val _tmpTotal: Double
          _tmpTotal = _stmt.getDouble(_columnIndexOfTotal)
          val _tmpPaymentMethod: String
          _tmpPaymentMethod = _stmt.getText(_columnIndexOfPaymentMethod)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          val _tmpTanggal: Long
          _tmpTanggal = _stmt.getLong(_columnIndexOfTanggal)
          _item =
              PosOrder(_tmpId,_tmpOrderNumber,_tmpUnitId,_tmpCustomerId,_tmpSubtotal,_tmpTotal,_tmpPaymentMethod,_tmpStatus,_tmpTanggal)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getOrderItems(orderId: String): Flow<List<PosOrderItem>> {
    val _sql: String = "SELECT * FROM pos_order_items WHERE orderId = ?"
    return createFlow(__db, false, arrayOf("pos_order_items")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, orderId)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfOrderId: Int = getColumnIndexOrThrow(_stmt, "orderId")
        val _columnIndexOfProductId: Int = getColumnIndexOrThrow(_stmt, "productId")
        val _columnIndexOfProductName: Int = getColumnIndexOrThrow(_stmt, "productName")
        val _columnIndexOfQty: Int = getColumnIndexOrThrow(_stmt, "qty")
        val _columnIndexOfPrice: Int = getColumnIndexOrThrow(_stmt, "price")
        val _result: MutableList<PosOrderItem> = mutableListOf()
        while (_stmt.step()) {
          val _item: PosOrderItem
          val _tmpId: String
          _tmpId = _stmt.getText(_columnIndexOfId)
          val _tmpOrderId: String
          _tmpOrderId = _stmt.getText(_columnIndexOfOrderId)
          val _tmpProductId: String
          _tmpProductId = _stmt.getText(_columnIndexOfProductId)
          val _tmpProductName: String
          _tmpProductName = _stmt.getText(_columnIndexOfProductName)
          val _tmpQty: Int
          _tmpQty = _stmt.getLong(_columnIndexOfQty).toInt()
          val _tmpPrice: Double
          _tmpPrice = _stmt.getDouble(_columnIndexOfPrice)
          _item = PosOrderItem(_tmpId,_tmpOrderId,_tmpProductId,_tmpProductName,_tmpQty,_tmpPrice)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getAttendanceByUnit(unitId: Int): Flow<List<Attendance>> {
    val _sql: String =
        "SELECT * FROM attendance WHERE employeeId IN (SELECT id FROM employees WHERE unitId = ?) ORDER BY id DESC"
    return createFlow(__db, false, arrayOf("attendance", "employees")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfEmployeeId: Int = getColumnIndexOrThrow(_stmt, "employeeId")
        val _columnIndexOfDate: Int = getColumnIndexOrThrow(_stmt, "date")
        val _columnIndexOfCheckIn: Int = getColumnIndexOrThrow(_stmt, "checkIn")
        val _columnIndexOfCheckOut: Int = getColumnIndexOrThrow(_stmt, "checkOut")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _result: MutableList<Attendance> = mutableListOf()
        while (_stmt.step()) {
          val _item: Attendance
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpEmployeeId: Int
          _tmpEmployeeId = _stmt.getLong(_columnIndexOfEmployeeId).toInt()
          val _tmpDate: String
          _tmpDate = _stmt.getText(_columnIndexOfDate)
          val _tmpCheckIn: String
          _tmpCheckIn = _stmt.getText(_columnIndexOfCheckIn)
          val _tmpCheckOut: String?
          if (_stmt.isNull(_columnIndexOfCheckOut)) {
            _tmpCheckOut = null
          } else {
            _tmpCheckOut = _stmt.getText(_columnIndexOfCheckOut)
          }
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          _item = Attendance(_tmpId,_tmpEmployeeId,_tmpDate,_tmpCheckIn,_tmpCheckOut,_tmpStatus)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getAttendanceForEmployeeToday(employeeId: Int, date: String):
      Attendance? {
    val _sql: String = "SELECT * FROM attendance WHERE employeeId = ? AND date = ? LIMIT 1"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, employeeId.toLong())
        _argIndex = 2
        _stmt.bindText(_argIndex, date)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfEmployeeId: Int = getColumnIndexOrThrow(_stmt, "employeeId")
        val _columnIndexOfDate: Int = getColumnIndexOrThrow(_stmt, "date")
        val _columnIndexOfCheckIn: Int = getColumnIndexOrThrow(_stmt, "checkIn")
        val _columnIndexOfCheckOut: Int = getColumnIndexOrThrow(_stmt, "checkOut")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _result: Attendance?
        if (_stmt.step()) {
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpEmployeeId: Int
          _tmpEmployeeId = _stmt.getLong(_columnIndexOfEmployeeId).toInt()
          val _tmpDate: String
          _tmpDate = _stmt.getText(_columnIndexOfDate)
          val _tmpCheckIn: String
          _tmpCheckIn = _stmt.getText(_columnIndexOfCheckIn)
          val _tmpCheckOut: String?
          if (_stmt.isNull(_columnIndexOfCheckOut)) {
            _tmpCheckOut = null
          } else {
            _tmpCheckOut = _stmt.getText(_columnIndexOfCheckOut)
          }
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          _result = Attendance(_tmpId,_tmpEmployeeId,_tmpDate,_tmpCheckIn,_tmpCheckOut,_tmpStatus)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getPayrollByUnit(unitId: Int): Flow<List<Payroll>> {
    val _sql: String =
        "SELECT * FROM payroll WHERE employeeId IN (SELECT id FROM employees WHERE unitId = ?) ORDER BY id DESC"
    return createFlow(__db, false, arrayOf("payroll", "employees")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfEmployeeId: Int = getColumnIndexOrThrow(_stmt, "employeeId")
        val _columnIndexOfMonthYear: Int = getColumnIndexOrThrow(_stmt, "monthYear")
        val _columnIndexOfSalary: Int = getColumnIndexOrThrow(_stmt, "salary")
        val _columnIndexOfAllowance: Int = getColumnIndexOrThrow(_stmt, "allowance")
        val _columnIndexOfDeduction: Int = getColumnIndexOrThrow(_stmt, "deduction")
        val _columnIndexOfNetSalary: Int = getColumnIndexOrThrow(_stmt, "netSalary")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _result: MutableList<Payroll> = mutableListOf()
        while (_stmt.step()) {
          val _item: Payroll
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpEmployeeId: Int
          _tmpEmployeeId = _stmt.getLong(_columnIndexOfEmployeeId).toInt()
          val _tmpMonthYear: String
          _tmpMonthYear = _stmt.getText(_columnIndexOfMonthYear)
          val _tmpSalary: Double
          _tmpSalary = _stmt.getDouble(_columnIndexOfSalary)
          val _tmpAllowance: Double
          _tmpAllowance = _stmt.getDouble(_columnIndexOfAllowance)
          val _tmpDeduction: Double
          _tmpDeduction = _stmt.getDouble(_columnIndexOfDeduction)
          val _tmpNetSalary: Double
          _tmpNetSalary = _stmt.getDouble(_columnIndexOfNetSalary)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          _item =
              Payroll(_tmpId,_tmpEmployeeId,_tmpMonthYear,_tmpSalary,_tmpAllowance,_tmpDeduction,_tmpNetSalary,_tmpStatus)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getDealsByUnit(unitId: Int): Flow<List<CrmDeal>> {
    val _sql: String = "SELECT * FROM crm_deals WHERE unitId = ? ORDER BY id DESC"
    return createFlow(__db, false, arrayOf("crm_deals")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfContactName: Int = getColumnIndexOrThrow(_stmt, "contactName")
        val _columnIndexOfCompanyName: Int = getColumnIndexOrThrow(_stmt, "companyName")
        val _columnIndexOfDealValue: Int = getColumnIndexOrThrow(_stmt, "dealValue")
        val _columnIndexOfStage: Int = getColumnIndexOrThrow(_stmt, "stage")
        val _columnIndexOfPhone: Int = getColumnIndexOrThrow(_stmt, "phone")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _result: MutableList<CrmDeal> = mutableListOf()
        while (_stmt.step()) {
          val _item: CrmDeal
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpContactName: String
          _tmpContactName = _stmt.getText(_columnIndexOfContactName)
          val _tmpCompanyName: String
          _tmpCompanyName = _stmt.getText(_columnIndexOfCompanyName)
          val _tmpDealValue: Double
          _tmpDealValue = _stmt.getDouble(_columnIndexOfDealValue)
          val _tmpStage: String
          _tmpStage = _stmt.getText(_columnIndexOfStage)
          val _tmpPhone: String
          _tmpPhone = _stmt.getText(_columnIndexOfPhone)
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          _item =
              CrmDeal(_tmpId,_tmpContactName,_tmpCompanyName,_tmpDealValue,_tmpStage,_tmpPhone,_tmpUnitId)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getRiwayatAksiByUnit(unitId: Int): Flow<List<RiwayatAksi>> {
    val _sql: String = "SELECT * FROM riwayat_aksi WHERE unitId = ? ORDER BY waktu DESC LIMIT 100"
    return createFlow(__db, false, arrayOf("riwayat_aksi")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfUnitId: Int = getColumnIndexOrThrow(_stmt, "unitId")
        val _columnIndexOfPesan: Int = getColumnIndexOrThrow(_stmt, "pesan")
        val _columnIndexOfTipe: Int = getColumnIndexOrThrow(_stmt, "tipe")
        val _columnIndexOfWaktu: Int = getColumnIndexOrThrow(_stmt, "waktu")
        val _columnIndexOfKategori: Int = getColumnIndexOrThrow(_stmt, "kategori")
        val _result: MutableList<RiwayatAksi> = mutableListOf()
        while (_stmt.step()) {
          val _item: RiwayatAksi
          val _tmpId: Int
          _tmpId = _stmt.getLong(_columnIndexOfId).toInt()
          val _tmpUnitId: Int
          _tmpUnitId = _stmt.getLong(_columnIndexOfUnitId).toInt()
          val _tmpPesan: String
          _tmpPesan = _stmt.getText(_columnIndexOfPesan)
          val _tmpTipe: String
          _tmpTipe = _stmt.getText(_columnIndexOfTipe)
          val _tmpWaktu: Long
          _tmpWaktu = _stmt.getLong(_columnIndexOfWaktu)
          val _tmpKategori: String
          _tmpKategori = _stmt.getText(_columnIndexOfKategori)
          _item = RiwayatAksi(_tmpId,_tmpUnitId,_tmpPesan,_tmpTipe,_tmpWaktu,_tmpKategori)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteUnit(id: Int) {
    val _sql: String = "DELETE FROM unit_bisnis WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun updateProductStock(productId: String, newStock: Int) {
    val _sql: String = "UPDATE products SET stok = ? WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, newStock.toLong())
        _argIndex = 2
        _stmt.bindText(_argIndex, productId)
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteProduct(id: String) {
    val _sql: String = "DELETE FROM products WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, id)
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteEmployee(id: Int) {
    val _sql: String = "DELETE FROM employees WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteTransaction(id: Int) {
    val _sql: String = "DELETE FROM transactions WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun updateDealStage(dealId: Int, newStage: String) {
    val _sql: String = "UPDATE crm_deals SET stage = ? WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, newStage)
        _argIndex = 2
        _stmt.bindLong(_argIndex, dealId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteDeal(id: Int) {
    val _sql: String = "DELETE FROM crm_deals WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearUnits() {
    val _sql: String = "DELETE FROM unit_bisnis"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearProductsByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM products WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearOrphanVariants() {
    val _sql: String =
        "DELETE FROM product_variants WHERE productId NOT IN (SELECT id FROM products)"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearEmployeesByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM employees WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearTransactionsByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM transactions WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearStockLogsByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM stock_logs WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearCustomersByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM pos_customers WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearOrdersByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM pos_orders WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearOrphanOrderItems() {
    val _sql: String =
        "DELETE FROM pos_order_items WHERE orderId NOT IN (SELECT id FROM pos_orders)"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearOrphanAttendance() {
    val _sql: String = "DELETE FROM attendance WHERE employeeId NOT IN (SELECT id FROM employees)"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearOrphanPayroll() {
    val _sql: String = "DELETE FROM payroll WHERE employeeId NOT IN (SELECT id FROM employees)"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearDealsByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM crm_deals WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun clearRiwayatAksiByUnit(unitId: Int) {
    val _sql: String = "DELETE FROM riwayat_aksi WHERE unitId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, unitId.toLong())
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public companion object {
    public fun getRequiredConverters(): List<KClass<*>> = emptyList()
  }
}
