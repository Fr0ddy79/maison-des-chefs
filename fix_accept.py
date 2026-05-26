with open('src/routes/chef-leads-page.ts', 'r') as f:
    content = f.read()

# Fix unescaped single quotes in the toastMsg string - they need to be \'
old_toast = "var toastMsg = quotedAmount ? 'Lead accepted! Quote of $' + quotedAmount + ' sent to diner.' : 'Lead accepted! Quote sent to diner.'"
new_toast = "var toastMsg = quotedAmount ? \\'Lead accepted! Quote of $\\' + quotedAmount + \\' sent to diner.\\' : \\'Lead accepted! Quote sent to diner.\\'"

if old_toast in content:
    content = content.replace(old_toast, new_toast)
    with open('src/routes/chef-leads-page.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
    # Search for what we have instead
    idx = content.find("var toastMsg")
    if idx >= 0:
        print("Found var toastMsg at", idx)
        print(repr(content[idx:idx+150]))