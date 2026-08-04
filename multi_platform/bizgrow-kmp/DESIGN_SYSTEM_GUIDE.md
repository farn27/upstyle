# Bizgrow Mobile Design System Guide

## Overview
Bizgrow menggunakan Material 3 design system dengan custom color palette dan typography untuk menciptakan pengalaman yang professional dan modern.

## 🎨 Colors

### Primary Colors
```kotlin
BizgrowColors.Primary          // #5B5FEF - Main brand color
BizgrowColors.PrimaryDark      // #4549D3
BizgrowColors.PrimaryLight     // #EFF0FE
BizgrowColors.PrimaryMid       // #818CF8
```

### Semantic Colors
```kotlin
// Success (Green)
BizgrowColors.Success          // #22C55E
BizgrowColors.SuccessLight     // #F0FDF4

// Warning (Amber)
BizgrowColors.Warning          // #F59E0B
BizgrowColors.WarningLight     // #FFFBEB

// Danger (Red)
BizgrowColors.Danger           // #EF4444
BizgrowColors.DangerLight      // #FEF2F2

// Secondary (Emerald)
BizgrowColors.Secondary        // #10B981
BizgrowColors.SecondaryContainer // #D1FAE5
```

### Neutral Colors
```kotlin
BizgrowColors.Gray950          // Darkest
BizgrowColors.Gray900
BizgrowColors.Gray800
BizgrowColors.Gray700
BizgrowColors.Gray500
BizgrowColors.Gray400
BizgrowColors.Gray300
BizgrowColors.Gray200
BizgrowColors.Gray100
BizgrowColors.Gray50           // Lightest
```

### Gradients
```kotlin
BizgrowColors.GradPrimary      // Primary gradient
BizgrowColors.GradSuccess      // Success gradient
BizgrowColors.GradWarning      // Warning gradient
BizgrowColors.GradDanger       // Danger gradient
BizgrowColors.GradDark         // Dark gradient
```

## 📝 Typography

**ALWAYS use MaterialTheme.typography instead of hardcoded font sizes!**

### Display & Headlines
```kotlin
// For major page titles
MaterialTheme.typography.displayLarge    // 32sp, ExtraBold
MaterialTheme.typography.headlineLarge   // 26sp, Bold
MaterialTheme.typography.headlineMedium  // 22sp, Bold
MaterialTheme.typography.headlineSmall   // 18sp, SemiBold
```

### Titles
```kotlin
// For section headers and card titles
MaterialTheme.typography.titleLarge      // 17sp, Bold
MaterialTheme.typography.titleMedium     // 15sp, SemiBold
MaterialTheme.typography.titleSmall      // 13sp, Medium
```

### Body Text
```kotlin
// For main content
MaterialTheme.typography.bodyLarge       // 15sp, Normal
MaterialTheme.typography.bodyMedium      // 13sp, Normal
MaterialTheme.typography.bodySmall       // 11sp, Normal
```

### Labels
```kotlin
// For small labels, badges, captions
MaterialTheme.typography.labelLarge      // 13sp, SemiBold
MaterialTheme.typography.labelMedium     // 11sp, Medium
MaterialTheme.typography.labelSmall      // 10sp, Medium
```

### Usage Examples

❌ **WRONG** - Hardcoded sizes:
```kotlin
Text("Title", fontSize = 16.sp, fontWeight = FontWeight.Bold)
Text("Subtitle", fontSize = 12.sp, color = Gray500)
Text("Body", fontSize = 14.sp)
```

✅ **CORRECT** - Using theme:
```kotlin
Text("Title", style = MaterialTheme.typography.titleLarge)
Text("Subtitle", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
Text("Body", style = MaterialTheme.typography.bodyMedium)
```

## 🔲 Spacing

### Standard Spacing Scale
```kotlin
4.dp    // Tiny spacing (between related items)
8.dp    // Small spacing
12.dp   // Medium spacing
16.dp   // Standard padding (most common)
20.dp   // Large spacing
24.dp   // Extra large spacing
32.dp   // Section spacing
48.dp   // Major section divider
```

### Component Padding
```kotlin
Card padding:     16.dp
Screen padding:   16.dp
List item padding: 16.dp
Button padding:   PaddingValues(horizontal = 20.dp, vertical = 12.dp)
```

## 📦 Components

### StatCard
For KPI metrics and statistics
```kotlin
StatCard(
    title = "Total Revenue",
    value = "Rp 1.5M",
    subtitle = "+12% this month",
    icon = Icons.Default.TrendingUp,
    gradient = BizgrowColors.GradSuccess
)
```

### MenuCard
For navigation menu items
```kotlin
MenuCard(
    label = "Products",
    icon = Icons.Default.Inventory,
    gradient = BizgrowColors.GradPrimary,
    badge = "5",
    onClick = { /* navigate */ }
)
```

### BizCard
Standard card container
```kotlin
BizCard {
    Text("Card Title", style = MaterialTheme.typography.titleMedium)
    Spacer(Modifier.height(8.dp))
    Text("Card content", style = MaterialTheme.typography.bodySmall)
}
```

### StatusBadge
For status indicators
```kotlin
StatusBadge("PAID")       // Green
StatusBadge("PENDING")    // Yellow
StatusBadge("OVERDUE")    // Red
StatusBadge("ACTIVE")     // Green
```

