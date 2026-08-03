import os
import re

screen_dir = r"E:\upstyle\multi_platform\bizgrow-kmp\shared\src\commonMain\kotlin\com\upstyle\bizgrow\ui\screens"
components_dir = r"E:\upstyle\multi_platform\bizgrow-kmp\shared\src\commonMain\kotlin\com\upstyle\bizgrow\ui\components"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Radius Update
    # Replace RoundedCornerShape(8.dp), 12.dp, 14.dp, 16.dp with 20.dp
    # Note: 8.dp might be too small to replace with 20.dp (e.g. for small badges). Let's only replace 12, 14, 16.
    content = re.sub(r'RoundedCornerShape\(\s*(12|14|16)\.dp\s*\)', 'RoundedCornerShape(20.dp)', content)
    
    # 2. TopAppBar color fix (Enterprise apps use white/background app bars, not heavy primary color)
    # We replace containerColor = MaterialTheme.colorScheme.primary with background
    content = re.sub(r'containerColor\s*=\s*MaterialTheme\.colorScheme\.primary,?', 'containerColor = MaterialTheme.colorScheme.background,', content)
    content = re.sub(r'titleContentColor\s*=\s*MaterialTheme\.colorScheme\.onPrimary,?', 'titleContentColor = MaterialTheme.colorScheme.onBackground,', content)
    content = re.sub(r'navigationIconContentColor\s*=\s*MaterialTheme\.colorScheme\.onPrimary,?', 'navigationIconContentColor = MaterialTheme.colorScheme.onBackground,', content)
    content = re.sub(r'actionIconContentColor\s*=\s*MaterialTheme\.colorScheme\.onPrimary,?', 'actionIconContentColor = MaterialTheme.colorScheme.onBackground,', content)

    # 3. Scaffold background (most were already standard, but just in case they used primary)
    # Most use MaterialTheme.colorScheme.background which is correct (it maps to #F8F9FC now)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for d in [screen_dir, components_dir]:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith(".kt"):
                process_file(os.path.join(root, file))

print("Global replacement complete.")
