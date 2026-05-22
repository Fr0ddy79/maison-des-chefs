#!/usr/bin/env python3
"""Add Photos button to chef-profile-page.ts"""
import sys

with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# The exact bytes from the file
idx = content.find(b'toggle-slider"></span>')
if idx == -1:
    print("toggle-slider not found")
    sys.exit(1)

# Find the sequence with </div></li>;
start = idx
end = content.find(b"';", content.find(b'</div></li>', start)) + 3
old_bytes = content[start:end]
print("Old bytes:")
print(old_bytes)

# New bytes with Photos button added
new_bytes = old_bytes.replace(
    b'</div></li>',
    b'</div></li>; html += \'<button class="manage-photos-btn" onclick="openServicePhotosModal(\\\' + s.id + \\\')">Photos</button>'
).replace(b"';", b"';", 1)  # Replace first occurrence of '; to be after our new button

# Actually let me construct it properly
new_bytes = b'toggle-slider"></span>\\\'; html += \\\'</label>\\\'; html += \\\'</div></li>; html += \\\'<button class="manage-photos-btn" onclick="openServicePhotosModal(\\\' + s.id + \\\')">Photos</button>\\\';'

if old_bytes not in content:
    print("FAILED: Could not find exact pattern")
    sys.exit(1)

content = content.replace(old_bytes, new_bytes, 1)
print("Part 1: Added Photos button")

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(content)

print("SUCCESS")