### EmptyState
For empty data states
```kotlin
EmptyState(
    icon = Icons.Default.Inbox,
    title = "Belum ada data",
    subtitle = "Tambah data baru untuk mulai",
    actionLabel = "Tambah Data",
    onAction = { /* create new */ }
)
```

### SectionHeader
For section titles with optional action
```kotlin
SectionHeader(
    title = "Recent Transactions",
    actionLabel = "Lihat Semua",
    onAction = { /* navigate to all */ }
)
```

## 🎭 Shapes

```kotlin
RoundedCornerShape(6.dp)    // Extra small (badges, small chips)
RoundedCornerShape(8.dp)    // Small (buttons, small cards)
RoundedCornerShape(12.dp)   // Medium (standard cards)
RoundedCornerShape(20.dp)   // Large (main cards, containers)
RoundedCornerShape(24.dp)   // Extra large (dialogs)
CircleShape                  // For avatars, icon containers
```

## 🚫 Common Mistakes

### ❌ Inconsistent Font Sizes
```kotlin
// DON'T mix random font sizes
Text("Title", fontSize = 14.sp)
Text("Another Title", fontSize = 16.sp)
Text("Subtitle", fontSize = 11.sp)
```

### ✅ Use Typography Scale
```kotlin
// DO use typography system
Text("Title", style = MaterialTheme.typography.titleMedium)
Text("Another Title", style = MaterialTheme.typography.titleMedium)
Text("Subtitle", style = MaterialTheme.typography.bodySmall)
```

### ❌ Hardcoded Colors
```kotlin
// DON'T use raw colors
Text("Error", color = Color.Red)
Surface(color = Color(0xFFFF0000)) { }
```

### ✅ Use Theme Colors
```kotlin
// DO use theme colors
Text("Error", color = MaterialTheme.colorScheme.error)
Surface(color = BizgrowColors.Danger) { }
```

### ❌ Inconsistent Spacing
```kotlin
// DON'T use random spacing
Spacer(Modifier.height(7.dp))
Spacer(Modifier.height(13.dp))
Column(Modifier.padding(18.dp))
```

### ✅ Use Standard Spacing
```kotlin
// DO use 4dp increments
Spacer(Modifier.height(8.dp))
Spacer(Modifier.height(12.dp))
Column(Modifier.padding(16.dp))
```

## 📱 Screen Layout Pattern

Standard screen structure:
```kotlin
@Composable
fun MyScreen(viewModel: AppViewModel) {
    val data by viewModel.data.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadData()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Screen Title", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = { /* back button */ }
            )
        },
        floatingActionButton = { /* FAB if needed */ },
        bottomBar = { BottomNavBar(viewModel, Screen.Current) }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                uiState.isLoading && data == null -> LoadingState()
                data == null -> EmptyState(...)
                else -> ContentList(data)
            }
        }
    }
}
```

## 🎯 Best Practices

1. **Always use theme typography** - Never hardcode font sizes
2. **Use semantic colors** - Success for positive, Danger for negative, Warning for caution
3. **Consistent spacing** - Use 4dp increments (4, 8, 12, 16, 20, 24)
4. **Reuse components** - Don't recreate common patterns
5. **StatusBadge for statuses** - Don't create custom badge variations
6. **EmptyState for no data** - Provide helpful empty states
7. **collectAsStateWithLifecycle** - Use instead of collectAsState
8. **LaunchedEffect** - Load data in screen composition
9. **Material Icons** - Use Icons.Default.* for consistency

## 🔍 Typography Quick Reference

| Use Case | Typography Style | Size | Weight |
|----------|-----------------|------|--------|
| Page Title | headlineMedium | 22sp | Bold |
| Section Header | titleLarge | 17sp | Bold |
| Card Title | titleMedium | 15sp | SemiBold |
| Primary Text | bodyMedium | 13sp | Normal |
| Secondary Text | bodySmall | 11sp | Normal |
| Badge/Label | labelSmall | 10sp | Medium |
| Stat Value | headlineSmall | 18sp | SemiBold |
| Small Caption | labelMedium | 11sp | Medium |

## 🎨 Color Usage Guide

| Use Case | Color |
|----------|-------|
| Positive action | BizgrowColors.Success |
| Negative action | BizgrowColors.Danger |
| Warning/Pending | BizgrowColors.Warning |
| Primary action | BizgrowColors.Primary |
| Disabled text | BizgrowColors.Gray400 |
| Secondary text | BizgrowColors.Gray500 |
| Border | BizgrowColors.Gray200 |
| Background | BizgrowColors.Background |

## ✅ Migration Checklist

When updating existing screens:
- [ ] Replace hardcoded `fontSize` with MaterialTheme.typography
- [ ] Replace Color(0x...) with theme colors
- [ ] Use standard spacing (4dp increments)
- [ ] Use StatusBadge for status indicators
- [ ] Use EmptyState for no-data screens
- [ ] Use BizCard instead of custom Cards
- [ ] Replace custom badges with StatusBadge
- [ ] Use SectionHeader for section titles
- [ ] Ensure collectAsStateWithLifecycle usage
- [ ] Verify responsive layout
