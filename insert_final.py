#!/usr/bin/env python3
"""Insert modal HTML with correct escaping"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find experiencesContainer div
idx = content.find(b'experiencesContainer')
if idx == -1:
    print("ERROR: Could not find experiencesContainer")
    exit(1)

# Find end of that line
end_idx = content.find(b'\n', idx)
if end_idx == -1:
    print("ERROR: Could not find newline after experiencesContainer")
    exit(1)

# The modal HTML - using raw string literals to avoid Python escaping issues
# Each line: "  html += '      html += \\'<div...>\\';\n"  
# In bytes: 5c 27 = \' (escaped single quote in TypeScript string)

modal = (
    b"  html += '      html += \\\\'<div id=\"servicePhotosModal\" class=\"modal\" style=\"display:none;\">';\n"
    b"  html += '        html += \\\\'<div class=\"modal-content\">';\n"
    b"  html += '          html += \\\\'<div class=\"modal-header\">';\n"
    b"  html += '            html += \\\\'<h3>Service Photos</h3>';\n"
    b"  html += '            html += \\\\'<button onclick=\"closeServicePhotosModal()\">&times;</button>';\n"
    b"  html += '          html += \\\\'</div>';\n"
    b"  html += '          html += \\\\'<div id=\"servicePhotosContent\"></div>';\n"
    b"  html += '        html += \\\\'</div>';\n"
    b"  html += '      html += \\\\'</div>';\n"
)

# Insert after experiencesContainer line (which ends at end_idx, before the \n)
# So we insert at end_idx + 1 (after the \n)
new_content = content[:end_idx+1] + modal + content[end_idx+1:]

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(new_content)

print("Inserted modal HTML")