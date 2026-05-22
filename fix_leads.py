content = open('src/routes/chef-leads-page.ts', 'r').read()
lines = content.split('\n')
line = lines[181]

idx = line.find("indexOf")
snippet = line[idx:idx+50]
print("Source line 182 snippet from indexOf:")
print(repr(snippet))

# The issue: the extracted JS shows indexOf('Hi ' === 0) {
# But the source has indexOf(\'Hi \' === 0) {
# Let me count parens in the source snippet

# Actually, in the source, the string is: indexOf(\'Hi \' === 0)
# That is: indexOf( 'Hi ' === 0 )
# So the closing ) should be after the 0

# But wait - the source line might have TWO parens: one for indexOf and one for the if statement!
# Let me look at the structure: if (... && ...indexOf(\'Hi \' === 0)) {
# The indexOf is inside an if condition, so it has its own closing paren
# Then the if itself has a closing paren

# Let me check what the extracted JS looks like at the same position
extracted = open('/tmp/extracted.js', 'r').read()
extracted_lines = extracted.split('\n')
l19 = extracted_lines[18]

idx2 = l19.find("indexOf")
snippet2 = l19[idx2:idx2+50]
print("\nExtracted JS snippet from indexOf:")
print(repr(snippet2))