content = open("src/routes/chef-leads-page.ts","rb").read()
idx = content.find(b"noteIndicator + multiChefBadge")
chunk = content[idx:idx+200]

# Find position of the </div> in the context
div_pos = chunk.find(b"</div>")
print("</div> position in chunk:", div_pos)
if div_pos >= 0:
    print("Before:</div>:", repr(chunk[:div_pos+6]))
else:
    print("</div> NOT found directly")
    
# Now find the exact pattern to replace
# noteIndicator + multiChefBadge + \'</div>\' + \'<div class="lead-service
target = b"noteIndicator + multiChefBadge + \\'</div>\\' + \\'<div class=\"lead-service"
print("Target pattern in content:", target in content)

# If not found, let's find what we actually have
# noteIndicator + multiChefBadge + '  (with escaped quote before div)
idx2 = content.find(b"noteIndicator + multiChefBadge + \\'")
print("Escaped quote version at:", idx2)
if idx2 >= 0:
    print("Context:", repr(content[idx2:idx2+120]))