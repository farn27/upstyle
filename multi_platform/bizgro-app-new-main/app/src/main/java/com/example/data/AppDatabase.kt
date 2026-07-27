package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        UnitBisnis::class,
        Product::class,
        ProductVariant::class,
        Employee::class,
        Transaction::class,
        StockLog::class,
        PosCustomer::class,
        PosOrder::class,
        PosOrderItem::class,
        Attendance::class,
        Payroll::class,
        CrmDeal::class,
        RiwayatAksi::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun appDao(): AppDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "saas_umkm_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
