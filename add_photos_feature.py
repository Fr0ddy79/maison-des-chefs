#!/usr/bin/env python3
with open('src/routes/chef-profile-page.ts', 'r') as f:
    content = f.read()

# Part 1: Add Photos button
old1 = 'toggle-slider"></span>\\'; html += \\'</label>\\'; html += \\'</div></li>\\';'
new1 = 'toggle-slider"></span>\\'; html += \\'</label>\\'; html += \\'<button class="manage-photos-btn" onclick="openServicePhotosModal(\' + s.id + \')">Photos</button>\\'; html += \\'</div></li>\\';'

if old1 not in content:
    print("FAILED: Could not find pattern for photos button")
else:
    content = content.replace(old1, new1, 1)
    print("Part 1: Added Photos button")

# Part 2: Add CSS
old_css = "    html += '    .no-service-photos { color: #888; font-size: 0.95rem; text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; }\n';\n  html += '    .signature-dishes-section"
new_css = """    html += '    .no-service-photos { color: #888; font-size: 0.95rem; text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; }\n';
    html += '    .manage-photos-btn { background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }\n';
    html += '    .manage-photos-btn:hover { background: #5a6268; }\n';
  html += '    .signature-dishes-section"""

if old_css not in content:
    print("FAILED: Could not find CSS insertion point")
else:
    content = content.replace(old_css, new_css, 1)
    print("Part 2: Added CSS")

