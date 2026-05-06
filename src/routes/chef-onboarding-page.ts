// Chef Onboarding Wizard Page — MAI-1159 Task 1
// Guides chefs through profile setup → service setup → availability → publish

export default function buildChefOnboardingPage(): string {
  var html = '';
  html += '<!DOCTYPE html>\n';
  html += '<html lang="en">\n';
  html += '<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<title>Chef Onboarding | Maison des Chefs</title>\n';
  html += '<style>\n';
  html += '    * { margin: 0; padding: 0; box-sizing: border-box; }\n';
  html += '    body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }\n';
  html += '    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }\n';
  html += '    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }\n';
  html += '    nav .nav-links { display: flex; gap: 1.5rem; }\n';
  html += '    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }\n';
  html += '    nav .nav-links a:hover { opacity: 0.8; }\n';
  html += '    .wizard-container { max-width: 680px; margin: 5rem auto 3rem; padding: 0 2rem; }\n';
  html += '    .wizard-header { text-align: center; margin-bottom: 2.5rem; }\n';
  html += '    .wizard-header h1 { font-size: clamp(1.8rem, 4vw, 2.2rem); color: #2c3e50; margin-bottom: 0.5rem; }\n';
  html += '    .wizard-header p { color: #666; font-size: 1rem; }\n';
  html += '    /* Progress bar */\n';
  html += '    .progress-bar { display: flex; justify-content: center; margin-bottom: 2.5rem; gap: 0; }\n';
  html += '    .progress-step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; max-width: 120px; }\n';
  html += '    .progress-step:not(:last-child)::after { content: \'\'; position: absolute; top: 18px; left: 50%; width: 100%; height: 3px; background: #ddd; z-index: 0; }\n';
  html += '    .progress-step.completed:not(:last-child)::after { background: #c9a227; }\n';
  html += '    .progress-step.active:not(:last-child)::after { background: linear-gradient(to right, #c9a227 50%, #ddd 50%); }\n';
  html += '    .step-circle { width: 36px; height: 36px; border-radius: 50%; background: #ddd; color: #888; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; z-index: 1; transition: all 0.3s; }\n';
  html += '    .progress-step.completed .step-circle { background: #c9a227; color: white; }\n';
  html += '    .progress-step.active .step-circle { background: #c9a227; color: white; box-shadow: 0 0 0 4px rgba(201,162,39,0.2); }\n';
  html += '    .step-label { margin-top: 0.5rem; font-size: 0.75rem; color: #888; text-align: center; font-weight: 500; }\n';
  html += '    .progress-step.active .step-label { color: #c9a227; }\n';
  html += '    .progress-step.completed .step-label { color: #555; }\n';
  html += '    /* Card */\n';
  html += '    .step-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }\n';
  html += '    .step-card h2 { font-size: 1.4rem; color: #2c3e50; margin-bottom: 0.25rem; }\n';
  html += '    .step-card .step-subtitle { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }\n';
  html += '    /* Form elements */\n';
  html += '    .form-group { margin-bottom: 1.25rem; }\n';
  html += '    .form-group label { display: block; font-weight: 600; color: #444; margin-bottom: 0.4rem; font-size: 0.95rem; }\n';
  html += '    .form-group label span.req { color: #c0392b; margin-left: 2px; }\n';
  html += '    .form-group input[type="text"], .form-group input[type="number"], .form-group textarea, .form-group select { width: 100%; padding: 0.75rem; border: 1.5px solid #ddd; border-radius: 8px; font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; background: white; }\n';
  html += '    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #c9a227; }\n';
  html += '    .form-group textarea { resize: vertical; min-height: 90px; }\n';
  html += '    .form-group .char-count { display: block; text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.25rem; }\n';
  html += '    .form-group .char-count.warning { color: #e67e22; }\n';
  html += '    .form-group .char-count.error { color: #c0392b; }\n';
  html += '    .form-group .field-hint { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }\n';
  html += '    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }\n';
  html += '    @media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }\n';
  html += '    /* Cuisine tags */\n';
  html += '    .cuisine-tags-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }\n';
  html += '    .cuisine-tag { padding: 0.4rem 0.9rem; border: 2px solid #ddd; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; user-select: none; background: white; }\n';
  html += '    .cuisine-tag:hover { border-color: #c9a227; }\n';
  html += '    .cuisine-tag.selected { background: #c9a227; color: white; border-color: #c9a227; }\n';
  html += '    .cuisine-tags-hint { font-size: 0.8rem; color: #888; margin-top: 0.5rem; }\n';
  html += '    /* Category selection */\n';
  html += '    .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }\n';
  html += '    .category-option { border: 2px solid #ddd; border-radius: 10px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.2s; background: white; }\n';
  html += '    .category-option:hover { border-color: #c9a227; }\n';
  html += '    .category-option.selected { border-color: #c9a227; background: #fffbf0; }\n';
  html += '    .category-option input { display: none; }\n';
  html += '    .category-icon { font-size: 1.8rem; display: block; margin-bottom: 0.4rem; }\n';
  html += '    .category-name { font-weight: 600; font-size: 0.9rem; color: #333; }\n';
  html += '    /* Calendar */\n';
  html += '    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 1rem; }\n';
  html += '    .calendar-day-header { text-align: center; font-size: 0.75rem; font-weight: 600; color: #888; padding: 0.25rem 0; }\n';
  html += '    .calendar-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; border: 2px solid transparent; }\n';
  html += '    .calendar-day:hover:not(.disabled):not(.blocked) { border-color: #c9a227; }\n';
  html += '    .calendar-day.today { font-weight: 700; color: #c9a227; }\n';
  html += '    .calendar-day.blocked { background: #f8d7da; color: #721c24; cursor: default; }\n';
  html += '    .calendar-day.disabled { color: #ccc; cursor: not-allowed; }\n';
  html += '    .calendar-day.empty { cursor: default; }\n';
  html += '    .blocked-dates-list { margin-top: 1rem; }\n';
  html += '    .blocked-dates-list h4 { font-size: 0.9rem; color: #555; margin-bottom: 0.5rem; }\n';
  html += '    .blocked-date-tag { display: inline-flex; align-items: center; gap: 0.4rem; background: #f8d7da; color: #721c24; padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.8rem; margin: 0.25rem 0.25rem 0.25rem 0; cursor: pointer; }\n';
  html += '    .blocked-date-tag:hover { background: #f5c6cb; }\n';
  html += '    .blocked-date-tag span.remove { font-size: 0.9rem; line-height: 1; }\n';
  html += '    .no-blocked { color: #888; font-size: 0.85rem; font-style: italic; }\n';
  html += '    .calendar-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }\n';
  html += '    .calendar-nav button { background: none; border: 1px solid #ddd; border-radius: 6px; padding: 0.3rem 0.75rem; cursor: pointer; font-size: 0.9rem; }\n';
  html += '    .calendar-nav button:hover { background: #f5f5f5; }\n';
  html += '    .calendar-nav h3 { font-size: 1rem; color: #333; }\n';
  html += '    /* Preview */\n';
  html += '    .preview-section { margin-bottom: 1.5rem; }\n';
  html += '    .preview-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 0.4rem; font-weight: 600; }\n';
  html += '    .preview-card { background: #f8f9fa; border-radius: 10px; padding: 1.25rem; border: 1px solid #eee; }\n';
  html += '    .preview-card .preview-name { font-size: 1.15rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.25rem; }\n';
  html += '    .preview-card .preview-meta { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }\n';
  html += '    .preview-card .preview-price { font-size: 1.2rem; font-weight: 700; color: #c9a227; }\n';
  html += '    .preview-card .preview-description { color: #555; font-size: 0.9rem; line-height: 1.5; margin-top: 0.5rem; }\n';
  html += '    .preview-card .preview-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.78rem; font-weight: 600; margin-right: 0.5rem; }\n';
  html += '    /* Buttons */\n';
  html += '    .btn { display: inline-block; background: #c9a227; color: white; padding: 0.85rem 1.75rem; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s; border: none; cursor: pointer; font-size: 1rem; }\n';
  html += '    .btn:hover { background: #b8922a; }\n';
  html += '    .btn:active { transform: scale(0.98); }\n';
  html += '    .btn:disabled { background: #ccc; cursor: not-allowed; }\n';
  html += '    .btn-secondary { background: #6c757d; }\n';
  html += '    .btn-secondary:hover { background: #5a6268; }\n';
  html += '    .btn-sm { padding: 0.5rem 1rem; font-size: 0.88rem; }\n';
  html += '    .step-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; gap: 1rem; flex-wrap: wrap; }\n';
  html += '    .step-actions .left { display: flex; gap: 0.75rem; }\n';
  html += '    /* Messages */\n';
  html += '    .error-msg { background: #f8d7da; color: #721c24; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; display: none; }\n';
  html += '    .success-msg { background: #d4edda; color: #155724; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; display: none; }\n';
  html += '    .info-msg { background: #e3f2fd; color: #1565c0; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; display: none; }\n';
  html += '    /* Loading */\n';
  html += '    .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 300; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; }\n';
  html += '    .loading-overlay.active { display: flex; }\n';
  html += '    .loading-overlay .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c9a227; border-radius: 50%; animation: spin 1s linear infinite; }\n';
  html += '    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n';
  html += '    .loading-overlay p { color: #555; font-size: 1rem; }\n';
  html += '    /* Success state */\n';
  html += '    .success-state { text-align: center; padding: 3rem 2rem; }\n';
  html += '    .success-state .big-check { font-size: 4rem; margin-bottom: 1rem; }\n';
  html += '    .success-state h2 { color: #2c3e50; margin-bottom: 0.5rem; font-size: 1.6rem; }\n';
  html += '    .success-state p { color: #666; margin-bottom: 2rem; }\n';
  html += '    /* Responsive */\n';
  html += '    @media (max-width: 600px) { .wizard-container { margin-top: 4rem; } .step-card { padding: 1.25rem; } .progress-step { max-width: 80px; } .step-label { font-size: 0.65rem; } }\n';
  html += '    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }\n';
  html += '    footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }\n';
  html += '    footer p { opacity: 0.7; font-size: 0.85rem; }\n';
  html += '  </style>\n';
  html += '</head>\n';
  html += '<body>\n';
  html += '<nav><a href="/" class="logo">Maison des Chefs</a><div class="nav-links"><a href="/chef/leads">Dashboard</a><a href="/auth/login">Sign In</a></div></nav>\n';

  html += '<div class="wizard-container">\n';
  html += '<div class="wizard-header">\n';
  html += '<h1>Welcome, Chef!</h1>\n';
  html += '<p>Let\'s get your service live. It only takes a few minutes.</p>\n';
  html += '</div>\n';

  html += '<div class="progress-bar" id="progressBar">';
  html += renderProgressStep(1, 'Profile');
  html += renderProgressStep(2, 'Service');
  html += renderProgressStep(3, 'Availability');
  html += renderProgressStep(4, 'Review');
  html += '</div>\n';

  html += '<div id="errorMsg" class="error-msg"></div>\n';
  html += '<div id="successMsg" class="success-msg"></div>\n';
  html += '<div id="infoMsg" class="info-msg"></div>\n';

  // Step content containers
  html += '<div id="step1Content" class="step-card">' + step1HTML() + '</div>\n';
  html += '<div id="step2Content" class="step-card" style="display:none">' + step2HTML() + '</div>\n';
  html += '<div id="step3Content" class="step-card" style="display:none">' + step3HTML() + '</div>\n';
  html += '<div id="step4Content" class="step-card" style="display:none"></div>\n';

  html += '<div id="stepActions" class="step-actions">\n';
  html += '<div class="left"><button class="btn btn-secondary btn-sm" id="saveProgressBtn" onclick="saveProgress()" style="display:none">Save & Exit</button></div>\n';
  html += '<div id="navBtns"></div>\n';
  html += '</div>\n';
  html += '</div>\n';

  html += '</div>\n'; // wizard-container

  html += '<div class="loading-overlay" id="loadingOverlay">\n';
  html += '<div class="spinner"></div>\n';
  html += '<p id="loadingText">Saving...</p>\n';
  html += '</div>\n';

  html += '<footer><div class="logo">Maison des Chefs</div><p>&copy; 2026 Maison des Chefs. All rights reserved.</p></footer>\n';

  html += '<script>\n';
  html += '    var API_BASE = \'\';\n';
  html += '    var currentStep = 1;\n';
  html += '    var savedState = null;\n';
  html += '    var blockedDates = [];\n';
  html += '    var calendarMonth = new Date().getMonth();\n';
  html += '    var calendarYear = new Date().getFullYear();\n';
  html += '    var serviceId = null;\n';
  html += '    var authToken = localStorage.getItem(\'token\') || null;\n';
  html += '\n';

  // Step 1: Profile Setup
  html += '    function renderStep1(data) {\n';
  html += '      document.getElementById(\'step1Content\').style.display = \'block\';\n';
  html += '      document.getElementById(\'step2Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step3Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step4Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'saveProgressBtn\').style.display = \'inline-block\';\n';
  html += '      var d = data || savedState;\n';
  html += '      if (d && d.step1Data) {\n';
  html += '        document.getElementById(\'displayName\').value = d.step1Data.displayName || \'\';\n';
  html += '        document.getElementById(\'bio\').value = d.step1Data.bio || \'\';\n';
  html += '        document.getElementById(\'location\').value = d.step1Data.location || \'\';\n';
  html += '        if (d.step1Data.cuisineTags) {\n';
  html += '          d.step1Data.cuisineTags.forEach(function(tag) {\n';
  html += '            var el = document.querySelector(\'[data-cuisine="\' + tag + \'"]\');\n';
  html += '            if (el) el.classList.add(\'selected\');\n';
  html += '          });\n';
  html += '        }\n';
  html += '      }\n';
  html += '      updateNavButtons(1);\n';
  html += '      updateProgressBar(1);\n';
  html += '      updateCharCount(\'bio\', 300);\n';
  html += '    }\n';

  // Step 2: Service Setup
  html += '    function renderStep2(data) {\n';
  html += '      document.getElementById(\'step1Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step2Content\').style.display = \'block\';\n';
  html += '      document.getElementById(\'step3Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step4Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'saveProgressBtn\').style.display = \'inline-block\';\n';
  html += '      var d = data || savedState;\n';
  html += '      if (d && d.step2Data) {\n';
  html += '        document.getElementById(\'serviceName\').value = d.step2Data.name || \'\';\n';
  html += '        document.getElementById(\'serviceDescription\').value = d.step2Data.description || \'\';\n';
  html += '        document.getElementById(\'pricePerPerson\').value = d.step2Data.price || \'\';\n';
  html += '        document.getElementById(\'minGuests\').value = d.step2Data.minGuests || \'\';\n';
  html += '        document.getElementById(\'maxGuests\').value = d.step2Data.maxGuests || \'\';\n';
  html += '        var cat = d.step2Data.category || \'\';\n';
  html += '        document.querySelectorAll(\'.category-option\').forEach(function(el) {\n';
  html += '          el.classList.toggle(\'selected\', el.dataset.category === cat);\n';
  html += '        });\n';
  html += '      }\n';
  html += '      updateNavButtons(2);\n';
  html += '      updateProgressBar(2);\n';
  html += '      updateCharCount(\'serviceDescription\', 500);\n';
  html += '    }\n';

  // Step 3: Availability
  html += '    function renderStep3(data) {\n';
  html += '      document.getElementById(\'step1Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step2Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step3Content\').style.display = \'block\';\n';
  html += '      document.getElementById(\'step4Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'saveProgressBtn\').style.display = \'inline-block\';\n';
  html += '      var d = data || savedState;\n';
  html += '      if (d && d.step3Data && d.step3Data.blockedDates) {\n';
  html += '        blockedDates = d.step3Data.blockedDates;\n';
  html += '      }\n';
  html += '      renderCalendar();\n';
  html += '      updateNavButtons(3);\n';
  html += '      updateProgressBar(3);\n';
  html += '    }\n';

  // Step 4: Review
  html += '    async function renderStep4() {\n';
  html += '      document.getElementById(\'step1Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step2Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step3Content\').style.display = \'none\';\n';
  html += '      document.getElementById(\'step4Content\').style.display = \'block\';\n';
  html += '      document.getElementById(\'step4Content\').innerHTML = \'<div style="text-align:center;padding:3rem"><div class="spinner"></div><p>Loading preview...</p></div>\';\n';
  html += '      document.getElementById(\'saveProgressBtn\').style.display = \'inline-block\';\n';
  html += '      updateNavButtons(4);\n';
  html += '      updateProgressBar(4);\n';
  html += '      try {\n';
  html += '        var res = await fetch(API_BASE + \'/api/onboarding/preview\', {\n';
  html += '          headers: { \'Authorization\': \'Bearer \' + authToken }\n';
  html += '        });\n';
  html += '        if (!res.ok) throw new Error(\'Failed to load preview\');\n';
  html += '        var preview = await res.json();\n';
  html += '        var step1 = preview.step1Data || {};\n';
  html += '        var step2 = preview.step2Data || {};\n';
  html += '        var step3 = preview.step3Data || {};\n';
  html += '        var p = preview.profile || {};\n';
  html += '        var s = preview.service || {};\n';
  html += '        var blockedCount = (step3.blockedDates || []).length;\n';
  html += '        var blockedHtml = \'\';\n';
  html += '        if (blockedCount > 0) {\n';
  html += '          blockedHtml = \'<span class="preview-badge">\' + blockedCount + \' blocked date(s)</span>\';\n';
  html += '        } else {\n';
  html += '          blockedHtml = \'<span class="preview-badge" style="background:#e8f5e9;color:#2e7d32;">No blocked dates</span>\';\n';
  html += '        }\n';
  html += '        var cuisineTags = p.cuisineTags || [];\n';
  html += '        var cuisineHtml = cuisineTags.map(function(t) { return \'<span style="background:#f0f0f0;padding:0.15rem 0.5rem;border-radius:10px;font-size:0.8rem;margin-right:0.25rem;">\' + t + \'</span>\'; }).join(\'\');\n';
  html += '        var html = \'<h2>Review & Publish</h2><p class="step-subtitle">Everything looks good? Hit Publish to go live!</p>\';\n';
  html += '        html += \'<div class="preview-section"><div class="preview-label">Your Profile</div><div class="preview-card\"><div class="preview-name">\' + escapeHtml(step1.displayName || p.displayName || \'Chef\') + \'</div>\';\n';
  html += '        html += \'<div class="preview-meta\"><span>📍 \' + escapeHtml(step1.location || p.location || \'Location\') + \'</span></div>\';\n';
  html += '        html += \'<div style="margin-top:0.5rem;">\' + cuisineHtml + \'</div>\';\n';
  html += '        if (step1.bio || p.bio) { html += \'<p class="preview-description">\' + escapeHtml((step1.bio || p.bio || \'\').substring(0,120)) + \'...</p>\'; }\n';
  html += '        html += \'</div></div>\';\n';
  html += '        html += \'<div class="preview-section"><div class="preview-label">Your Service</div><div class="preview-card\"><div class="preview-name">\' + escapeHtml(step2.name || s.name || \'Your Service\') + \'</div>\';\n';
  html += '        html += \'<div class="preview-meta\"><span class="preview-badge">\' + escapeHtml(step2.category || s.category || \'Category\') + \'</span>\' + blockedHtml + \'</div>\';\n';
  html += '        html += \'<div class="preview-price">$\' + Number(step2.price || s.pricePerPerson || 0).toFixed(0) + \' per person</div>\';\n';
  html += '        html += \'<p class="preview-description">\' + escapeHtml((step2.description || s.description || \'\').substring(0,200)) + \'</p>\';\n';
  html += '        html += \'<div style="margin-top:0.5rem;color:#666;font-size:0.9rem;">\' + (step2.minGuests || s.minGuests || 1) + \' to \' + (step2.maxGuests || s.maxGuests || 10) + \' guests</div>\';\n';
  html += '        html += \'</div></div>\';\n';
  html += '        html += \'<div style="margin-top:1.5rem;padding:1rem;background:#fff9e6;border-radius:8px;border:1px solid #c9a227;font-size:0.9rem;color:#555;">\';\n';
  html += '        html += \'✨ Once published, your service will be visible to diners across Montreal.</div>\';\n';
  html += '        document.getElementById(\'step4Content\').innerHTML = html;\n';
  html += '      } catch(err) {\n';
  html += '        document.getElementById(\'step4Content\').innerHTML = \'<div class="error-msg" style="display:block">Failed to load preview. Please go back and check your data.</div>\';\n';
  html += '      }\n';
  html += '    }\n';

  // Navigation
  html += '    function updateNavButtons(step) {\n';
  html += '      var nav = document.getElementById(\'navBtns\');\n';
  html += '      var html = \'\';\n';
  html += '      if (step > 1) {\n';
  html += '        html += \'<button class="btn btn-secondary btn-sm" onclick="goToStep(\' + (step - 1) + \')">← Back</button>\';\n';
  html += '      }\n';
  html += '      if (step < 4) {\n';
  html += '        html += \'<button class="btn" id="nextBtn" onclick="nextStep()">Continue →</button>\';\n';
  html += '      } else {\n';
  html += '        html += \'<button class="btn" id="publishBtn" onclick="publish()">Publish Service →</button>\';\n';
  html += '      }\n';
  html += '      nav.innerHTML = html;\n';
  html += '    }\n';

  html += '    async function nextStep() {\n';
  html += '      var step = currentStep;\n';
  html += '      if (step === 1) {\n';
  html += '        var valid = validateStep1();\n';
  html += '        if (!valid) return;\n';
  html += '        showLoading(\'Saving profile...\');\n';
  html += '        try {\n';
  html += '          var data1 = collectStep1Data();\n';
  html += '          var res = await fetch(API_BASE + \'/api/onboarding/step1\', {\n';
  html += '            method: \'PUT\',\n';
  html += '            headers: { \'Authorization\': \'Bearer \' + authToken, \'Content-Type\': \'application/json\' },\n';
  html += '            body: JSON.stringify(data1)\n';
  html += '          });\n';
  html += '          if (!res.ok) { var err = await res.json(); throw new Error(err.error || \'Save failed\'); }\n';
  html += '          hideLoading();\n';
  html += '          currentStep = 2;\n';
  html += '          renderStep2();\n';
  html += '        } catch(e) { hideLoading(); showError(e.message); }\n';
  html += '      } else if (step === 2) {\n';
  html += '        var valid = validateStep2();\n';
  html += '        if (!valid) return;\n';
  html += '        showLoading(\'Creating service...\');\n';
  html += '        try {\n';
  html += '          var data2 = collectStep2Data();\n';
  html += '          var res = await fetch(API_BASE + \'/api/onboarding/step2\', {\n';
  html += '            method: \'PUT\',\n';
  html += '            headers: { \'Authorization\': \'Bearer \' + authToken, \'Content-Type\': \'application/json\' },\n';
  html += '            body: JSON.stringify(data2)\n';
  html += '          });\n';
  html += '          if (!res.ok) { var err = await res.json(); throw new Error(err.error || \'Save failed\'); }\n';
  html += '          var result = await res.json();\n';
  html += '          serviceId = result.serviceId;\n';
  html += '          hideLoading();\n';
  html += '          currentStep = 3;\n';
  html += '          renderStep3();\n';
  html += '        } catch(e) { hideLoading(); showError(e.message); }\n';
  html += '      } else if (step === 3) {\n';
  html += '        showLoading(\'Saving availability...\');\n';
  html += '        try {\n';
  html += '          var res = await fetch(API_BASE + \'/api/onboarding/step3\', {\n';
  html += '            method: \'PUT\',\n';
  html += '            headers: { \'Authorization\': \'Bearer \' + authToken, \'Content-Type\': \'application/json\' },\n';
  html += '            body: JSON.stringify({ blockedDates: blockedDates })\n';
  html += '          });\n';
  html += '          if (!res.ok) { var err = await res.json(); throw new Error(err.error || \'Save failed\'); }\n';
  html += '          hideLoading();\n';
  html += '          currentStep = 4;\n';
  html += '          renderStep4();\n';
  html += '        } catch(e) { hideLoading(); showError(e.message); }\n';
  html += '      }\n';
  html += '    }\n';

  html += '    function goToStep(step) {\n';
  html += '      currentStep = step;\n';
  html += '      if (step === 1) renderStep1();\n';
  html += '      else if (step === 2) renderStep2();\n';
  html += '      else if (step === 3) renderStep3();\n';
  html += '      else if (step === 4) renderStep4();\n';
  html += '    }\n';

  // Step 1 validation & collection
  html += '    function validateStep1() {\n';
  html += '      var displayName = document.getElementById(\'displayName\').value.trim();\n';
  html += '      var location = document.getElementById(\'location\').value.trim();\n';
  html += '      var bio = document.getElementById(\'bio\').value;\n';
  html += '      var selectedCuisines = document.querySelectorAll(\'.cuisine-tag.selected\');\n';
  html += '      if (!displayName) { showError(\'Please enter your display name.\'); return false; }\n';
  html += '      if (!location) { showError(\'Please enter your location.\'); return false; }\n';
  html += '      if (selectedCuisines.length === 0) { showError(\'Please select at least one cuisine type.\'); return false; }\n';
  html += '      if (selectedCuisines.length > 5) { showError(\'Maximum 5 cuisine types allowed.\'); return false; }\n';
  html += '      if (bio.length > 300) { showError(\'Bio must be 300 characters or less.\'); return false; }\n';
  html += '      return true;\n';
  html += '    }\n';

  html += '    function collectStep1Data() {\n';
  html += '      var displayName = document.getElementById(\'displayName\').value.trim();\n';
  html += '      var bio = document.getElementById(\'bio\').value.trim();\n';
  html += '      var location = document.getElementById(\'location\').value.trim();\n';
  html += '      var selectedCuisines = Array.from(document.querySelectorAll(\'.cuisine-tag.selected\')).map(function(el) { return el.dataset.cuisine; });\n';
  html += '      return { displayName: displayName, bio: bio || undefined, cuisineTags: selectedCuisines, location: location };\n';
  html += '    }\n';

  // Step 2 validation & collection
  html += '    function validateStep2() {\n';
  html += '      var name = document.getElementById(\'serviceName\').value.trim();\n';
  html += '      var desc = document.getElementById(\'serviceDescription\').value.trim();\n';
  html += '      var price = parseFloat(document.getElementById(\'pricePerPerson\').value);\n';
  html += '      var min = parseInt(document.getElementById(\'minGuests\').value);\n';
  html += '      var max = parseInt(document.getElementById(\'maxGuests\').value);\n';
  html += '      var category = document.querySelector(\'.category-option.selected\')?.dataset.category;\n';
  html += '      if (!name) { showError(\'Please enter a service name.\'); return false; }\n';
  html += '      if (!desc) { showError(\'Please enter a service description.\'); return false; }\n';
  html += '      if (!price || price < 20) { showError(\'Price per person must be at least $20.\'); return false; }\n';
  html += '      if (!min || min < 1) { showError(\'Minimum guests must be at least 1.\'); return false; }\n';
  html += '      if (!max || max > 50) { showError(\'Maximum guests cannot exceed 50.\'); return false; }\n';
  html += '      if (min > max) { showError(\'Minimum guests cannot be greater than maximum.\'); return false; }\n';
  html += '      if (!category) { showError(\'Please select a service category.\'); return false; }\n';
  html += '      return true;\n';
  html += '    }\n';

  html += '    function collectStep2Data() {\n';
  html += '      var category = document.querySelector(\'.category-option.selected\')?.dataset.category || \'Private Dinner\';\n';
  html += '      return {\n';
  html += '        name: document.getElementById(\'serviceName\').value.trim(),\n';
  html += '        description: document.getElementById(\'serviceDescription\').value.trim(),\n';
  html += '        price: parseFloat(document.getElementById(\'pricePerPerson\').value),\n';
  html += '        minGuests: parseInt(document.getElementById(\'minGuests\').value),\n';
  html += '        maxGuests: parseInt(document.getElementById(\'maxGuests\').value),\n';
  html += '        category: category\n';
  html += '      };\n';
  html += '    }\n';

  // Calendar
  html += '    function renderCalendar() {\n';
  html += '      var container = document.getElementById(\'calendarGrid\');\n';
  html += '      var monthLabel = document.getElementById(\'calendarMonthLabel\');\n';
  html += '      var days = [\'Su\',\'Mo\',\'Tu\',\'We\',\'Th\',\'Fr\',\'Sa\'];\n';
  html += '      var months = [\'January\',\'February\',\'March\',\'April\',\'May\',\'June\',\'July\',\'August\',\'September\',\'October\',\'November\',\'December\'];\n';
  html += '      monthLabel.textContent = months[calendarMonth] + \' \' + calendarYear;\n';
  html += '      var html = \'\';\n';
  html += '      days.forEach(function(d) { html += \'<div class="calendar-day-header">\' + d + \'</div>\'; });\n';
  html += '      var firstDay = new Date(calendarYear, calendarMonth, 1).getDay();\n';
  html += '      var daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();\n';
  html += '      var today = new Date();\n';
  html += '      var todayStr = today.getFullYear() + \'-\' + String(today.getMonth() + 1).padStart(2,\'0\') + \'-\' + String(today.getDate()).padStart(2,\'0\');\n';
  html += '      for (var i = 0; i < firstDay; i++) { html += \'<div class="calendar-day empty"></div>\'; }\n';
  html += '      for (var d = 1; d <= daysInMonth; d++) {\n';
  html += '        var dateStr = calendarYear + \'-\' + String(calendarMonth + 1).padStart(2,\'0\') + \'-\' + String(d).padStart(2,\'0\');\n';
  html += '        var isBlocked = blockedDates.includes(dateStr);\n';
  html += '        var isPast = dateStr < todayStr;\n';
  html += '        var isToday = dateStr === todayStr;\n';
  html += '        var classes = \'calendar-day\';\n';
  html += '        if (isBlocked) classes += \' blocked\';\n';
  html += '        else if (isPast) classes += \' disabled\';\n';
  html += '        if (isToday) classes += \' today\';\n';
  html += '        var disabled = isPast ? \'disabled\' : \'\';\n';
  html += '        var clickHandler = (!isPast && !isBlocked) ? \'onclick="toggleBlocked(\\ \'\' + dateStr + \'\\\')\"\' : \'\';\n';
  html += '        html += \'<div class="\' + classes + \'" \' + clickHandler + \' style="\' + (isPast || isBlocked ? \'\': \'cursor:pointer\') + \'"\' + (disabled ? \' style="opacity:0.4"\' : \'\') + \'>\' + d + \'</div>\';\n';
  html += '      }\n';
  html += '      container.innerHTML = html;\n';
  html += '      renderBlockedDatesList();\n';
  html += '    }\n';

  html += '    function prevMonth() {\n';
  html += '      calendarMonth--;\n';
  html += '      if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }\n';
  html += '      renderCalendar();\n';
  html += '    }\n';

  html += '    function nextMonth() {\n';
  html += '      calendarMonth++;\n';
  html += '      if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }\n';
  html += '      renderCalendar();\n';
  html += '    }\n';

  html += '    function toggleBlocked(dateStr) {\n';
  html += '      if (blockedDates.includes(dateStr)) {\n';
  html += '        blockedDates = blockedDates.filter(function(d) { return d !== dateStr; });\n';
  html += '      } else {\n';
  html += '        blockedDates.push(dateStr);\n';
  html += '        blockedDates.sort();\n';
  html += '      }\n';
  html += '      renderCalendar();\n';
  html += '    }\n';

  html += '    function removeBlocked(dateStr) {\n';
  html += '      blockedDates = blockedDates.filter(function(d) { return d !== dateStr; });\n';
  html += '      renderCalendar();\n';
  html += '    }\n';

  html += '    function renderBlockedDatesList() {\n';
  html += '      var container = document.getElementById(\'blockedDatesList\');\n';
  html += '      if (blockedDates.length === 0) {\n';
  html += '        container.innerHTML = \'<p class="no-blocked">No blocked dates yet — click calendar days to block them.</p>\';\n';
  html += '        return;\n';
  html += '      }\n';
  html += '      var html = \'<h4>Blocked Dates</h4>\';\n';
  html += '      blockedDates.forEach(function(d) {\n';
  html += '        var label = new Date(d + \'T12:00:00\').toLocaleDateString(\'en-US\', { month: \'short\', day: \'numeric\', year: \'numeric\' });\n';
  html += '        html += \'<span class="blocked-date-tag\"><span class="remove" onclick="removeBlocked(\\ \'\' + d + \'\\\')\">×</span> \' + label + \'</span>\';\n';
  html += '      });\n';
  html += '      container.innerHTML = html;\n';
  html += '    }\n';

  // Publish
  html += '    async function publish() {\n';
  html += '      var btn = document.getElementById(\'publishBtn\');\n';
  html += '      btn.disabled = true;\n';
  html += '      btn.textContent = \'Publishing...\';\n';
  html += '      showLoading(\'Publishing your service...\');\n';
  html += '      try {\n';
  html += '        var res = await fetch(API_BASE + \'/api/onboarding/publish\', {\n';
  html += '          method: \'POST\',\n';
  html += '          headers: { \'Authorization\': \'Bearer \' + authToken }\n';
  html += '        });\n';
  html += '        if (!res.ok) { var err = await res.json(); throw new Error(err.error || \'Publish failed\'); }\n';
  html += '        hideLoading();\n';
  html += '        showSuccessState();\n';
  html += '      } catch(e) {\n';
  html += '        hideLoading();\n';
  html += '        btn.disabled = false;\n';
  html += '        btn.textContent = \'Publish Service →\';\n';
  html += '        showError(e.message);\n';
  html += '      }\n';
  html += '    }\n';

  html += '    function showSuccessState() {\n';
  html += '      document.getElementById(\'progressBar\').style.display = \'none\';\n';
  html += '      var container = document.querySelector(\'.wizard-container\') || document.body;\n';
  html += '      container.innerHTML = \'<div style="max-width:500px;margin:6rem auto;padding:0 2rem;text-align:center;">\';\n';
  html += '      container.innerHTML += \'<div style="font-size:4rem;margin-bottom:1rem;">🎉</div>\';\n';
  html += '      container.innerHTML += \'<h2 style="font-size:2rem;color:#2c3e50;margin-bottom:0.5rem;">You\'re Live!</h2>\';\n';
  html += '      container.innerHTML += \'<p style="color:#666;margin-bottom:2rem;">Your service has been published successfully. Diners can now discover and book you!</p>\';\n';
  html += '      container.innerHTML += \'<a href="/chef/leads" class="btn" style="display:inline-block;">View My Leads →</a>\';\n';
  html += '      container.innerHTML += \'<p style="margin-top:1.5rem;color:#888;font-size:0.9rem;">or <a href="/chef/profile" style="color:#c9a227;">complete your chef profile</a> to stand out more.</p>\';\n';
  html += '      container.innerHTML += \'</div>\';\n';
  html += '    }\n';

  // Save progress
  html += '    async function saveProgress() {\n';
  html += '      var step1Data = currentStep >= 1 ? collectStep1Data() : null;\n';
  html += '      var step2Data = currentStep >= 2 ? collectStep2Data() : null;\n';
  html += '      var step3Data = currentStep >= 3 ? { blockedDates: blockedDates } : null;\n';
  html += '      showLoading(\'Saving your progress...\');\n';
  html += '      try {\n';
  html += '        var res = await fetch(API_BASE + \'/api/onboarding/state\', {\n';
  html += '          method: \'POST\',\n';
  html += '          headers: { \'Authorization\': \'Bearer \' + authToken, \'Content-Type\': \'application/json\' },\n';
  html += '          body: JSON.stringify({ currentStep: currentStep, step1Data: step1Data, step2Data: step2Data, step3Data: step3Data })\n';
  html += '        });\n';
  html += '        if (!res.ok) throw new Error(\'Save failed\');\n';
  html += '        hideLoading();\n';
  html += '        showInfo(\'Progress saved! You can return anytime to continue.\');\n';
  html += '        setTimeout(function() { window.location.href = \'/chef/leads\'; }, 1500);\n';
  html += '      } catch(e) {\n';
  html += '        hideLoading();\n';
  html += '        showError(\'Failed to save progress: \' + e.message);\n';
  html += '      }\n';
  html += '    }\n';

  // UI helpers
  html += '    function updateProgressBar(step) {\n';
  html += '      var steps = document.querySelectorAll(\'.progress-step\');\n';
  html += '      steps.forEach(function(s, idx) {\n';
  html += '        s.classList.remove(\'completed\', \'active\');\n';
  html += '        if (idx + 1 < step) s.classList.add(\'completed\');\n';
  html += '        else if (idx + 1 === step) s.classList.add(\'active\');\n';
  html += '      });\n';
  html += '    }\n';

  html += '    function updateCharCount(fieldId, max) {\n';
  html += '      var el = document.getElementById(fieldId);\n';
  html += '      if (!el) return;\n';
  html += '      el.addEventListener(\'input\', function() {\n';
  html += '        var countEl = document.getElementById(fieldId + \'CharCount\');\n';
  html += '        if (!countEl) return;\n';
  html += '        var len = el.value.length;\n';
  html += '        countEl.textContent = len + \' / \' + max;\n';
  html += '        countEl.className = \'char-count\';\n';
  html += '        if (len > max * 0.9) countEl.classList.add(\'warning\');\n';
  html += '        if (len >= max) countEl.classList.add(\'error\');\n';
  html += '      });\n';
  html += '    }\n';

  html += '    function showError(msg) { var el = document.getElementById(\'errorMsg\'); el.textContent = msg; el.style.display = \'block\'; setTimeout(function() { el.style.display = \'none\'; }, 5000); }\n';
  html += '    function showInfo(msg) { var el = document.getElementById(\'infoMsg\'); el.textContent = msg; el.style.display = \'block\'; setTimeout(function() { el.style.display = \'none\'; }, 4000); }\n';
  html += '    function showLoading(text) { document.getElementById(\'loadingText\').textContent = text || \'Loading...\'; document.getElementById(\'loadingOverlay\').classList.add(\'active\'); }\n';
  html += '    function hideLoading() { document.getElementById(\'loadingOverlay\').classList.remove(\'active\'); }\n';
  html += '    function escapeHtml(text) { if (!text) return \'\'; var div = document.createElement(\'div\'); div.textContent = text; return div.innerHTML; }\n';

  // Cuisine tag toggle
  html += '    document.addEventListener(\'DOMContentLoaded\', function() {\n';
  html += '      document.querySelectorAll(\'.cuisine-tag\').forEach(function(tag) {\n';
  html += '        tag.addEventListener(\'click\', function() { this.classList.toggle(\'selected\'); });\n';
  html += '      });\n';
  html += '      document.querySelectorAll(\'.category-option\').forEach(function(opt) {\n';
  html += '        opt.addEventListener(\'click\', function() {\n';
  html += '          document.querySelectorAll(\'.category-option\').forEach(function(o) { o.classList.remove(\'selected\'); });\n';
  html += '          this.classList.add(\'selected\');\n';
  html += '        });\n';
  html += '      });\n';
  html += '      init();\n';
  html += '    });\n';

  html += '    async function init() {\n';
  html += '      authToken = localStorage.getItem(\'token\') || null;\n';
  html += '      if (!authToken) { window.location.href = \'/auth/login?redirect=/chef/onboarding\'; return; }\n';
  html += '      try {\n';
  html += '        var res = await fetch(API_BASE + \'/api/onboarding/state\', {\n';
  html += '          headers: { \'Authorization\': \'Bearer \' + authToken }\n';
  html += '        });\n';
  html += '        if (res.ok) {\n';
  html += '          savedState = await res.json();\n';
  html += '          if (savedState.completed) { window.location.href = \'/chef/leads\'; return; }\n';
  html += '          if (savedState.inProgress) { currentStep = savedState.currentStep || 1; }\n';
  html += '        }\n';
  html += '      } catch(e) { /* ignore - start fresh */ }\n';
  html += '      if (currentStep === 1) renderStep1();\n';
  html += '      else if (currentStep === 2) renderStep2();\n';
  html += '      else if (currentStep === 3) renderStep3();\n';
  html += '      else if (currentStep === 4) renderStep4();\n';
  html += '    }\n';

  html += '  </script>\n';
  html += '</body>\n';
  html += '</html>\n';

  return html;
}

