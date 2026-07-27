package com.example.data

import com.example.api.*
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class AppRepository(private val appDao: AppDao) {

    private val api = NusantaraRetrofitClient.apiService

    // --- Synchronization Methods ---

    suspend fun syncUnits(): Boolean {
        return try {
            val response = api.getUnits()
            if (response.success) {
                appDao.clearUnits()
                for (u in response.data) {
                    appDao.insertUnit(
                        UnitBisnis(
                            id = u.id,
                            namaUnit = u.name,
                            slug = u.name.lowercase().replace(" ", "-"),
                            alamat = "Alamat terpusat",
                            modalAwal = 0.0,
                            kategori = u.type
                        )
                    )
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun syncProducts(unitId: Int): Boolean {
        return try {
            val response = api.getProducts(unitId)
            if (response.success) {
                appDao.clearProductsByUnit(unitId)
                for (p in response.data) {
                    appDao.insertProduct(
                        Product(
                            id = p.id,
                            sku = p.sku,
                            nama = p.nama,
                            hargaBeli = p.hargaBeli,
                            hargaJual = p.hargaJual,
                            stok = p.stok,
                            kategori = p.kategori,
                            unitId = p.unitId
                        )
                    )
                    // Insert variants
                    for (v in p.variants) {
                        appDao.insertVariant(
                            ProductVariant(
                                id = v.id,
                                productId = v.productId,
                                namaVariasi = v.namaVariasi,
                                sku = v.sku,
                                hargaBeli = v.hargaBeli,
                                hargaJual = v.hargaJual,
                                stok = v.stok
                            )
                        )
                    }
                }
                appDao.clearOrphanVariants()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun syncEmployees(unitId: Int): Boolean {
        return try {
            val response = api.getHrData(unitId)
            if (response.success) {
                appDao.clearEmployeesByUnit(unitId)
                
                // Save employees
                for (e in response.data.employees) {
                    appDao.insertEmployee(
                        Employee(
                            id = e.id,
                            fullName = e.fullName,
                            position = e.position,
                            salary = e.salary,
                            pin = e.pin,
                            role = e.role,
                            unitId = e.unitId
                        )
                    )
                }

                // Save attendance
                appDao.clearOrphanAttendance()
                for (a in response.data.attendance) {
                    appDao.insertAttendance(
                        Attendance(
                            id = a.id,
                            employeeId = a.employeeId,
                            date = a.date,
                            checkIn = a.checkIn,
                            checkOut = a.checkOut,
                            status = a.status
                        )
                    )
                }

                // Save payroll
                appDao.clearOrphanPayroll()
                for (p in response.data.payroll) {
                    appDao.insertPayroll(
                        Payroll(
                            id = p.id,
                            employeeId = p.employeeId,
                            monthYear = p.monthYear,
                            salary = p.salary,
                            allowance = p.allowance,
                            deduction = p.deduction,
                            netSalary = p.netSalary,
                            status = p.status
                        )
                    )
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun syncPosData(unitId: Int): Boolean {
        return try {
            val response = api.getPosData(unitId)
            if (response.success) {
                appDao.clearCustomersByUnit(unitId)
                appDao.clearOrdersByUnit(unitId)

                // Save customers
                for (c in response.data.customers) {
                    appDao.insertCustomer(
                        PosCustomer(
                            id = c.id,
                            unitId = c.unitId,
                            namaCustomer = c.namaCustomer,
                            email = c.email ?: "",
                            telepon = c.telepon ?: ""
                        )
                    )
                }

                // Save orders and items
                for (o in response.data.orders) {
                    appDao.insertOrder(
                        PosOrder(
                            id = o.id,
                            orderNumber = o.orderNumber,
                            unitId = o.unitId,
                            customerId = o.customerId,
                            subtotal = o.subtotal,
                            total = o.total,
                            paymentMethod = o.paymentMethod,
                            status = o.status,
                            tanggal = o.tanggal
                        )
                    )
                    for (item in o.items) {
                        appDao.insertOrderItem(
                            PosOrderItem(
                                id = item.id,
                                orderId = o.id,
                                productId = item.productId,
                                productName = item.productName,
                                qty = item.qty,
                                price = item.price
                            )
                        )
                    }
                }
                appDao.clearOrphanOrderItems()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun syncCrmDeals(unitId: Int): Boolean {
        return try {
            val response = api.getCrmData(unitId)
            if (response.success) {
                appDao.clearDealsByUnit(unitId)
                for (d in response.data) {
                    appDao.insertDeal(
                        CrmDeal(
                            id = d.id,
                            contactName = d.contactName,
                            companyName = d.companyName,
                            dealValue = d.dealValue,
                            stage = d.stage,
                            phone = d.phone,
                            unitId = d.unitId
                        )
                    )
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun syncFinanceData(unitId: Int): Boolean {
        return try {
            val response = api.getFinanceData(unitId)
            if (response.success) {
                appDao.clearTransactionsByUnit(unitId)
                appDao.clearRiwayatAksiByUnit(unitId)

                // Save transactions
                for (t in response.data.transactions) {
                    appDao.insertTransaction(
                        Transaction(
                            id = t.id,
                            unitId = t.unitId,
                            kategoriTrx = t.kategoriTrx,
                            nominal = t.nominal,
                            tanggal = t.tanggal,
                            keterangan = t.keterangan
                        )
                    )
                }

                // Save riwayat aksi
                for (l in response.data.riwayatAksi) {
                    appDao.insertRiwayatAksi(
                        RiwayatAksi(
                            id = l.id,
                            unitId = l.unitId,
                            pesan = l.pesan,
                            tipe = l.tipe,
                            waktu = l.waktu,
                            kategori = l.kategori
                        )
                    )
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // --- UnitBisnis ---
    val allUnits: Flow<List<UnitBisnis>> = appDao.getAllUnits()

    suspend fun insertUnit(unit: UnitBisnis): Long {
        return try {
            val response = api.createUnit(CreateBusinessRequest(unit.namaUnit, unit.kategori))
            if (response.success) {
                syncUnits()
                1L
            } else {
                appDao.insertUnit(unit)
            }
        } catch (e: Exception) {
            appDao.insertUnit(unit)
        }
    }

    suspend fun deleteUnit(id: Int) {
        try {
            val response = api.deleteUnit(id)
            if (response.success) {
                appDao.deleteUnit(id)
            }
        } catch (e: Exception) {
            appDao.deleteUnit(id)
        }
    }

    suspend fun getUnitById(id: Int): UnitBisnis? = appDao.getUnitById(id)

    // --- Products ---
    fun getProductsByUnit(unitId: Int): Flow<List<Product>> = appDao.getProductsByUnit(unitId)

    suspend fun getProductsByUnitSync(unitId: Int): List<Product> = appDao.getProductsByUnitSync(unitId)

    suspend fun insertProduct(product: Product) {
        try {
            val response = api.createProduct(
                ProductDto(
                    id = product.id,
                    sku = product.sku,
                    nama = product.nama,
                    hargaBeli = product.hargaBeli,
                    hargaJual = product.hargaJual,
                    stok = product.stok,
                    kategori = product.kategori,
                    unitId = product.unitId
                )
            )
            if (response.success) {
                syncProducts(product.unitId)
            } else {
                appDao.insertProduct(product)
            }
        } catch (e: Exception) {
            appDao.insertProduct(product)
        }
    }

    suspend fun deleteProduct(id: String) {
        val product = appDao.getProductById(id) ?: return
        try {
            val response = api.deleteProduct(product.unitId, id)
            if (response.success) {
                appDao.deleteProduct(id)
            }
        } catch (e: Exception) {
            appDao.deleteProduct(id)
        }
    }

    suspend fun updateProductStock(productId: String, newStock: Int) {
        appDao.updateProductStock(productId, newStock)
    }

    // --- Product Variants ---
    fun getVariantsByProduct(productId: String): Flow<List<ProductVariant>> = appDao.getVariantsByProduct(productId)

    suspend fun insertVariant(variant: ProductVariant) = appDao.insertVariant(variant)

    // --- Employees ---
    fun getEmployeesByUnit(unitId: Int): Flow<List<Employee>> = appDao.getEmployeesByUnit(unitId)

    suspend fun getEmployeesByUnitSync(unitId: Int): List<Employee> = appDao.getEmployeesByUnitSync(unitId)

    suspend fun insertEmployee(employee: Employee) {
        try {
            val response = api.processHrAction(
                AddEmployeeRequest(
                    employee = EmployeeDto(
                        id = employee.id,
                        fullName = employee.fullName,
                        position = employee.position,
                        salary = employee.salary,
                        pin = employee.pin,
                        role = employee.role,
                        unitId = employee.unitId
                    )
                )
            )
            if (response.success) {
                syncEmployees(employee.unitId)
            } else {
                appDao.insertEmployee(employee)
            }
        } catch (e: Exception) {
            appDao.insertEmployee(employee)
        }
    }

    suspend fun deleteEmployee(id: Int) {
        // Find employee to know unitId
        val list = appDao.getEmployeesByUnitSync(1) // simple search in local database
        val emp = list.find { it.id == id } ?: return
        try {
            val response = api.deleteEmployee(emp.unitId, id)
            if (response.success) {
                appDao.deleteEmployee(id)
            }
        } catch (e: Exception) {
            appDao.deleteEmployee(id)
        }
    }

    suspend fun getEmployeeByPin(unitId: Int, pin: String): Employee? = appDao.getEmployeeByPin(unitId, pin)

    // --- Transactions ---
    fun getTransactionsByUnit(unitId: Int): Flow<List<Transaction>> = appDao.getTransactionsByUnit(unitId)

    suspend fun insertTransaction(transaction: Transaction) {
        try {
            val response = api.createTransaction(
                CreateTransactionRequest(
                    TransactionDto(
                        id = transaction.id,
                        unitId = transaction.unitId,
                        kategoriTrx = transaction.kategoriTrx,
                        nominal = transaction.nominal,
                        tanggal = transaction.tanggal,
                        keterangan = transaction.keterangan
                    )
                )
            )
            if (response.success) {
                syncFinanceData(transaction.unitId)
            } else {
                appDao.insertTransaction(transaction)
            }
        } catch (e: Exception) {
            appDao.insertTransaction(transaction)
        }
    }

    suspend fun deleteTransaction(id: Int, unitId: Int) {
        try {
            val response = api.deleteTransaction(unitId, id)
            if (response.success) {
                appDao.deleteTransaction(id)
            }
        } catch (e: Exception) {
            appDao.deleteTransaction(id)
        }
    }

    // --- Stock Logs ---
    fun getStockLogsByUnit(unitId: Int): Flow<List<StockLog>> = appDao.getStockLogsByUnit(unitId)

    suspend fun insertStockLog(log: StockLog) = appDao.insertStockLog(log)

    // --- POS Customers ---
    fun getCustomersByUnit(unitId: Int): Flow<List<PosCustomer>> = appDao.getCustomersByUnit(unitId)

    suspend fun insertCustomer(customer: PosCustomer) {
        try {
            val response = api.processPosAction(
                CreateCustomerRequest(
                    customer = PosCustomerDto(
                        id = customer.id,
                        unitId = customer.unitId,
                        namaCustomer = customer.namaCustomer,
                        email = customer.email,
                        telepon = customer.telepon
                    )
                )
            )
            if (response.success) {
                syncPosData(customer.unitId)
            } else {
                appDao.insertCustomer(customer)
            }
        } catch (e: Exception) {
            appDao.insertCustomer(customer)
        }
    }

    // --- POS Orders & Order Items ---
    fun getOrdersByUnit(unitId: Int): Flow<List<PosOrder>> = appDao.getOrdersByUnit(unitId)

    suspend fun processPosOrder(order: PosOrder, items: List<PosOrderItem>) {
        try {
            val response = api.processPosAction(
                CheckoutRequest(
                    order = PosOrderDto(
                        id = order.id,
                        orderNumber = order.orderNumber,
                        unitId = order.unitId,
                        customerId = order.customerId,
                        subtotal = order.subtotal,
                        total = order.total,
                        paymentMethod = order.paymentMethod,
                        status = order.status,
                        tanggal = order.tanggal,
                        items = items.map {
                            PosOrderItemDto(
                                productId = it.productId,
                                productName = it.productName,
                                qty = it.qty,
                                price = it.price
                            )
                        }
                    )
                )
            )
            if (response.success) {
                syncPosData(order.unitId)
                syncFinanceData(order.unitId)
            } else {
                localProcessPosOrder(order, items)
            }
        } catch (e: Exception) {
            localProcessPosOrder(order, items)
        }
    }

    private suspend fun localProcessPosOrder(order: PosOrder, items: List<PosOrderItem>) {
        appDao.insertOrder(order)
        for (item in items) {
            appDao.insertOrderItem(item)
            val product = appDao.getProductById(item.productId)
            if (product != null) {
                val oldStock = product.stok
                val newStock = (oldStock - item.qty).coerceAtLeast(0)
                appDao.updateProductStock(product.id, newStock)
                val stockLog = StockLog(
                    id = UUID.randomUUID().toString(),
                    productId = product.id,
                    productName = product.nama,
                    unitId = order.unitId,
                    stokAwal = oldStock,
                    perubahan = -item.qty,
                    stokAkhir = newStock,
                    alasan = "POS",
                    tanggal = System.currentTimeMillis()
                )
                appDao.insertStockLog(stockLog)
            }
        }
        val transaction = Transaction(
            unitId = order.unitId,
            kategoriTrx = "MASUK",
            nominal = order.total,
            tanggal = order.tanggal,
            keterangan = "Penjualan POS #${order.orderNumber}"
        )
        appDao.insertTransaction(transaction)
        logAction(
            unitId = order.unitId,
            pesan = "Penjualan POS selesai #${order.orderNumber}. Total: Rp ${String.format("%,.0f", order.total)}",
            tipe = "SUCCESS",
            kategori = "POS"
        )
    }

    fun getOrderItems(orderId: String): Flow<List<PosOrderItem>> = appDao.getOrderItems(orderId)

    // --- Attendance ---
    fun getAttendanceByUnit(unitId: Int): Flow<List<Attendance>> = appDao.getAttendanceByUnit(unitId)

    suspend fun checkInEmployee(employeeId: Int, employeeName: String, unitId: Int, dateStr: String, timeStr: String) {
        try {
            val response = api.processHrAction(
                CheckInRequest(
                    employeeId = employeeId,
                    unitId = unitId,
                    date = dateStr,
                    time = timeStr
                )
            )
            if (response.success) {
                syncEmployees(unitId)
            } else {
                localCheckInEmployee(employeeId, employeeName, unitId, dateStr, timeStr)
            }
        } catch (e: Exception) {
            localCheckInEmployee(employeeId, employeeName, unitId, dateStr, timeStr)
        }
    }

    private suspend fun localCheckInEmployee(employeeId: Int, employeeName: String, unitId: Int, dateStr: String, timeStr: String) {
        val existing = appDao.getAttendanceForEmployeeToday(employeeId, dateStr)
        if (existing == null) {
            val attendance = Attendance(
                employeeId = employeeId,
                date = dateStr,
                checkIn = timeStr,
                checkOut = null,
                status = "HADIR"
            )
            appDao.insertAttendance(attendance)
            logAction(
                unitId = unitId,
                pesan = "Karyawan $employeeName melakukan Check-In pukul $timeStr",
                tipe = "INFO",
                kategori = "HR"
            )
        }
    }

    suspend fun checkOutEmployee(employeeId: Int, employeeName: String, unitId: Int, dateStr: String, timeStr: String) {
        try {
            val response = api.processHrAction(
                CheckOutRequest(
                    employeeId = employeeId,
                    date = dateStr,
                    time = timeStr
                )
            )
            if (response.success) {
                syncEmployees(unitId)
            } else {
                localCheckOutEmployee(employeeId, employeeName, unitId, dateStr, timeStr)
            }
        } catch (e: Exception) {
            localCheckOutEmployee(employeeId, employeeName, unitId, dateStr, timeStr)
        }
    }

    private suspend fun localCheckOutEmployee(employeeId: Int, employeeName: String, unitId: Int, dateStr: String, timeStr: String) {
        val existing = appDao.getAttendanceForEmployeeToday(employeeId, dateStr)
        if (existing != null && existing.checkOut == null) {
            val updated = existing.copy(checkOut = timeStr)
            appDao.insertAttendance(updated)
            logAction(
                unitId = unitId,
                pesan = "Karyawan $employeeName melakukan Check-Out pukul $timeStr",
                tipe = "INFO",
                kategori = "HR"
            )
        }
    }

    // --- Payroll ---
    fun getPayrollByUnit(unitId: Int): Flow<List<Payroll>> = appDao.getPayrollByUnit(unitId)

    suspend fun processPayroll(payroll: Payroll, employeeName: String, unitId: Int) {
        try {
            val response = api.processHrAction(
                ProcessPayrollRequest(
                    payroll = PayrollDto(
                        id = payroll.id,
                        employeeId = payroll.employeeId,
                        monthYear = payroll.monthYear,
                        salary = payroll.salary,
                        allowance = payroll.allowance,
                        deduction = payroll.deduction,
                        netSalary = payroll.netSalary,
                        status = payroll.status
                    )
                )
            )
            if (response.success) {
                syncEmployees(unitId)
                syncFinanceData(unitId)
            } else {
                localProcessPayroll(payroll, employeeName, unitId)
            }
        } catch (e: Exception) {
            localProcessPayroll(payroll, employeeName, unitId)
        }
    }

    private suspend fun localProcessPayroll(payroll: Payroll, employeeName: String, unitId: Int) {
        appDao.insertPayroll(payroll)
        val expense = Transaction(
            unitId = unitId,
            kategoriTrx = "KELUAR",
            nominal = payroll.netSalary,
            tanggal = System.currentTimeMillis(),
            keterangan = "Gaji Karyawan: $employeeName (${payroll.monthYear})"
        )
        appDao.insertTransaction(expense)
        logAction(
            unitId = unitId,
            pesan = "Penggajian diproses untuk $employeeName (${payroll.monthYear}) sebesar Rp ${String.format("%,.0f", payroll.netSalary)}",
            tipe = "SUCCESS",
            kategori = "HR"
        )
    }

    // --- CRM ---
    fun getDealsByUnit(unitId: Int): Flow<List<CrmDeal>> = appDao.getDealsByUnit(unitId)

    suspend fun insertDeal(deal: CrmDeal) {
        try {
            val response = api.createDeal(
                AddDealRequest(
                    CrmDealDto(
                        id = deal.id,
                        contactName = deal.contactName,
                        companyName = deal.companyName,
                        dealValue = deal.dealValue,
                        stage = deal.stage,
                        phone = deal.phone,
                        unitId = deal.unitId
                    )
                )
            )
            if (response.success) {
                syncCrmDeals(deal.unitId)
            } else {
                appDao.insertDeal(deal)
            }
        } catch (e: Exception) {
            appDao.insertDeal(deal)
        }
    }

    suspend fun updateDealStage(dealId: Int, stage: String, contactName: String, value: Double, unitId: Int) {
        try {
            val response = api.updateDealStage(UpdateDealStageRequest(dealId, stage, unitId))
            if (response.success) {
                syncCrmDeals(unitId)
            } else {
                appDao.updateDealStage(dealId, stage)
            }
        } catch (e: Exception) {
            appDao.updateDealStage(dealId, stage)
        }
    }

    suspend fun deleteDeal(id: Int, unitId: Int) {
        try {
            val response = api.deleteDeal(unitId, id)
            if (response.success) {
                appDao.deleteDeal(id)
            }
        } catch (e: Exception) {
            appDao.deleteDeal(id)
        }
    }

    // --- Audit Trail ---
    fun getRiwayatAksiByUnit(unitId: Int): Flow<List<RiwayatAksi>> = appDao.getRiwayatAksiByUnit(unitId)

    suspend fun logAction(unitId: Int, pesan: String, tipe: String, kategori: String) {
        val action = RiwayatAksi(
            unitId = unitId,
            pesan = pesan,
            tipe = tipe,
            waktu = System.currentTimeMillis(),
            kategori = kategori
        )
        appDao.insertRiwayatAksi(action)
    }

    // --- Seeding ---
    suspend fun seedDatabaseIfEmpty() {
        // Only seed local Room database if we fail to fetch from API on first load
        val dbState = appDao.getProductsByUnitSync(1)
        if (dbState.isEmpty()) {
            val success = syncUnits()
            if (success) {
                val list = appDao.getProductsByUnitSync(1)
                if (list.isNotEmpty()) return
            }
            
            // Seed a default unit in local Room if api is not reachable
            val unitId = appDao.insertUnit(
                UnitBisnis(
                    id = 1,
                    namaUnit = "Sinar Baru Mart",
                    slug = "sinar-baru-mart",
                    alamat = "Jl. Merdeka No. 45, Jakarta",
                    modalAwal = 50000000.0,
                    kategori = "Ritel & Kelontong"
                )
            ).toInt()

            appDao.insertUnit(
                UnitBisnis(
                    id = 2,
                    namaUnit = "Sinar Baru Mart (Cabang Bandung)",
                    slug = "sinar-baru-bandung",
                    alamat = "Jl. Dago No. 12, Bandung",
                    modalAwal = 25000000.0,
                    kategori = "Ritel & Kelontong"
                )
            )

            val p1Id = UUID.randomUUID().toString()
            appDao.insertProduct(Product(p1Id, "PRD001", "Kopi Robusta Lampung 250g", 22000.0, 35000.0, 150, "Bahan Makanan", unitId))
            appDao.insertVariant(ProductVariant(UUID.randomUUID().toString(), p1Id, "Bubuk Halus", "PRD001-F", 22000.0, 35000.0, 75))

            appDao.insertEmployee(Employee(1, "Fandi Ahmad", "Kasir Senior", 3500000.0, "1234", "Staff", unitId))
            appDao.insertTransaction(Transaction(0, unitId, "MASUK", 15000000.0, System.currentTimeMillis() - 5 * 24 * 3600 * 1000, "Suntikan Modal Tambahan"))
            appDao.insertCustomer(PosCustomer(0, unitId, "Andi Setiawan", "andi@gmail.com", "08123456789"))
            appDao.insertDeal(CrmDeal(0, "Subhan Lubis", "Lubis Kopi Grosir", 12500000.0, "NEGOTIATION", "08521112233", unitId))
            appDao.insertStockLog(StockLog(UUID.randomUUID().toString(), p1Id, "Kopi Robusta Lampung 250g", unitId, 100, 50, 150, "RESTOCK", System.currentTimeMillis() - 4 * 24 * 3600 * 1000))
            
            logAction(unitId, "Sistem offline diinisialisasi", "INFO", "SYSTEM")
        }
    }
}
