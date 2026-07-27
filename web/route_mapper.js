import fs from 'fs';
import path from 'path';

const routesDir = 'e:\\upstyle\\web\\src\\routes';

function analyzeRoutes(baseDir) {
    const routes = [];
    
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const svelteFiles = entries.filter(e => e.isFile() && e.name.startsWith('+')).map(e => e.name);
        
        if (svelteFiles.length > 0) {
            let relPath = path.relative(baseDir, dir).replace(/\\/g, '/');
            relPath = relPath ? '/' + relPath : '/';
            
            const methods = [];
            const params = [...relPath.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
            
            for (const sf of svelteFiles) {
                if (sf.endsWith('.server.js') || sf === '+server.js') {
                    try {
                        const content = fs.readFileSync(path.join(dir, sf), 'utf-8');
                        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
                            const re = new RegExp(`export\\s+(?:const|async\\s+function)\\s+${method}\\b`);
                            if (re.test(content) && !methods.includes(method)) methods.push(method);
                        }
                        if (/export\s+const\s+actions\s*=/.test(content) && !methods.includes('ACTIONS')) {
                            methods.push('ACTIONS');
                        }
                    } catch {}
                }
            }
            
            routes.push({ route: relPath, files: svelteFiles, methods, params });
        }
        
        for (const e of entries) {
            if (e.isDirectory()) walk(path.join(dir, e.name));
        }
    }
    
    walk(baseDir);
    return routes;
}

const routes = analyzeRoutes(routesDir);
routes.sort((a, b) => a.route.localeCompare(b.route));

let md = `# Peta Rute Lengkap Bizgrow\n\nTotal: **${routes.length}** rute ditemukan\n\n`;

const groups = {};
for (const r of routes) {
    const parts = r.route.replace(/^\//, '').split('/');
    const section = parts[0] || 'root';
    if (!groups[section]) groups[section] = [];
    groups[section].push(r);
}

for (const [section, rts] of Object.entries(groups)) {
    md += `## 📁 ${section}/ (${rts.length} rute)\n\n`;
    md += '| Rute | Files | Methods | Params |\n';
    md += '|------|-------|---------|--------|\n';
    for (const r of rts) {
        md += `| \`${r.route}\` | ${r.files.join(', ')} | ${r.methods.length ? r.methods.join(', ') : 'GET'} | ${r.params.length ? r.params.join(', ') : '-'} |\n`;
    }
    md += '\n';
}

const outPath = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\5f416b9e-0515-4121-9f8c-e1336fca825a\\scratch\\exhaustive_route_map.md';
fs.writeFileSync(outPath, md, 'utf-8');
console.log(`Route map written with ${routes.length} routes.`);
