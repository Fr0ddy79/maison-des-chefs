content = open("src/routes/chef-leads-page.ts","rb").read()

# Fix: add ageBadge before </div> in the lead-card-header output
# noteIndicator + multiChefBadge + '</div>' + '<div class="lead-service"
old_chain = b"noteIndicator + multiChefBadge + \\'</div>\\' + \\'<div class=\"lead-service"
new_chain = b"noteIndicator + multiChefBadge + ageBadge + \\'</div>\\' + \\'<div class=\"lead-service"
print("Fix 1 (ageBadge in chain):", old_chain in content)
if old_chain in content:
    content = content.replace(old_chain, new_chain)
    print("Fixed!")

# Add CSS for lead-age-badge and urgency classes
# Find .note-indicator svg CSS and add after it
old_css = b".note-indicator svg { width: 12px; height: 12px; }\\n';"
new_css = b".note-indicator svg { width: 12px; height: 12px; }\\n';  html += '    .lead-age-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem; white-space: nowrap; }\\n';  html += '    .urgency-green { background: #dcfce7; color: #15803d; }\\n';  html += '    .urgency-yellow { background: #fef3c7; color: #b45309; }\\n';  html += '    .urgency-red { background: #fee2e2; color: #dc2626; }\\n';"
print("Fix 2 (CSS):", old_css in content)
if old_css in content:
    content = content.replace(old_css, new_css)
    print("Fixed!")

with open("src/routes/chef-leads-page.ts","wb") as f:
    f.write(content)
print("Done")