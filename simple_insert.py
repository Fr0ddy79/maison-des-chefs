#!/usr/bin/env python3
"""Simple test - insert modal HTML after experiencesContainer"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Find the experiencesContainer div line
# Looking for: html += '      html += \'<div id="experiencesContainer"></div>\';\n';
search = b"html += '      html += \\'<div id=\"experiencesContainer\"></div>\\';\n"
idx = content.find(search)
if idx == -1:
    print("ERROR: Could not find experiencesContainer pattern")
    # Let's see what we have
    idx = content.find(b'experiencesContainer')
    if idx != -1:
        print(f"Found experiencesContainer at byte {idx}")
        print(f"Context: {content[idx-50:idx+100]}")
    exit(1)

print(f"Found experiencesContainer div at byte {idx}")
print(f"Line: {content[idx:idx+80]}")

# The line ends at idx + search length
end_line = idx + len(search) - 1  # -1 to not include the \n

# What we want to insert after experiencesContainer div
# These are 9 lines of HTML for the modal
# We want to insert BEFORE the innerHTML assignment
# The innerHTML assignment comes after experiencesContainer

# Find innerHTML assignment
innerHTML_search = b"document.getElementById('profileContent').innerHTML = html;"
inner_idx = content.find(innerHTML_search)
if inner_idx == -1:
    print("ERROR: Could not find innerHTML assignment")
    exit(1)

print(f"Found innerHTML at byte {inner_idx}")

# The experiencesContainer line ends at the newline after it
# So experiencesContainer is at idx to idx+len(search)-1, and search includes the \n
# So content[idx+len(search)] is the character AFTER the \n (which is the start of the next line - innerHTML)

# We want to insert our 9 lines between experiencesContainer and innerHTML
# So we insert at idx+len(search) (after the \n of experiencesContainer line)

insert_point = idx + len(search)  # After the \n of experiencesContainer line

# Our modal lines (as bytes)
# Each line is: html += '      html += \'<div...>\';\n
# In bytes with proper escaping for TypeScript: html += '      html += \\'<div...>\\';\n
# Note: \\ in Python bytes becomes \ in the file, which is \' in TypeScript

modal_lines = [
    b"  html += '      html += \\'<div id=\"servicePhotosModal\" class=\"modal\" style=\"display:none;\">';\n",
    b"  html += '        html += \\'<div class=\"modal-content\">';\n",
    b"  html += '          html += \\'<div class=\"modal-header\">';\n",
    b"  html += '            html += \\'<h3>Service Photos</h3>';\n",
    b"  html += '            html += \\'<button onclick=\"closeServicePhotosModal()\">&times;</button>';\n",
    b"  html += '          html += \\'</div>';\n",
    b"  html += '          html += \\'<div id=\"servicePhotosContent\"></div>';\n",
    b"  html += '        html += \\'</div>';\n",
    b"  html += '      html += \\'</div>';\n",
]

# Build the insertion
insertion = b"".join(modal_lines)

# New content
new_content = content[:insert_point] + insertion + content[insert_point:]

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(new_content)

print(f"Inserted {len(modal_lines)} modal lines")
print(f"Insert point: byte {insert_point}")