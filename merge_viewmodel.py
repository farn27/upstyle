import re

with open('multi_platform/bizgrow-kmp/shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt', 'r') as f:
    current_code = f.read()

with open('AppViewModel_ab30789.kt', 'r') as f:
    old_code = f.read()

# Find all functions in old_code
def extract_functions(code):
    funcs = {}
    pattern = re.compile(r'^\s*fun\s+([a-zA-Z0-9_]+)\([^)]*\)(?:\s*:\s*[a-zA-Z0-9_<>]+)?\s*=\s*viewModelScope\.launch\s*\{', re.MULTILINE)
    for match in pattern.finditer(code):
        func_name = match.group(1)
        start = match.end() - 1 # start at {
        brace_count = 0
        end = -1
        in_string = False
        escape = False
        for i in range(start, len(code)):
            c = code[i]
            if escape:
                escape = False
                continue
            if c == '\\':
                escape = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if not in_string:
                if c == '{':
                    brace_count += 1
                elif c == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break
        if end != -1:
            funcs[func_name] = code[match.start():end]
    return funcs

old_funcs = extract_functions(old_code)

# Now find all stubs in current_code and replace them
pattern_stub = re.compile(r'^(\s*)fun\s+([a-zA-Z0-9_]+)\([^)]*\)\s*=\s*viewModelScope\.launch\s*\{\s*\}', re.MULTILINE)

def replace_stub(match):
    indent = match.group(1)
    func_name = match.group(2)
    if func_name in old_funcs:
        # replace with old_funcs[func_name]
        body = old_funcs[func_name]
        # adjust indentation slightly if needed, but it's probably fine
        return body
    else:
        print(f"Warning: stub for {func_name} not found in old code")
        return match.group(0)

merged_code = pattern_stub.sub(replace_stub, current_code)

with open('multi_platform/bizgrow-kmp/shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt', 'w') as f:
    f.write(merged_code)

print("Merge complete")