# Part 3: Add JS functions
old_js = "  html += '    }\n';\n  html += '    \n';\n  html += '    function handlePhotoSelect(input)"
new_js = """  html += '    }\n';
  html += '    \n';
  html += '    // Service photos modal (MAI-1133)\n';
  html += '    var currentServiceId = null;\n';
  html += '    function openServicePhotosModal(serviceId) {\n';
  html += '      currentServiceId = serviceId;\n';
  html += '      var modal = document.getElementById(\\'servicePhotosModal\\');\n';
  html += '      var content = document.getElementById(\\'servicePhotosContent\\');\n';
  html += '      if (!modal || !content) return;\n';
  html += '      content.innerHTML = \\'<div class="service-photos-loading">Loading...</div>\\';\n';
  html += '      modal.style.display = \\'block\\';\n';
  html += '      loadServicePhotos(serviceId);\n';
  html += '    }\n';
  html += '    function closeServicePhotosModal() {\n';
  html += '      var modal = document.getElementById(\\'servicePhotosModal\\');\n';
  html += '      if (modal) modal.style.display = \\'none\\';\n';
  html += '      currentServiceId = null;\n';
  html += '    }\n';
  html += '    async function loadServicePhotos(serviceId) {\n';
  html += '      try {\n';
  html += '        var token = localStorage.getItem(\\'token\\');\n';
  html += '        var response = await fetch(API_BASE + \\'/api/services/\\' + serviceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } });\n';
  html += '        if (!response.ok) { showServicePhotosError(\\'Failed to load photos\\'); return; }\n';
  html += '        var service = await response.json();\n';
  html += '        var photos = JSON.parse(service.photos || \\'[]\\');\n';
  html += '        renderServicePhotosModal(photos);\n';
  html += '      } catch (err) { console.error(\\'Error loading service photos:\\', err); showServicePhotosError(\\'Failed to load photos\\'); }\n';
  html += '    }\n';
  html += '    function renderServicePhotosModal(photos) {\n';
  html += '      var content = document.getElementById(\\'servicePhotosContent\\');\n';
  html += '      if (!content) return;\n';
  html += '      if (photos.length === 0) {\n';
  html += '        content.innerHTML = \\'<div class="no-service-photos">No photos yet. Upload your first photo below.</div>\\';\n';
  html += '      } else {\n';
  html += '        var html = \\'<div class="service-photos-grid">\\';\n';
  html += '        photos.forEach(function(photo, idx) {\n';
  html += '          html += \\'<div class="service-photo-item" draggable="true" data-index="\\' + idx + \\'">\\';\n';
  html += '          html += \\'<img src="\\' + photo + \\'" alt="Photo \\' + (idx + 1) + \\'" />\\';\n';
  html += '          html += \\'<button class="service-photo-delete" onclick="deleteServicePhoto(\\' + idx + \\')">&times;</button>\\';\n';
  html += '          html += \\'</div>\\';\n';
  html += '        });\n';
  html += '        html += \\'</div>\\';\n';
  html += '        content.innerHTML = html;\n';
  html += '        initPhotoDragDrop();\n';
  html += '      }\n';
  html += '      if (photos.length < 6) {\n';
  html += '        content.innerHTML += \\'<label class="service-photo-upload">\\';\n';
  html += '        content.innerHTML += \\'<input type="file" accept="image/jpeg,image/png" onchange="handleServicePhotoSelect(this)" />\\';\n';
  html += '        content.innerHTML += \\'<div class="service-photo-upload-icon">+</div>\\';\n';
  html += '        content.innerHTML += \\'<div class="service-photo-upload-text">Add Photo<small>JPG/PNG, max 5MB</small></div>\\';\n';
  html += '        content.innerHTML += \\'</label>\\';\n';
  html += '      }\n';
  html += '    }\n';
  html += '    function showServicePhotosError(msg) {\n';
  html += '      var content = document.getElementById(\\'servicePhotosContent\\');\n';
  html += '      if (content) content.innerHTML = \\'<div class="no-service-photos" style="color:#c0392b">\\' + msg + \\'</div>\\';\n';
  html += '    }\n';
  html += '    async function deleteServicePhoto(index) {\n';
  html += '      if (!confirm(\\'Delete this photo?\\')) return;\n';
  html += '      try {\n';
  html += '        var token = localStorage.getItem(\\'token\\');\n';
  html += '        var service = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } }).then(r => r.json());\n';
  html += '        var photos = JSON.parse(service.photos || \\'[]\\');\n';
  html += '        var photoUrl = photos[index];\n';
  html += '        var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos?photoUrl=\\' + encodeURIComponent(photoUrl), { method: \\'DELETE\\', headers: { \\'Authorization\\': \\'Bearer \\' + token } });\n';
  html += '        if (response.ok) { loadServicePhotos(currentServiceId); }\n';
  html += '        else { var data = await response.json(); alert(data.error || \\'Delete failed\\'); }\n';
  html += '      } catch (err) { console.error(\\'Error deleting photo:\\', err); alert(\\'Failed to delete photo\\'); }\n';
  html += '    }\n';
  html += '    function handleServicePhotoSelect(input) {\n';
  html += '      if (!input.files || !input.files[0]) return;\n';
  html += '      var file = input.files[0];\n';
  html += '      var validTypes = [\\'image/jpeg\\',\\'image/png\\'];\n';
  html += '      if (!validTypes.includes(file.type)) { alert(\\'Please upload a JPG or PNG image.\\'); input.value = \\'\\'; return; }\n';
  html += '      if (file.size > 5 * 1024 * 1024) { alert(\\'File too large. Maximum 5MB allowed.\\'); input.value = \\'\\'; return; }\n';
  html += '      uploadServicePhoto(file);\n';
  html += '    }\n';
  html += '    async function uploadServicePhoto(file) {\n';
  html += '      var uploadEl = document.querySelector(\\'.service-photo-upload\\');\n';
  html += '      if (uploadEl) uploadEl.classList.add(\\'uploading\\');\n';
  html += '      try {\n';
  html += '        var token = localStorage.getItem(\\'token\\');\n';
  html += '        var formData = new FormData();\n';
  html += '        formData.append(\\'photo\\', file);\n';
  html += '        var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos\\', { method: \\'POST\\', headers: { \\'Authorization\\': \\'Bearer \\' + token }, body: formData });\n';
  html += '        if (response.ok) { loadServicePhotos(currentServiceId); }\n';
  html += '        else { var data = await response.json(); alert(data.error || \\'Upload failed\\'); }\n';
  html += '      } catch (err) { console.error(\\'Error uploading photo:\\', err); alert(\\'Failed to upload photo\\'); }\n';
  html += '      if (uploadEl) uploadEl.classList.remove(\\'uploading\\');\n';
  html += '    }\n';
  html += '    function initPhotoDragDrop() {}\n';
  html += '    \n';
  html += '    function handlePhotoSelect(input)"""

if old_js not in content:
    print("FAILED: Could not find JS insertion point")
else:
    content = content.replace(old_js, new_js, 1)
    print("Part 3: Added JS functions")

with open('src/routes/chef-profile-page.ts', 'w') as f:
    f.write(content)

print("Done")