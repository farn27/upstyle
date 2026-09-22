const fs = require('fs');

const currentCode = fs.readFileSync('multi_platform/bizgrow-kmp/shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt', 'utf8');
const oldCode = fs.readFileSync('AppViewModel_ab30789.kt', 'utf8');

function extractFunctions(code) {
    const funcs = {};
    const pattern = /fun\s+([a-zA-Z0-9_]+)\([^)]*\)(?:\s*:\s*[a-zA-Z0-9_<>]+)?\s*=\s*viewModelScope\.launch\s*\{/g;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        const funcName = match[1];
        const start = match.index + match[0].length - 1; // start at {
        let braceCount = 0;
        let end = -1;
        let inString = false;
        let escape = false;
        for (let i = start; i < code.length; i++) {
            const c = code[i];
            if (escape) { escape = false; continue; }
            if (c === '\\\\') { escape = true; continue; }
            if (c === '"') { inString = !inString; continue; }
            if (!inString) {
                if (c === '{') braceCount++;
                else if (c === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        end = i + 1;
                        break;
                    }
                }
            }
        }
        if (end !== -1) {
            funcs[funcName] = code.substring(match.index, end);
        }
    }
    return funcs;
}

const oldFuncs = extractFunctions(oldCode);

const stubPattern = /^([ \t]*)fun\s+([a-zA-Z0-9_]+)\([^)]*\)(?:\s*:\s*[a-zA-Z0-9_<>]+)?\s*=\s*viewModelScope\.launch\s*\{\s*\}/gm;

let replacedCount = 0;
const mergedCode = currentCode.replace(stubPattern, (match, indent, funcName) => {
    if (oldFuncs[funcName]) {
        replacedCount++;
        // prefix the old body with the correct indent
        let body = oldFuncs[funcName];
        // The oldFuncs body starts with "fun ... = viewModelScope.launch {" without leading spaces.
        // We need to add indent to every line of body.
        body = body.split('\n').map((line, i) => i === 0 ? indent + line : line).join('\n');
        return body;
    } else {
        console.log("Warning: stub for " + funcName + " not found in old code");
        return match;
    }
});

fs.writeFileSync('multi_platform/bizgrow-kmp/shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt', mergedCode);
console.log("Merge complete. Replaced " + replacedCount + " stubs.");
