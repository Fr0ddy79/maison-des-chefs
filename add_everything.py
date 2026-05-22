#!/usr/bin/env python3
"""Insert modal HTML and JS functions"""
with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# 1. Insert modal HTML after experiencesContainer div
search = b'experiencesContainer'
idx = content.find(search)
if idx == -1:
    print('ERROR: Could not find experiencesContainer')
    exit(1)

newline_idx = content.find(b'\n', idx)
insert_point = newline_idx + 1

# Modal HTML - each line uses \\\\' to escape the single quote in the TypeScript string
# The pattern is: html += '      html += \\'<div...>\\';\n
modal_lines = [
    b"  html += '      html += \\\\\\'<div id=\"servicePhotosModal\" style=\"display:none;\">';\n",
    b"  html += '        html += \\\\\\'<h3>Service Photos</h3>';\n",
    b"  html += '        html += \\\\\\'<button onclick=\"closeServicePhotosModal()\">&times;</button>';\n",
    b"  html += '        html += \\\\\\'<div id=\"servicePhotosContent\"></div>';\n",
    b"  html += '      html += \\\\\\'</div>';\n",
]
modal = b"".join(modal_lines)

content = content[:insert_point] + modal + content[insert_point:]
print(f"Inserted {len(modal)} bytes of modal HTML")

# 2. Insert JS functions before loadChefExperiences
search2 = b'async function loadChefExperiences'
idx2 = content.find(search2)
if idx2 == -1:
    print('ERROR: Could not find loadChefExperiences')
    exit(1)

newline_idx2 = content.rfind(b'\n', 0, idx2)
insert_point2 = newline_idx2 + 1

# JS functions
js_funcs = b"""  html += '    var currentServiceId = null;';
  html += '    function openServicePhotosModal(serviceId) { currentServiceId = serviceId; var modal = document.getElementById(\\'servicePhotosModal\\'); var content = document.getElementById(\\'servicePhotosContent\\'); if (!modal || !content) return; content.innerHTML = \\'<p>Loading...</p>\\'; modal.style.display = \\'block\\'; loadServicePhotos(serviceId); }';
  html += '    function closeServicePhotosModal() { var modal = document.getElementById(\\'servicePhotosModal\\'); if (modal) modal.style.display = \\'none\\'; currentServiceId = null; }';
  html += '    async function loadServicePhotos(serviceId) { try { var token = localStorage.getItem(\\'token\\'); var response = await fetch(API_BASE + \\'/api/services/\\' + serviceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } }); if (!response.ok) { document.getElementById(\\'servicePhotosContent\\').innerHTML = \\'<p>Failed to load photos</p>\\'; return; } var service = await response.json(); var photos = JSON.parse(service.photos || \\'[]\\'); renderServicePhotosModal(photos); } catch (err) { console.error(\\'Error loading service photos:\\', err); document.getElementById(\\'servicePhotosContent\\').innerHTML = \\'<p>Failed to load photos</p>\\'; } }';
  html += '    function renderServicePhotosModal(photos) { var content = document.getElementById(\\'servicePhotosContent\\'); if (!content) return; var html = \\'\\'; if (photos.length === 0) { html += \\'<p class=\"no-service-photos\">No photos yet. Add your first photo below.</p>\\'; } else { html += \\'<div>\\'; photos.forEach(function(photo, idx) { html += \\'<div class=\"service-photo-item\"><img src=\"\\' + photo + \\'\" alt=\"Photo \\' + (idx+1) + \\'\"><button class=\"service-photo-delete\" onclick=\"deleteServicePhoto(\\' + idx + \\')\">&times;</button></div>\\'; }); html += \\'</div>\\'; } if (photos.length < 6) { html += \\'<label class=\"service-photo-upload\"><input type=\"file\" accept=\"image/jpeg,image/png\" onchange=\"handleServicePhotoSelect(this)\"><div class=\"service-photo-upload-icon\">+</div><div class=\"service-photo-upload-text\">Add Photo<small>JPG/PNG, max 5MB</small></div></label>\\'; } content.innerHTML = html; }';
  html += '    function handleServicePhotoSelect(input) { if (!input.files || !input.files[0]) return; var file = input.files[0]; if (file.type !== \\'image/jpeg\\' && file.type !== \\'image/png\\') { alert(\\'Please upload a JPG or PNG image.\\'); input.value = \\'\\'; return; } if (file.size > 5 * 1024 * 1024) { alert(\\'File too large. Maximum 5MB allowed.\\'); input.value = \\'\\'; return; } uploadServicePhoto(file); }';
  html += '    async function uploadServicePhoto(file) { try { var token = localStorage.getItem(\\'token\\'); var formData = new FormData(); formData.append(\\'photo\\', file); var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos\\', { method: \\'POST\\', headers: { \\'Authorization\\': \\'Bearer \\' + token }, body: formData }); if (response.ok) { loadServicePhotos(currentServiceId); } else { var data = await response.json(); alert(data.error || \\'Upload failed\\'); } } catch (err) { console.error(\\'Error uploading photo:\\', err); alert(\\'Failed to upload photo\\'); } }';
  html += '    async function deleteServicePhoto(index) { if (!confirm(\\'Delete this photo?\\')) return; try { var token = localStorage.getItem(\\'token\\'); var service = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } }).then(r => r.json()); var photos = JSON.parse(service.photos || \\'[]\\'); var photoUrl = photos[index]; var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos?photoUrl=\\' + encodeURIComponent(photoUrl), { method: \\'DELETE\\', headers: { \\'Authorization\\': \\'Bearer \\' + token } }); if (response.ok) { loadServicePhotos(currentServiceId); } else { var data = await response.json(); alert(data.error || \\'Delete failed\\'); } } catch (err) { console.error(\\'Error deleting photo:\\', err); alert(\\'Failed to delete photo\\'); } }';
"""

content = content[:insert_point2] + js_funcs + content[insert_point2:]
print(f"Inserted {len(js_funcs)} bytes of JS functions")

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(content)

print("SUCCESS")