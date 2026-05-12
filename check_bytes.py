content = open("src/routes/chef-leads-page.ts","rb").read()
idx = content.find(b"noteIndicator + multiChefBadge")
b = content[idx:idx+150]
print("First 40 bytes hex:", b[:40].hex())
# Find all positions where we have backslash-quote pairs
positions = []
for i in range(len(b)-1):
    if b[i] == 92 and b[i+1] == 39:  # \\ and '
        positions.append(i)
print("Backslash-quote positions (of %d):" % len(b), positions[:10])
print("Total count:", len(positions))