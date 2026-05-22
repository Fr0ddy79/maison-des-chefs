#!/usr/bin/env python3
import os

# Read the file
with open('src/routes/chef-leads-page.ts', 'rb') as f:
    content = f.read()

lines = content.split(b'\n')
line = bytearray(lines[181])

# Fix 1: indexOf issue
# Replace bytes 261-268 with: ) + space + === + space + 0 + )
replacement1 = bytes([0x29, 0x20, 0x3d, 0x3d, 0x3d, 0x20, 0x30, 0x29])
line[261:269] = replacement1
print("Fix 1 applied (indexOf)")

# Fix 2: Insert newline between getStaleLeadCount and var filter
search = b"return 0; });"
idx2 = line.find(search)
insert_pos = idx2 + len(search)
print("Found 'return 0; });' at", idx2, ", will insert at", insert_pos)

insert_bytes = b"' + \"\\n\" + '    "
after = bytes(line[insert_pos:])
line = bytes(line[:insert_pos]) + insert_bytes + after
print("Fix 2 applied (newline insertion)")

lines[181] = bytes(line)
with open('src/routes/chef-leads-page.ts', 'wb') as f:
    f.write(b'\n'.join(lines))
print("Written!")

# Verify
with open('src/routes/chef-leads-page.ts', 'r') as f:
    content = f.read()
lines2 = content.split('\n')
l182 = lines2[181]
idx3 = l182.find("indexOf")
print("\nindexOf context:", repr(l182[idx3:idx3+40]))
idx4 = l182.find("var filter")
print("var filter context:", repr(l182[idx4-30:idx4+30]))