function renderProgressStep(num: number, label: string): string {
  return '<div class="progress-step" id="step' + num + 'Progress">' +
    '<div class="step-circle">' + num + '</div>' +
    '<div class="step-label">' + label + '</div>' +
    '</div>';
}

// Cuisine tag options
const CUISINE_OPTIONS = ['french','italian','japanese','mexican','indian','thai','american','mediterranean','korean','chinese','vietnamese','spanish','greek','middle_eastern','nordic'];

function buildCuisineTagHTML(): string {
  return CUISINE_OPTIONS.map(function(t) {
    var label = t.replace(/_/g, ' ');
    return '<div class="cuisine-tag" data-cuisine="' + t + '">' + label + '</div>';
  }).join('');
}

function step1HTML(): string {
  var cuisineTagsHTML = buildCuisineTagHTML();
  return '<h2>Step 1: Profile Setup</h2>' +
    '<p class="step-subtitle">Tell diners who you are and what you cook.</p>' +
    '<div class="form-group">' +
    '<label for="displayName">Display Name <span class="req">*</span></label>' +
    '<input type="text" id="displayName" placeholder="e.g., Chef Marcel Dubois" maxlength="50">' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="bio">Bio</label>' +
    '<textarea id="bio" placeholder="Share your culinary story, experience, and what makes your cooking unique..." maxlength="300"></textarea>' +
    '<span id="bioCharCount" class="char-count">0 / 300</span>' +
    '</div>' +
    '<div class="form-group">' +
    '<label>Cuisine Types <span class="req">*</span> <span class="section-hint" style="float:right;font-weight:400;">(select up to 5)</span></label>' +
    '<div class="cuisine-tags-grid">' + cuisineTagsHTML + '</div>' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="location">Location <span class="req">*</span></label>' +
    '<input type="text" id="location" placeholder="e.g., Montreal, QC">' +
    '<span class="field-hint">City or neighborhood where you operate</span>' +
    '</div>';
}

