package com.example.api

import com.example.BuildConfig
import com.example.data.*
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

// --- Common Data Classes with Moshi ---

@JsonClass(generateAdapter = true)
data class GenerateContentRequest(
    val contents: List<Content>,
    val generationConfig: GenerationConfig? = null,
    val systemInstruction: Content? = null
)

@JsonClass(generateAdapter = true)
data class Content(
    val parts: List<Part>
)

@JsonClass(generateAdapter = true)
data class Part(
    val text: String? = null
)

@JsonClass(generateAdapter = true)
data class GenerationConfig(
    val temperature: Float? = null,
    val topP: Float? = null,
    val topK: Int? = null
)

@JsonClass(generateAdapter = true)
data class GenerateContentResponse(
    val candidates: List<Candidate>
)

@JsonClass(generateAdapter = true)
data class Candidate(
    val content: Content
)

// --- Retrofit Setup ---

interface GeminiApiService {
    @POST("v1beta/models/gemini-3.5-flash:generateContent")
    suspend fun generateContent(
        @Query("key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

object RetrofitClient {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val moshi = Moshi.Builder().build()

    val service: GeminiApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
        retrofit.create(GeminiApiService::class.java)
    }
}

// --- Gemini Service ---

object GeminiService {

    suspend fun chatWithBusinessContext(
        userMessage: String,
        unit: UnitBisnis?,
        products: List<Product>,
        transactions: List<Transaction>,
        employees: List<Employee>,
        deals: List<CrmDeal>,
        history: List<RiwayatAksi>
    ): String = withContext(Dispatchers.IO) {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            return@withContext "Kunci API Gemini tidak dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di Panel Rahasia (Secrets Panel) AI Studio."
        }

        // Calculate business stats for context
        val totalMasuk = transactions.filter { it.kategoriTrx == "MASUK" }.sumOf { it.nominal }
        val totalKeluar = transactions.filter { it.kategoriTrx == "KELUAR" }.sumOf { it.nominal }
        val netProfit = totalMasuk - totalKeluar
        val modalAwal = unit?.modalAwal ?: 0.0
        val margin = if (totalMasuk > 0) ((totalMasuk - totalKeluar) / totalMasuk * 100) else 0.0
        val runwayMonths = if (totalKeluar > 0) (modalAwal / (totalKeluar / 2.0).coerceAtLeast(100000.0)) else 99.0

        val systemPrompt = """
            Anda adalah AI Business Assistant ahli untuk UMKM Indonesia, terintegrasi dalam platform SaaS UMKM.
            Anda memiliki akses penuh ke database real-time bisnis ini. Analisis data di bawah ini dan berikan nasihat bisnis yang strategis, ramah, profesional, dan praktis menggunakan bahasa Indonesia yang baik.
            
            INFORMASI BISNIS:
            - Nama Unit Bisnis: ${unit?.namaUnit ?: "N/A"}
            - Kategori Usaha: ${unit?.kategori ?: "N/A"}
            - Alamat: ${unit?.alamat ?: "N/A"}
            - Modal Awal: Rp ${String.format("%,.0f", modalAwal)}
            
            KONDISI KEUANGAN SAAT INI:
            - Total Pendapatan (Masuk): Rp ${String.format("%,.0f", totalMasuk)}
            - Total Pengeluaran (Keluar): Rp ${String.format("%,.0f", totalKeluar)}
            - Laba Bersih (Net Profit): Rp ${String.format("%,.0f", netProfit)}
            - Margin Laba: ${String.format("%.1f", margin)}%
            - Cash Runway (Estimasi Daya Tahan Kas): ${String.format("%.1f", runwayMonths)} bulan
            
            DATA PRODUK & INVENTORI:
            - Total Katalog Produk: ${products.size} produk
            - Daftar Produk Utama (Nama | Stok | Harga Jual):
              ${products.take(10).joinToString("\n  ") { "- ${it.nama} (Stok: ${it.stok}, Harga: Rp ${String.format("%,.0f", it.hargaJual)})" }}
            
            DATA SUMBER DAYA MANUSIA (KARYAWAN):
            - Total Karyawan: ${employees.size} orang
            - Daftar Karyawan (Nama | Posisi | Gaji):
              ${employees.take(5).joinToString("\n  ") { "- ${it.fullName} (${it.position} | Gaji: Rp ${String.format("%,.0f", it.salary)})" }}
              
            DATA CRM (PIPELINE DEALS):
            - Total Deal Aktif: ${deals.size} deal
            - Daftar Deal Utama (Kontak | Perusahaan | Nilai | Status):
              ${deals.take(5).joinToString("\n  ") { "- ${it.contactName} (${it.companyName} | Rp ${String.format("%,.0f", it.dealValue)} | ${it.stage})" }}
              
            LOG AUDIT & RIWAYAT AKSI TERAKHIR:
            ${history.take(5).joinToString("\n") { "- [${it.kategori}] ${it.pesan}" }}
            
            Gunakan data ini untuk menjawab pertanyaan pengguna dengan analisis akurat. Jika pengguna meminta saran umum, berikan analisis kekuatan keuangan, perputaran stok, produktivitas karyawan, atau prospek CRM mereka.
        """.trimIndent()

        val request = GenerateContentRequest(
            contents = listOf(
                Content(parts = listOf(Part(text = userMessage)))
            ),
            generationConfig = GenerationConfig(temperature = 0.7f),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )

        try {
            val response = RetrofitClient.service.generateContent(apiKey, request)
            response.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text 
                ?: "Tidak ada respon dari asisten AI."
        } catch (e: Exception) {
            "Gagal menghubungi Asisten AI: ${e.localizedMessage ?: e.message}. Pastikan koneksi internet aktif dan GEMINI_API_KEY valid."
        }
    }
}
