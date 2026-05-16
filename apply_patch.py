#!/usr/bin/env python3
"""Line-by-line patch for chef-leads-page.ts - MAI-1639"""
import sys

with open('src/routes/chef-leads-page.ts', 'r') as f:
    content = f.read()

changes = []

# 1. Add btn-info CSS after .btn-decline:disabled
old1 = "  html += '    .btn-decline:disabled { opacity: 0.5; cursor: not-allowed; }\\n';\n  html += '    .btn-whatsapp"
new1 = "  html += '    .btn-decline:disabled { opacity: 0.5; cursor: not-allowed; }\\n';\n  html += '    .btn-info { background: #1565c0; color: white; border: none; border-radius: 6px; padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.2s; min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; gap: 0.4rem; }\\n';\n  html += '    .btn-info:hover { background: #0d47a1; }\\n';\n  html += '    .btn-whatsapp"
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes.append("OK 1: btn-info CSS")
else:
    changes.append("FAIL 1: btn-info CSS")

# 2. Add leads-banner CSS after .toast.toast-success
old2 = "  html += '    .toast.toast-success { background: #27ae60; color: white; }\\n';\n  html += '    footer"
new2 = "  html += '    .toast.toast-success { background: #27ae60; color: white; }\\n';\n  html += '    .leads-banner { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 0.85rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(230,126,34,0.25); }\\n';\n  html += '    footer"
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes.append("OK 2: leads-banner CSS")
else:
    changes.append("FAIL 2: leads-banner CSS")

# 3. Add leadsBanner div after leadsList div
old3 = "  html += '<div id=\"leadsList\" class=\"leads-list\" style=\"display:none\"></div>\\n';\n  html += '<div id=\"staleAlertBanner\""
new3 = "  html += '<div id=\"leadsList\" class=\"leads-list\" style=\"display:none\"></div>\\n';\n  html += '<div id=\"leadsBanner\" class=\"leads-banner\" style=\"display:none\"></div>\\n';\n  html += '<div id=\"staleAlertBanner\""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes.append("OK 3: leadsBanner div")
else:
    changes.append("FAIL 3: leadsBanner div")

# 4. Add updateLeadsBanner and sendInfoTemplate after showToast
# Split into 3 lines to avoid long-line issues
old4 = "  html += '    function showToast(message, type) { var toast = document.getElementById(\\'toast\\'); toast.textContent = message; toast.className = \\'toast toast-\\' + type; toast.style.display = \\'block\\'; setTimeout(function() { toast.style.display = \\'none\\'; }, 3500); }\\n';\n  html += '    function openWhatsApp"
new4 = (
    "  html += '    function showToast(message, type) { var toast = document.getElementById(\\'toast\\'); toast.textContent = message; toast.className = \\'toast toast-\\' + type; toast.style.display = \\'block\\'; setTimeout(function() { toast.style.display = \\'none\\'; }, 3500); }\\n';\n"
    "  html += '    function updateLeadsBanner(leads) { var newLeads = leads.filter(function(l) { return l.status === \\'new\\'; }); var banner = document.getElementById(\\'leadsBanner\\'); if (newLeads.length > 0) { banner.innerHTML = \\'<span style=\"font-size:1.4rem;\">&#128231;</span><span>You have <strong>\\' + newLeads.length + \\'</strong> unresponded inquiry\\' + (newLeads.length !== 1 ? \\'s\\' : \\'\\') + \\' \\u2014 <a href=\"/chef/leads\" style=\"color:white;text-decoration:underline;font-weight:600;\">Respond Now \\u2192<\\/a><\\/span>\\'; banner.style.display = \\'flex\\'; } else { banner.style.display = \\'none\\'; } }\\n';\n"
    "  html += '    async function sendInfoTemplate(leadId) { var btn = document.querySelector(\\'.btn-info[onclick*=\"sendInfoTemplate(\\' + leadId + \\')\"]\\'); if (btn) { btn.disabled = true; btn.textContent = \\'...\\'; } var token = localStorage.getItem(\\'token\\'); var lead = currentLeads.find(function(l) { return l.id === leadId; }); var msg = \\'\\'; for (var i = 0; i < currentTemplates.length; i++) { if (currentTemplates[i].id === \\'more_info\\') { msg = interpolateTemplate(currentTemplates[i].text, lead || {}); break; } } try { var response = await fetch(API_BASE + \\'/api/chef/leads/\\' + leadId + \\'/respond\\', { method: \\'POST\\', headers: { \\'Authorization\\': \\'Bearer \\' + token, \\'Content-Type\\': \\'application/json\\' }, body: JSON.stringify({ message: msg }) }); if (!response.ok) { var err = await response.json(); showToast(\\'Failed to send. Try again.\\', \\'error\\'); if (btn) { btn.disabled = false; btn.textContent = \\'Info\\'; } return; } showToast(\\'Info request sent!\\', \\'success\\'); loadLeads(); } catch (err) { showToast(\\'Failed to send. Try again.\\', \\'error\\'); if (btn) { btn.disabled = false; btn.textContent = \\'Info\\'; } } }\\n';\n"
    "  html += '    function openWhatsApp"
)
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes.append("OK 4: updateLeadsBanner + sendInfoTemplate")
else:
    changes.append("FAIL 4: updateLeadsBanner + sendInfoTemplate")

# 5. Call updateLeadsBanner in loadLeads
old5 = "updateStats(leads); renderLeads(leads);"
new5 = "updateStats(leads); updateLeadsBanner(leads); renderLeads(leads);"
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes.append("OK 5: updateLeadsBanner call")
else:
    changes.append("FAIL 5: updateLeadsBanner call")

# 6. Add Info button between Accept and Decline in renderLeadCard
old6 = "title=\"Accept this lead\">Accept</button><button class=\"btn-decline\""
new6 = "title=\"Accept this lead\">Accept</button><button class=\"btn-info\" onclick=\"event.stopPropagation(); sendInfoTemplate(\\' + lead.id + \\')\" title=\"Request more info\">Info</button><button class=\"btn-decline\""
if old6 in content:
    content = content.replace(old6, new6, 1)
    changes.append("OK 6: Info button")
else:
    changes.append("FAIL 6: Info button")

with open('src/routes/chef-leads-page.ts', 'w') as f:
    f.write(content)

for c in changes:
    print(c)
print("Done.")