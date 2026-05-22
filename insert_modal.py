#!/usr/bin/env python3
"""Add modal HTML to chef-profile-page.ts using line insertion"""
with open('src/routes/chef-profile-page.ts', 'r') as f:
    lines = f.readlines()

# Find the line with experiencesContainer (the div)
target_line = None
for i, line in enumerate(lines):
    if '<div id="experiencesContainer"' in line:
        target_line = i
        break

if target_line is None:
    print("FAILED: Could not find experiencesContainer div line")
    exit(1)

print(f"Found experiencesContainer div at line {target_line + 1}")

# Find the document.getElementById line after it - using raw string in file
doc_line = None
for i in range(target_line + 1, min(target_line + 5, len(lines))):
    if "\\'profileContent\\'" in lines[i] and "innerHTML = html" in lines[i]:
        doc_line = i
        break

if doc_line is None:
    print("FAILED: Could not find document.getElementById line")
    # Debug
    for i in range(target_line + 1, min(target_line + 5, len(lines))):
        print(f"Line {i+1}: {repr(lines[i][:100])}")
    exit(1)

print(f"Found document.getElementById at line {doc_line + 1}")

# The new lines to insert (properly escaped TypeScript strings)
new_lines = [
    "  html += '      html += \\'<div id=\"servicePhotosModal\" class=\"modal\" style=\"display:none;\">\\';\n",
    "  html += '        html += \\'<div class=\"modal-content\">\\';\n",
    "  html += '          html += \\'<div class=\"modal-header\">\\';\n",
    "  html += '            html += \\'<h3>Service Photos</h3>\\';\n",
    "  html += '            html += \\'<button class=\"modal-close\" onclick=\"closeServicePhotosModal()\">&times;</button>\\';\n",
    "  html += '          html += \\'</div>\\';\n",
    "  html += '          html += \\'<div id=\"servicePhotosContent\"></div>\\';\n",
    "  html += '        html += \\'</div>\\';\n",
    "  html += '      html += \\'</div>\\';\n",
]

# Insert after doc_line (index)
for i, new_line in enumerate(new_lines):
    lines.insert(doc_line + 1 + i, new_line)

with open('src/routes/chef-profile-page.ts', 'w') as f:
    f.writelines(lines)

print(f"SUCCESS: Inserted {len(new_lines)} lines")