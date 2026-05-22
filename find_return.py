#!/usr/bin/env python3
content = open('src/routes/chef-leads-page.ts', 'rb').read()
lines = content.split(b'\n')
line = lines[181]

idx = line.find(b'return 0')
print('return 0 at:', idx)

idx2 = line.find(b'return 0; }')
print('return 0; } at:', idx2)

if idx2 >= 0:
    print('Context:', line[idx2:idx2+30])
else:
    # Try different pattern - maybe there's a newline issue
    idx3 = line.find(b'return 0;')
    print('return 0; at:', idx3)