function step2HTML(): string {
  return '<h2>Step 2: Service Setup</h2>' +
    '<p class="step-subtitle">Create your first service offering.</p>' +
    '<div class="form-group">' +
    '<label for="serviceName">Service Name <span class="req">*</span></label>' +
    '<input type="text" id="serviceName" placeholder="e.g., French Riviera Dinner" maxlength="80">' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="serviceDescription">Description <span class="req">*</span></label>' +
    '<textarea id="serviceDescription" placeholder="Describe the experience, what\'s included, your cooking style..." maxlength="500"></textarea>' +
    '<span id="serviceDescriptionCharCount" class="char-count">0 / 500</span>' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="pricePerPerson">Price Per Person ($) <span class="req">*</span></label>' +
    '<input type="number" id="pricePerPerson" placeholder="75" min="20" step="1">' +
    '<span class="field-hint">Minimum $20 per person</span>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group">' +
    '<label for="minGuests">Min Guests <span class="req">*</span></label>' +
    '<input type="number" id="minGuests" placeholder="2" min="1" max="50">' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="maxGuests">Max Guests <span class="req">*</span></label>' +
    '<input type="number" id="maxGuests" placeholder="8" min="1" max="50">' +
    '</div>' +
    '</div>' +
    '<div class="form-group">' +
    '<label>Category <span class="req">*</span></label>' +
    '<div class="category-grid">' +
    '<div class="category-option" data-category="Private Dinner">' +
    '<span class="category-icon">🍽️</span><span class="category-name">Private Dinner</span></div>' +
    '<div class="category-option" data-category="Cooking Class">' +
    '<span class="category-icon">👨‍🍳</span><span class="category-name">Cooking Class</span></div>' +
    '<div class="category-option" data-category="Tasting Menu">' +
    '<span class="category-icon">✨</span><span class="category-name">Tasting Menu</span></div>' +
    '<div class="category-option" data-category="Catering">' +
    '<span class="category-icon">🍴</span><span class="category-name">Catering</span></div>' +
    '</div>' +
    '</div>';
}

function step3HTML(): string {
  return '<h2>Step 3: Availability</h2>' +
    '<p class="step-subtitle">Block out dates when you\'re unavailable.</p>' +
    '<div class="calendar-nav">' +
    '<button onclick="prevMonth()">← Prev</button>' +
    '<h3 id="calendarMonthLabel"></h3>' +
    '<button onclick="nextMonth()">Next →</button>' +
    '</div>' +
    '<div class="calendar-grid" id="calendarGrid"></div>' +
    '<div class="blocked-dates-list" id="blockedDatesList"></div>' +
    '<div style="margin-top:1.5rem;padding:0.75rem;background:#f8f9fa;border-radius:8px;font-size:0.85rem;color:#666;">' +
    '<strong>Tip:</strong> Click any future date to block/unblock it. You can always update this later from your dashboard.' +
    '</div>';
}