#!/usr/bin/env python3
import os

# Read the file
with open('src/routes/chef-leads-page.ts', 'rb') as f:
    content = f.read()

lines = content.split(b'\n')
line = bytearray(lines[181])

# Find indexOf
idx = line.find(b'indexOf')
ts = line.find(b'===', idx)

print(f"indexOf at: {idx}, === at: {ts}")

# Current bytes at 261-267: [space][===][space][0][)]
# Bytes 261-267: 20, 3d, 3d, 3d, 20, 30, 29
# Target bytes 261-268: [)][space][===][space][0][)]
# Bytes 261-268: 29, 20, 3d, 3d, 3d, 20, 30, 29

replacement = bytes([0x29, 0x20, 0x3d, 0x3d, 0x3d, 0x20, 0x30, 0x29])

# Check current values before replacement
print(f"\nBefore replacement:")
for i in range(261, 269):
    print(f"  byte {i}: {hex(line[i])}")

# Do the replacement
line[261:269] = replacement

print(f"\nAfter replacement:")
for i in range(261, 270):
    print(f"  byte {i}: {hex(line[i])}")

# Write back
lines[181] = bytes(line)
with open('src/routes/chef-leads-page.ts', 'wb') as f:
    f.write(b'\n'.join(lines))

print("\nWritten!")

# Verify
with open('src/routes/chef-leads-page.ts', 'r') as f:
    content = f.read()
lines = content.split('\n')
l182 = lines[181]
idx2 = l182.find("indexOf")
print("\nNew context:", repr(l182[idx2:idx2+40]))