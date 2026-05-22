#!/usr/bin/env python3
"""Fix the broken string literals in lines 226-234"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    lines = f.readlines()

# Lines 226-234 (0-indexed: 225-233) have broken escaping
# These lines are missing the proper closing sequences

# The correct lines should be:
correct_lines = [
    b"  html += '      html += \\'<div id=\"servicePhotosModal\" class=\"modal\" style=\"display:none;\">\\';\n",
    b"  html += '        html += \\'<div class=\"modal-content\">\\';\n",
    b"  html += '          html += \\'<div class=\"modal-header\">\\';\n",
    b"  html += '            html += \\'<h3>Service Photos</h3>\\';\n",
    b"  html += '            html += \\'<button class=\"modal-close\" onclick=\"closeServicePhotosModal()\">&times;</button>\\';\n",
    b"  html += '          html += \\'</div>\\';\n",
    b"  html += '          html += \\'<div id=\"servicePhotosContent\"></div>\\';\n",
    b"  html += '        html += \\'</div>\\';\n",
    b"  html += '      html += \\'</div>\\';\n",
]

# Replace lines 225-233 (0-indexed)
for i, correct in enumerate(correct_lines):
    lines[225 + i] = correct

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.writelines(lines)

print("Fixed lines 226-234")