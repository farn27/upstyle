package com.upstyle.bizgrow.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/**
 * Gambar produk. Tanpa foto → kotak berwarna dengan inisial (tanpa request jaringan).
 * Foto berupa path relatif ("/uploads/..") diawali alamat server.
 */
/** Alamat server aktif — dipakai melengkapi path foto relatif ("/uploads/..") di seluruh layar. */
val LocalServerUrl = androidx.compose.runtime.staticCompositionLocalOf { "" }

@Composable
fun ProductThumb(
    nama: String,
    foto: String?,
    modifier: Modifier = Modifier,
    shape: Shape = MaterialTheme.shapes.medium,
    serverUrl: String? = null,
    fontSize: TextUnit = 22.sp
) {
    val basis = serverUrl ?: LocalServerUrl.current
    val url = when {
        foto.isNullOrBlank() -> null
        foto.startsWith("http") -> foto
        basis.isNotBlank() -> basis.trimEnd('/') + "/" + foto.trimStart('/')
        else -> null
    }
    val warna = BizgrowColors.ModuleColors[(nama.hashCode() and 0x7fffffff) % BizgrowColors.ModuleColors.size]
    Box(
        modifier
            .clip(shape)
            .background(Brush.linearGradient(listOf(warna.copy(alpha = 0.85f), warna))),
        contentAlignment = Alignment.Center
    ) {
        Text(
            nama.trim().split(" ").filter { it.isNotEmpty() }.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "?" },
            color = androidx.compose.ui.graphics.Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = fontSize
        )
        if (url != null) {
            AsyncImage(model = url, contentDescription = nama, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
    }
}
