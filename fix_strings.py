#!/usr/bin/env python3
"""Fix the unterminated string literals in chef-profile-page.ts"""
with open('src/routes/chef-profile-page.ts', 'r') as f:
    content = f.read()

# The problem lines are 226-234 - they're missing the \' escape for inner quotes
# They have: html += '      html += \'<div... but should have html += \'      html += \\'<div

# Find and fix the broken section
old_section = """  html += '      html += \\'<div id="servicePhotosModal" class="modal" style="display:none;">\\';
  html += \\'        html += \\'<div class="modal-content">\\';
  html += \\'          html += \\'<div class="modal-header">\\';
  html += \\'            html += \\'<h3>Service Photos</h3>\\';
  html += \\'            html += \\'<button class="modal-close" onclick="closeServicePhotosModal()">&times;</button>\\';
  html += \\'          html += \\'</div>\\';
  html += \\'          html += \\'<div id="servicePhotosContent"></div>\\';
  html += \\'        html += \\'</div>\\';
  html += \\'      html += \\'</div>\\';"""

# But the current broken content has different escaping
# Let's find the pattern and fix it

# The broken pattern is lines that start with:
#   html += '      html += \'<div id="servicePhotosModal"... (WRONG - missing \' before html)
# Should be:
#   html += '      html += \\'<div id="servicePhotosModal"... (RIGHT)

# Let's just replace all occurrences where we have \'<div but should have \\'<div
# Pattern: html += '      html += \'<  -> html += '      html += \\'<

# More specifically, the pattern 'html += \\'  (escaped backslash at start) should become '' (empty string at that position)... wait no

# Actually looking at the file:
# The file uses: html += '      document.getElementById(\'profileContent\').innerHTML = html;\n';
# So \' is used to escape the single quote in the string

# The broken lines look like: html += '      html += \'<div id="servicePhotosModal"... but the \' is not properly doubled

# Let me fix by finding the actual broken text
import re

# Find lines 226-234 with the broken escaping
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'servicePhotosModal' in line or 'servicePhotosContent' in line or 'modal-content' in line or 'modal-header' in line:
        print(f"Line {i+1}: {repr(line)}")