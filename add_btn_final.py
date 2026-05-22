#!/usr/bin/env python3
"""Add Photos button to renderExperiences"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find 'html += pubLabel;'
search = b'html += pubLabel;'
idx = content.find(search)
if idx == -1:
    print("ERROR: Pattern not found")
    exit(1)

print(f"Found at byte {idx}")

# Insert after pubLabel; but before the next html +=
# pubLabel; is 13 bytes, so insert at idx + 13
insert_point = idx + 13

# Photos button: html += \'<button class="manage-photos-btn" onclick="openServicePhotosModal(\' + s.id + \')">Photos</button>\';
# In the file, this appears as: html += '<button class="manage-photos-btn" onclick="openServicePhotosModal(' + s.id + ')">Photos</button>';
# The single quotes inside are escaped with \'
photos_btn = b" html += '<button class=\"manage-photos-btn\" onclick=\"openServicePhotosModal(' + s.id + ')\">Photos</button>';"

new_content = content[:insert_point] + photos_btn + content[insert_point:]

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(new_content)

print(f"Inserted {len(photos_btn)} bytes")
print("Done")