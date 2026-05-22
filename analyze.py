#!/usr/bin/env python3
"""Analyze the chef-profile-page.ts to understand the string issue"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find lines around servicePhotosModal
lines = content.split(b'\n')
for i in range(224, 240):
    if i < len(lines):
        line = lines[i]
        print(f"Line {i+1}: {line[:100]}")
        # Count single quotes
        count = line.count(b'\'')
        print(f"  Single quotes: {count}")
        # Check for closing pattern
        if b"'" in line[-5:]:
            print(f"  Last 5 bytes: {line[-5:]}")