#!/usr/bin/env python3
"""Add 'Manage Photos' button to experience items in chef-profile-page.ts"""
import sys

with open('src/routes/chef-profile-page.ts', 'r') as f:
    content = f.read()

# Part 1 already done if we got here - the button was added
# Just need to add CSS for manage-photos-btn

# The CSS for manage-photos-btn - need to find after service-photo styles
old_css = "    html += '    .manage-photos-btn:hover { background: #5a6268; }\\n';"
new_css = """    html += '    .manage-photos-btn { background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }\\n';
    html += '    .manage-photos-btn:hover { background: #5a6268; }\\n';"""

if old_css in content:
    print("CSS already added!")
else:
    # Try to find the signature-dishes-section to insert before it
    old_css2 = "    html += '    .signature-dishes-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; }\\n';"
    new_css2 = """    html += '    .manage-photos-btn { background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }\\n';
    html += '    .manage-photos-btn:hover { background: #5a6268; }\\n';
    html += '    .signature-dishes-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; }\\n';"""
    
    if old_css2 not in content:
        print("FAILED: Could not find CSS insertion point")
        sys.exit(1)
    
    content = content.replace(old_css2, new_css2, 1)
    print("Part 2: Added CSS for manage-photos-btn")

with open('src/routes/chef-profile-page.ts', 'w') as f:
    f.write(content)

print("SUCCESS")
sys.exit(0)