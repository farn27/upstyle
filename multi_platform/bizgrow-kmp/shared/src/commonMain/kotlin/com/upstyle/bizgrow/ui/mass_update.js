const fs = require('fs');
const path = require('path');

const screenDir = 'E:\\upstyle\\multi_platform\\bizgrow-kmp\\shared\\src\\commonMain\\kotlin\\com\\upstyle\\bizgrow\\ui\\screens';
const componentDir = 'E:\\upstyle\\multi_platform\\bizgrow-kmp\\shared\\src\\commonMain\\kotlin\\com\\upstyle\\bizgrow\\ui\\components';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Radius Upgrade
    content = content.replace(/RoundedCornerShape\(\s*(12|14|16)\.dp\s*\)/g, 'RoundedCornerShape(20.dp)');
    content = content.replace(/RoundedCornerShape\(\s*8\.dp\s*\)/g, 'RoundedCornerShape(12.dp)');

    // App Bar fix
    content = content.replace(/containerColor\s*=\s*MaterialTheme\.colorScheme\.primary,?/g, 'containerColor = MaterialTheme.colorScheme.background,');
    content = content.replace(/titleContentColor\s*=\s*MaterialTheme\.colorScheme\.onPrimary,?/g, 'titleContentColor = MaterialTheme.colorScheme.onBackground,');
    content = content.replace(/navigationIconContentColor\s*=\s*MaterialTheme\.colorScheme\.onPrimary,?/g, 'navigationIconContentColor = MaterialTheme.colorScheme.onBackground,');

    fs.writeFileSync(filePath, content, 'utf8');
}

function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.kt')) {
            processFile(fullPath);
        }
    }
}

traverse(screenDir);
traverse(componentDir);
console.log('Mass UI update completed.');
