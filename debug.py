#!/usr/bin/env python3
"""Debug script to find the exact pattern in chef-profile-page.ts"""
import sys

with open('src/routes/chef-profile-page.ts', 'r') as f:
    content = f.read()

# Find toggle-slider"></span>
idx = content.find('toggle-slider')
if idx == -1:
    print("toggle-slider NOT FOUND")
    sys.exit(1)

print(f"toggle-slider found at index {idx}")
print("Context around it:")
# Find the line containing it in the JS function (not CSS definition)
# Look for the pattern with </span> after it
search = 'toggle-slider"></span>'
idx2 = content.find(search)
if idx2 == -1:
    print("toggle-slider</span> NOT FOUND either")
else:
    print(f"toggle-slider</span> found at {idx2}")
    print("Context:", repr(content[idx2:idx2+200]))