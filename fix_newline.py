#!/usr/bin/env python3
# Read as text to do the string insertion
with open('src/routes/chef-leads-page.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')
l183 = lines[182]

# Find 'return 0; });' and insert the newline concatenation
search = "return 0; });"
idx = l183.find(search)
print("Found 'return 0; });' at position", idx)

if idx < 0:
    print("Pattern not found!")
    exit(1)

# Insert ' + "\n" + '    after the semicolon
insert_after = idx + len(search)  # Position right after 'return 0; });'
new_content = l183[:insert_after] + "' + \"\\n\" + '    " + l183[insert_after:]
lines[182] = new_content

with open('src/routes/chef-leads-page.ts', 'w') as f:
    f.write('\n'.join(lines))

print("Done!")
print("Context around var filter:", repr(lines[182][idx-10:idx+80]))