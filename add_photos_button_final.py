#!/usr/bin/env python3
"""Add Photos button to each service in renderExperiences"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find 'html += pubLabel;' and add Photos button after it
search = b'html += pubLabel;'
idx = content.find(search)
if idx == -1:
    print('ERROR: Could not find html += pubLabel;')
    exit(1)

print(f'Found html += pubLabel; at byte {idx}')

# Insert after this
insert_point = idx + len(search)

# Photos button HTML - properly escaped
# We want: html += '<button class="manage-photos-btn" onclick="openServicePhotosModal(' + s.id + ')">Photos</button>';
photos_btn = b"html += '<button class=\"manage-photos-btn\" onclick=\"openServicePhotosModal(' + s.id + ')\">Photos</button>';"

new_content = content[:insert_point] + photos_btn + content[insert_point:]

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(new_content)
print(f'Inserted Photos button ({len(photos_btn)} bytes)')