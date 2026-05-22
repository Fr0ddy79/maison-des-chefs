#!/usr/bin/env python3
"""Add CSS and JS for service photos modal to chef-profile-page.ts using bytes"""
import sys

with open('src/routes/chef-profile-page.ts', 'rb') as f:
    content = f.read()

# Part 1: Add CSS for manage-photos-btn before .signature-dishes-section
# Find: .signature-dishes-section
old_css = b'.signature-dishes-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; }'
new_css = b'.manage-photos-btn { background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }\n\'; html += \'    .manage-photos-btn:hover { background: #5a6268; }\n\'; html += \'    .signature-dishes-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; }'

if old_css not in content:
    print("FAILED: Could not find CSS insertion point")
    idx = content.find(b'signature-dishes-section')
    if idx != -1:
        print("Context:", content[idx-50:idx+200])
    sys.exit(1)

content = content.replace(old_css, new_css, 1)
print("Part 1: Added CSS for manage-photos-btn")

# Part 2: Add JS functions - find handlePhotoSelect function start
old_js = b"function handlePhotoSelect(input)"
new_js = b"""function openServicePhotosModal(serviceId) {
      currentServiceId = serviceId;
      var modal = document.getElementById(\\'servicePhotosModal\\');
      var content = document.getElementById(\\'servicePhotosContent\\');
      if (!modal || !content) return;
      content.innerHTML = \\'<div class="service-photos-loading">Loading...</div>\\';
      modal.style.display = \\'block\\';
      loadServicePhotos(serviceId);
    }
    function closeServicePhotosModal() {
      var modal = document.getElementById(\\'servicePhotosModal\\');
      if (modal) modal.style.display = \\'none\\';
      currentServiceId = null;
    }
    async function loadServicePhotos(serviceId) {
      try {
        var token = localStorage.getItem(\\'token\\');
        var response = await fetch(API_BASE + \\'/api/services/\\' + serviceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } });
        if (!response.ok) { showServicePhotosError(\\'Failed to load photos\\'); return; }
        var service = await response.json();
        var photos = JSON.parse(service.photos || \\'[]\\');
        renderServicePhotosModal(photos);
      } catch (err) { console.error(\\'Error loading service photos:\\', err); showServicePhotosError(\\'Failed to load photos\\'); }
    }
    function renderServicePhotosModal(photos) {
      var content = document.getElementById(\\'servicePhotosContent\\');
      if (!content) return;
      if (photos.length === 0) {
        content.innerHTML = \\'<div class="no-service-photos">No photos yet. Upload your first photo below.</div>\\';
      } else {
        var html = \\'<div class="service-photos-grid">\\';
        photos.forEach(function(photo, idx) {
          html += \\'<div class="service-photo-item" draggable="true" data-index="\\' + idx + \\'">\\';
          html += \\'<img src="\\' + photo + \\'" alt="Photo \\' + (idx + 1) + \\'" />\\';
          html += \\'<button class="service-photo-delete" onclick="deleteServicePhoto(\\' + idx + \\')">&times;</button>\\';
          html += \\'</div>\\';
        });
        html += \\'</div>\\';
        content.innerHTML = html;
        initPhotoDragDrop();
      }
      if (photos.length < 6) {
        content.innerHTML += \\'<label class="service-photo-upload">\\';
        content.innerHTML += \\'<input type="file" accept="image/jpeg,image/png" onchange="handleServicePhotoSelect(this)" />\\';
        content.innerHTML += \\'<div class="service-photo-upload-icon">+</div>\\';
        content.innerHTML += \\'<div class="service-photo-upload-text">Add Photo<small>JPG/PNG, max 5MB</small></div>\\';
        content.innerHTML += \\'</label>\\';
      }
    }
    function showServicePhotosError(msg) {
      var content = document.getElementById(\\'servicePhotosContent\\');
      if (content) content.innerHTML = \\'<div class="no-service-photos" style="color:#c0392b">\\' + msg + \\'</div>\\';
    }
    async function deleteServicePhoto(index) {
      if (!confirm(\\'Delete this photo?\\')) return;
      try {
        var token = localStorage.getItem(\\'token\\');
        var service = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId, { headers: { \\'Authorization\\': \\'Bearer \\' + token } }).then(r => r.json());
        var photos = JSON.parse(service.photos || \\'[]\\');
        var photoUrl = photos[index];
        var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos?photoUrl=\\' + encodeURIComponent(photoUrl), { method: \\'DELETE\\', headers: { \\'Authorization\\': \\'Bearer \\' + token } });
        if (response.ok) { loadServicePhotos(currentServiceId); }
        else { var data = await response.json(); alert(data.error || \\'Delete failed\\'); }
      } catch (err) { console.error(\\'Error deleting photo:\\', err); alert(\\'Failed to delete photo\\'); }
    }
    function handleServicePhotoSelect(input) {
      if (!input.files || !input.files[0]) return;
      var file = input.files[0];
      var validTypes = [\\'image/jpeg\\',\\'image/png\\'];
      if (!validTypes.includes(file.type)) { alert(\\'Please upload a JPG or PNG image.\\'); input.value = \\'\\'; return; }
      if (file.size > 5 * 1024 * 1024) { alert(\\'File too large. Maximum 5MB allowed.\\'); input.value = \\'\\'; return; }
      uploadServicePhoto(file);
    }
    async function uploadServicePhoto(file) {
      var uploadEl = document.querySelector(\\'.service-photo-upload\\');
      if (uploadEl) uploadEl.classList.add(\\'uploading\\');
      try {
        var token = localStorage.getItem(\\'token\\');
        var formData = new FormData();
        formData.append(\\'photo\\', file);
        var response = await fetch(API_BASE + \\'/api/services/\\' + currentServiceId + \\'/photos\\', { method: \\'POST\\', headers: { \\'Authorization\\': \\'Bearer \\' + token }, body: formData });
        if (response.ok) { loadServicePhotos(currentServiceId); }
        else { var data = await response.json(); alert(data.error || \\'Upload failed\\'); }
      } catch (err) { console.error(\\'Error uploading photo:\\', err); alert(\\'Failed to upload photo\\'); }
      if (uploadEl) uploadEl.classList.remove(\\'uploading\\');
    }
    function initPhotoDragDrop() {}
    
    function handlePhotoSelect(input)"""

if old_js not in content:
    print("FAILED: Could not find JS insertion point")
    idx = content.find(b'function handlePhotoSelect')
    if idx != -1:
        print("Context:", content[idx-200:idx+100])
    sys.exit(1)

content = content.replace(old_js, new_js, 1)
print("Part 2: Added service photos modal JS functions")

with open('src/routes/chef-profile-page.ts', 'wb') as f:
    f.write(content)

print("SUCCESS")