package com.upstyle.bizgrow.ui.design

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.ripple
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.coroutines.delay

// ═══════════════════════════════════════════════════════════════════════════
//  Interaksi
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Klik dengan efek "menekan" (skala sedikit mengecil). Hanya animasi graphicsLayer
 * sehingga tidak memicu layout ulang — ringan untuk daftar panjang.
 */
fun Modifier.pressClick(
    enabled: Boolean = true,
    pressedScale: Float = 0.96f,
    onClick: () -> Unit
): Modifier = composed {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) pressedScale else 1f, BizMotion.snappy(), label = "press")
    this
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .clickable(interactionSource = source, indication = ripple(), enabled = enabled, onClick = onClick)
}

/**
 * Muncul bertahap (fade + naik sedikit) saat pertama kali tampil. Dipakai untuk item daftar
 * dengan jeda kecil per indeks; hanya berjalan sekali, tidak berulang saat scroll balik.
 */
fun Modifier.enterAnimation(index: Int = 0, maxStagger: Int = 8): Modifier = composed {
    var shown by rememberSaveableOnce()
    val progress = remember { Animatable(if (shown) 1f else 0f) }
    LaunchedEffect(Unit) {
        if (!shown) {
            delay((index.coerceAtMost(maxStagger) * 35).toLong())
            progress.animateTo(1f, tween(BizMotion.Slow, easing = BizMotion.Emphasized))
            shown = true
        }
    }
    graphicsLayer {
        alpha = progress.value
        translationY = (1f - progress.value) * 24f
    }
}

@Composable
private fun rememberSaveableOnce(): MutableState<Boolean> = remember { mutableStateOf(false) }

// ═══════════════════════════════════════════════════════════════════════════
//  Kerangka layar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kerangka layar standar: latar, top bar ringkas (judul + subjudul + tombol kembali),
 * slot aksi, FAB, dan bottom bar.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BizScreen(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    bottomBar: @Composable () -> Unit = {},
    snackbarHost: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { BizTopBar(title = title, subtitle = subtitle, onBack = onBack, actions = actions) },
        floatingActionButton = floatingActionButton,
        bottomBar = bottomBar,
        snackbarHost = snackbarHost,
        content = content
    )
}

@Composable
fun BizTopBar(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(start = if (onBack != null) 6.dp else 20.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Kembali", tint = MaterialTheme.colorScheme.onBackground)
                }
                Spacer(Modifier.width(2.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, content = actions)
        }
    }
}

/** Tombol ikon bulat bertepi tipis untuk area header. */
@Composable
fun BizIconButton(
    icon: ImageVector,
    contentDescription: String,
    badge: Int = 0,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    container: Color = MaterialTheme.colorScheme.surface,
    onClick: () -> Unit
) {
    Box {
        Box(
            Modifier
                .size(42.dp)
                .clip(CircleShape)
                .background(container)
                .border(1.dp, LocalBizPalette.current.border, CircleShape)
                .pressClick(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription, tint = tint, modifier = Modifier.size(21.dp))
        }
        if (badge > 0) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 2.dp, y = (-2).dp)
                    .defaultMinSize(minWidth = 18.dp, minHeight = 18.dp)
                    .clip(CircleShape)
                    .background(BizgrowColors.Danger)
                    .padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    if (badge > 99) "99+" else badge.toString(),
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Kartu & permukaan
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun BizSurface(
    modifier: Modifier = Modifier,
    shape: Shape = MaterialTheme.shapes.large,
    color: Color = MaterialTheme.colorScheme.surface,
    border: Boolean = true,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    val base = modifier
        .clip(shape)
        .background(color)
        .then(if (border) Modifier.border(1.dp, LocalBizPalette.current.border, shape) else Modifier)
        .then(if (onClick != null) Modifier.pressClick(pressedScale = 0.98f, onClick = onClick) else Modifier)
    Column(base.padding(contentPadding), content = content)
}

/** Kartu hero bergradien untuk angka utama. */
@Composable
fun GradientCard(
    modifier: Modifier = Modifier,
    colors: List<Color> = BizgrowColors.GradPrimary,
    shape: Shape = RoundedCornerShape(26.dp),
    contentPadding: PaddingValues = PaddingValues(20.dp),
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier
            .clip(shape)
            .background(Brush.linearGradient(colors))
            .then(if (onClick != null) Modifier.pressClick(pressedScale = 0.98f, onClick = onClick) else Modifier)
    ) {
        // Ornamen lingkaran tipis — memberi kedalaman tanpa gambar
        Box(
            Modifier
                .size(180.dp)
                .align(Alignment.TopEnd)
                .offset(x = 60.dp, y = (-70).dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.10f))
        )
        Box(
            Modifier
                .size(110.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 20.dp, y = 50.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.07f))
        )
        Box(Modifier.padding(contentPadding), content = content)
    }
}

