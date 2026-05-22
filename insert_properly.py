#!/usr/bin/env python3
"""Insert modal HTML after experiencesContainer div"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    lines = f.readlines()

# Find the line with experiencesContainer div (should be around line 215)
target_idx = None
for i, line in enumerate(lines):
    if b'experiencesContainer' in line and b'<div id=' in line:
        target_idx = i
        break

if target_idx is None:
    print("ERROR: Could not find experiencesContainer div")
    exit(1)

print(f"Found experiencesContainer div at line {target_idx + 1}")

# The modal HTML lines to insert AFTER the experiencesContainer div (but before innerHTML)
# These become part of the html string that gets assigned to innerHTML
# We need to insert between experiencesContainer and the innerHTML assignment

modal_lines = [
    b"  html += '      html += \\'<div id=\"servicePhotosModal\" class=\"modal\" style=\"display:none;\">\\';\n",
    b"  html += '        html += \\'<div class=\"modal-content\">\\';\n",
    b"  html += '          html += \\'<div class=\"modal-header\">\\';\n",
    b"  html += '            html += \\'<h3>Service Photos</h3>\\';\n",
    b"  html += '            html += \\'<button onclick=\"closeServicePhotosModal()\">&times;</button>\\';\n",
    b"  html += '          html += \\'</div>\\';\n",
    b"  html += '          html += \\'<div id=\"servicePhotosContent\"></div>\\';\n",
    b"  html += '        html += \\'</div>\\';\n",
    b"  html += '      html += \\'</div>\\';\n",
]

# Insert after target_idx (after experiencesContainer div)
for i, new_line in enumerate(modal_lines):
    lines.insert(target_idx + 1 + i, new_line)

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.writelines(lines)

print(f"Inserted {len(modal_lines)} modal HTML lines after line {target_idx + 1}")