#!/usr/bin/env python3
"""Add Photos button to renderExperiences function"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find html += pubLabel;
search = b'html += pubLabel;'
idx = content.find(search)
if idx == -1:
    print('ERROR: Could not find html += pubLabel;')
    exit(1)

print(f'Found html += pubLabel; at byte {idx}')

# Photos button HTML - properly escaped TypeScript string
# We want: html += '<button class="manage-photos-btn" onclick="openServicePhotosModal(' + s.id + ')">Photos</button>';
# As bytes with proper \' escaping:

photos_btn = b"html += '<button class=\"manage-photos-btn\" onclick=\"openServicePhotosModal(' + s.id + ')\">Photos</button>';"

# Insert after html += pubLabel;
insert_point = idx + len(search)
new_content = content[:insert_point] + photos_btn + content[insert_point:]

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(new_content)

print('Added Photos button')