/** Ikon di dalam kotak membulat berwarna lembut. */
@Composable
fun IconBadge(
    icon: ImageVector,
    tint: Color,
    size: Dp = 44.dp,
    iconSize: Dp = 22.dp,
    shape: Shape = RoundedCornerShape(14.dp),
    container: Color = tint.copy(alpha = if (LocalBizPalette.current.isDark) 0.22f else 0.12f)
) {
    Box(
        Modifier.size(size).clip(shape).background(container),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
    }
}

@Composable
fun StatTile(
    label: String,
    value: String,
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    caption: String? = null,
    onClick: (() -> Unit)? = null
) {
    BizSurface(modifier = modifier, onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        IconBadge(icon, tint, size = 36.dp, iconSize = 18.dp, shape = RoundedCornerShape(11.dp))
        Spacer(Modifier.height(12.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        Spacer(Modifier.height(2.dp))
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (caption != null) {
            Text(caption, style = MaterialTheme.typography.labelSmall, color = tint, maxLines = 1)
        }
    }
}

/** Ubin fitur untuk grid modul. */
@Composable
fun ModuleTile(
    label: String,
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    badge: String? = null,
    onClick: () -> Unit
) {
    Column(
        modifier
            .clip(RoundedCornerShape(18.dp))
            .pressClick(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box {
            IconBadge(icon, tint, size = 52.dp, iconSize = 24.dp, shape = RoundedCornerShape(17.dp))
            if (badge != null) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 6.dp, y = (-4).dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(BizgrowColors.Danger)
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(badge, color = Color.White, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}

@Composable
fun SectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (actionLabel != null && onAction != null) {
            Text(
                actionLabel,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable(onClick = onAction).padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

/** Baris daftar umum: ikon, judul, subjudul, nilai di kanan. */
@Composable
fun ListRow(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    icon: ImageVector? = null,
    tint: Color = MaterialTheme.colorScheme.primary,
    trailing: @Composable (() -> Unit)? = null,
    showChevron: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .then(if (onClick != null) Modifier.pressClick(pressedScale = 0.98f, onClick = onClick) else Modifier)
            .padding(horizontal = 4.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            IconBadge(icon, tint, size = 42.dp, iconSize = 20.dp, shape = RoundedCornerShape(13.dp))
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        if (trailing != null) {
            Spacer(Modifier.width(8.dp))
            trailing()
        }
        if (showChevron) {
            Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
fun StatusChip(text: String, color: Color, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = if (LocalBizPalette.current.isDark) 0.22f else 0.12f))
            .padding(horizontal = 10.dp, vertical = 3.dp),
        color = color,
        style = MaterialTheme.typography.labelSmall,
        maxLines = 1
    )
}

/** Chip filter yang bisa dipilih, dengan transisi warna lembut. */
@Composable
fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val bg by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface, BizMotion.fast(), label = "pillBg"
    )
    val fg by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, BizMotion.fast(), label = "pillFg"
    )
    Text(
        text,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .then(if (!selected) Modifier.border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(50)) else Modifier)
            .pressClick(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        color = fg,
        style = MaterialTheme.typography.labelMedium,
        maxLines = 1
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tombol & input
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun BizButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    loading: Boolean = false,
    enabled: Boolean = true,
    colors: List<Color> = BizgrowColors.GradPrimary,
    height: Dp = 54.dp
) {
    val active = enabled && !loading
    Box(
        modifier
            .height(height)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (active) Brush.horizontalGradient(colors)
                else Brush.horizontalGradient(colors.map { it.copy(alpha = 0.45f) })
            )
            .pressClick(enabled = active, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        AnimatedContent(loading, transitionSpec = { fadeIn(BizMotion.fast()) togetherWith fadeOut(BizMotion.fast()) }, label = "btn") { isLoading ->
            if (isLoading) {
                CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.5.dp)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (icon != null) {
                        Icon(icon, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(text, color = Color.White, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun BizOutlineButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    tint: Color = MaterialTheme.colorScheme.primary,
    height: Dp = 50.dp
) {
    Row(
        modifier
            .height(height)
            .clip(RoundedCornerShape(16.dp))
            .border(BorderStroke(1.dp, LocalBizPalette.current.border), RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .pressClick(onClick = onClick)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(19.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, color = tint, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun BizTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    placeholder: String? = null,
    isPassword: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: (() -> Unit)? = null,
    isError: Boolean = false,
    supportingText: String? = null,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    /** Kolom uang: tampil "Rp 1.500.000" saat diketik; nilai yang disimpan tetap digit murni ("1500000"). */
    uang: Boolean = false
) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        leadingIcon = leadingIcon?.let { { Icon(it, null, modifier = Modifier.size(20.dp)) } },
        trailingIcon = if (isPassword) {
            {
                IconButton(onClick = { visible = !visible }) {
                    Icon(
                        if (visible) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                        contentDescription = if (visible) "Sembunyikan" else "Tampilkan"
                    )
                }
            }
        } else null,
        visualTransformation = when {
            isPassword && !visible -> PasswordVisualTransformation()
            uang -> RupiahVisualTransformation
            else -> VisualTransformation.None
        },
        keyboardOptions = KeyboardOptions(keyboardType = if (isPassword) KeyboardType.Password else keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onAny = { onImeAction?.invoke() }),
        isError = isError,
        supportingText = supportingText?.let { { Text(it) } },
        singleLine = singleLine,
        enabled = enabled,
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = LocalBizPalette.current.border,
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            focusedContainerColor = MaterialTheme.colorScheme.surface,
        )
    )
}

@Composable
fun BizSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "Cari…",
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Rounded.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            androidx.compose.foundation.text.BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth()
            )
        }
        AnimatedVisibility(value.isNotEmpty(), enter = fadeIn() + scaleIn(), exit = fadeOut() + scaleOut()) {
            Icon(
                Icons.Rounded.Close, "Hapus",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp).clip(CircleShape).clickable { onValueChange("") }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  State: kosong, error, memuat
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun EmptyView(
    title: String,
    message: String? = null,
    icon: ImageVector = Icons.Rounded.Inbox,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        val float = rememberInfiniteTransition(label = "empty")
        val dy by float.animateFloat(0f, -6f, infiniteRepeatable(tween(1600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "dy")
        Box(Modifier.graphicsLayer { translationY = dy }) {
            IconBadge(icon, MaterialTheme.colorScheme.primary, size = 76.dp, iconSize = 34.dp, shape = RoundedCornerShape(24.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        if (message != null) {
            Spacer(Modifier.height(4.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(18.dp))
            BizButton(actionLabel, onAction, height = 46.dp, modifier = Modifier.widthIn(min = 160.dp))
        }
    }
}

@Composable
fun ErrorView(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    EmptyView(
        title = "Terjadi kendala",
        message = message,
        icon = Icons.Rounded.CloudOff,
        actionLabel = if (onRetry != null) "Coba lagi" else null,
        onAction = onRetry,
        modifier = modifier
    )
}

/** Kerangka memuat (skeleton) dengan satu animasi kilau bersama — ringan. */
@Composable
fun SkeletonBlock(modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(12.dp)) {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val alpha by transition.animateFloat(0.45f, 0.9f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "a")
    Box(modifier.clip(shape).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha)))
}

@Composable
fun SkeletonList(rows: Int = 6, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(rows) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SkeletonBlock(Modifier.size(42.dp), RoundedCornerShape(13.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SkeletonBlock(Modifier.fillMaxWidth(0.6f).height(12.dp))
                    SkeletonBlock(Modifier.fillMaxWidth(0.35f).height(10.dp))
                }
                SkeletonBlock(Modifier.width(56.dp).height(12.dp))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Angka
// ═══════════════════════════════════════════════════════════════════════════

/** Format Rupiah ringkas: 1.250.000 → "Rp 1,25 jt". */
fun Double.rupiahRingkas(): String {
    val abs = kotlin.math.abs(this)
    val sign = if (this < 0) "-" else ""
    return when {
        abs >= 1_000_000_000 -> "${sign}Rp ${desimal(abs / 1_000_000_000)} M"
        abs >= 1_000_000 -> "${sign}Rp ${desimal(abs / 1_000_000)} jt"
        abs >= 10_000 -> "${sign}Rp ${desimal(abs / 1_000)} rb"
        else -> "${sign}Rp ${ribuan(abs.toLong())}"
    }
}

/** Format Rupiah penuh: 1250000 → "Rp 1.250.000". */
fun Double.rupiah(): String = (if (this < 0) "-" else "") + "Rp " + ribuan(kotlin.math.abs(this).toLong())

private fun desimal(v: Double): String {
    val r = kotlin.math.round(v * 100) / 100
    val s = r.toString().trimEnd('0').trimEnd('.')
    return s.replace('.', ',')
}

private fun ribuan(v: Long): String = v.toString().reversed().chunked(3).joinToString(".").reversed()

/** Angka yang "berhitung" saat berubah — hanya teks yang di-recompose. */
@Composable
fun AnimatedAmount(
    value: Double,
    style: androidx.compose.ui.text.TextStyle,
    color: Color,
    modifier: Modifier = Modifier,
    format: (Double) -> String = { it.rupiah() }
) {
    val animated by animateFloatAsState(value.toFloat(), tween(700, easing = BizMotion.Emphasized), label = "amount")
    Text(format(animated.toDouble()), style = style, color = color, modifier = modifier, maxLines = 1, overflow = TextOverflow.Ellipsis)
}

/**
 * Tampilan kolom uang: digit "1500000" tampil "Rp 1.500.000" (nilai asli tidak berubah, kursor tetap pas).
 * Nilai yang bukan digit murni (mis. kosong) ditampilkan apa adanya.
 */
object RupiahVisualTransformation : VisualTransformation {
    override fun filter(text: androidx.compose.ui.text.AnnotatedString): androidx.compose.ui.text.input.TransformedText {
        val asli = text.text
        if (asli.isEmpty() || !asli.all { it.isDigit() }) {
            return androidx.compose.ui.text.input.TransformedText(text, androidx.compose.ui.text.input.OffsetMapping.Identity)
        }
        val awalan = "Rp "
        val sb = StringBuilder(awalan)
        val posisi = IntArray(asli.length + 1)
        for (i in asli.indices) {
            val sisa = asli.length - i
            if (i > 0 && sisa % 3 == 0) sb.append('.')
            posisi[i] = sb.length
            sb.append(asli[i])
        }
        posisi[asli.length] = sb.length
        val peta = object : androidx.compose.ui.text.input.OffsetMapping {
            override fun originalToTransformed(offset: Int): Int = posisi[offset.coerceIn(0, asli.length)]
            override fun transformedToOriginal(offset: Int): Int {
                if (offset <= awalan.length) return 0
                var hasil = 0
                for (i in asli.indices) if (posisi[i] < offset) hasil = i + 1
                return hasil.coerceIn(0, asli.length)
            }
        }
        return androidx.compose.ui.text.input.TransformedText(androidx.compose.ui.text.AnnotatedString(sb.toString()), peta)
    }
}
