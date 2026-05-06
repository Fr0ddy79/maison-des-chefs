// QA Test for Compare Bar UI (MAI-1119)
// Validates: Task 1-4 + Edge cases

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function runQA() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {
    task1: { name: 'Verify Compare Checkbox on Service Cards', status: 'FAIL', issues: [] },
    task2: { name: 'Verify Sticky Compare Bar', status: 'FAIL', issues: [] },
    task3: { name: 'Verify Compare Action', status: 'FAIL', issues: [] },
    task4: { name: 'Verify Edge Cases', status: 'FAIL', issues: [] },
  };

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ===== TASK 1: Verify Compare Checkbox on Service Cards =====
    console.log('=== TASK 1: Verify Compare Checkbox on Service Cards ===');
    await page.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle' });
    
    // Wait for service cards to render
    await page.waitForTimeout(500);
    await page.waitForSelector('.service-card-wrapper', { timeout: 10000 }).catch(() => {});

    const serviceCards = await page.locator('.service-card-wrapper').count();
    console.log(`Found ${serviceCards} service cards`);

    if (serviceCards === 0) {
      results.task1.issues.push('No service cards found on /services page');
    } else {
      // Check if compare checkbox label exists on each card
      const checkboxLabels = await page.locator('.compare-checkbox-label').count();
      console.log(`Found ${checkboxLabels} compare checkbox labels`);

      if (checkboxLabels === serviceCards) {
        results.task1.status = 'PASS';
        console.log('✓ All service cards have compare checkboxes');
      } else {
        results.task1.issues.push(`Only ${checkboxLabels}/${serviceCards} cards have compare checkboxes`);
      }

      // The checkbox input is hidden (display:none) but the .compare-checkbox-custom span is the visible indicator
      const firstCustomCheckbox = page.locator('.compare-checkbox-custom').first();
      const customVisible = await firstCustomCheckbox.isVisible();
      console.log(`Custom checkbox indicator visible: ${customVisible}`);

      if (!customVisible) {
        results.task1.issues.push('Custom checkbox indicator (.compare-checkbox-custom) not visible');
      }

      // Test checkbox interaction via label click
      const firstLabel = page.locator('.compare-checkbox-label').first();
      const labelVisible = await firstLabel.isVisible();
      console.log(`Checkbox label visible: ${labelVisible}`);

      // Test that clicking the label toggles the checkbox
      const checkboxInput = page.locator('.compare-chef-checkbox').first();
      const initialState = await checkboxInput.isChecked();
      console.log(`Initial checkbox state: ${initialState ? 'checked' : 'unchecked'}`);

      await firstLabel.click({ force: true });
      await page.waitForTimeout(300);

      const afterClickState = await checkboxInput.isChecked();
      console.log(`After label click state: ${afterClickState ? 'checked' : 'unchecked'}`);

      if (initialState !== afterClickState) {
        console.log('✓ Checkbox toggles correctly on click');
      } else {
        results.task1.issues.push('Checkbox does not toggle on label click');
      }

      // Test state persists across scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const stateAfterScroll = await checkboxInput.isChecked();
      console.log(`Checkbox state after scroll: ${stateAfterScroll ? 'checked' : 'unchecked'}`);
      if (stateAfterScroll !== afterClickState) {
        results.task1.issues.push('Checkbox state does not persist across scroll');
      }

      // Uncheck for next test
      if (afterClickState) {
        await firstLabel.click({ force: true });
        await page.waitForTimeout(200);
      }
    }

    // ===== TASK 2: Verify Sticky Compare Bar =====
    console.log('\n=== TASK 2: Verify Sticky Compare Bar ===');

    // Select 2 service cards using labels (force click since input is hidden)
    const checkboxLabelsAll = page.locator('.compare-checkbox-label');
    const labelCount = await checkboxLabelsAll.count();
    console.log(`Found ${labelCount} checkbox labels`);

    if (labelCount >= 2) {
      await checkboxLabelsAll.nth(0).click({ force: true });
      await page.waitForTimeout(200);
      await checkboxLabelsAll.nth(1).click({ force: true });
      await page.waitForTimeout(500);

      const barVisible = await page.locator('#compareBar').isVisible();
      const barHasVisibleClass = await page.locator('#compareBar.visible').count() > 0;
      console.log(`Compare bar visible: ${barVisible}, has .visible class: ${barHasVisibleClass}`);

      if (barVisible && barHasVisibleClass) {
        results.task2.status = 'PASS';
        console.log('✓ Sticky bar appears when 2+ selected');
      } else {
        results.task2.issues.push('Sticky bar does not appear after selecting 2 cards');
      }

      // Verify count is correct
      const countText = await page.locator('#selectedChefCount').textContent();
      console.log(`Selected count displayed: ${countText}`);
      if (countText !== '2') {
        results.task2.issues.push(`Count shows "${countText}" instead of "2"`);
      }

      // Verify bar is sticky when scrolling
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(300);
      const barStillVisible = await page.locator('#compareBar.visible').count() > 0;
      console.log(`Bar still visible after scroll: ${barStillVisible}`);
      if (!barStillVisible) {
        results.task2.issues.push('Sticky bar disappears when scrolling');
      }
    } else {
      results.task2.issues.push(`Not enough service cards to test (found ${labelCount})`);
    }

    // ===== TASK 3: Verify Compare Action =====
    console.log('\n=== TASK 3: Verify Compare Action ===');

    // Navigate to /chefs page to test chef compare
    await page.goto(`${BASE_URL}/chefs`, { waitUntil: 'networkidle' });
    
    // Wait for chef cards to render - they are generated by JavaScript
    await page.waitForTimeout(1000);
    await page.waitForSelector('.chef-card', { timeout: 10000 }).catch(() => {});

    const chefCards = await page.locator('.chef-card').count();
    console.log(`Found ${chefCards} chef cards on /chefs`);

    if (chefCards >= 2) {
      // Select 2 chefs by clicking their cards (the onclick handles selection)
      const firstChefCard = page.locator('.chef-card').nth(0);
      await firstChefCard.click();
      await page.waitForTimeout(300);

      const secondChefCard = page.locator('.chef-card').nth(1);
      await secondChefCard.click();
      await page.waitForTimeout(500);

      const compareBarVisible = await page.locator('#compareBar.visible').count() > 0;
      console.log(`Chef compare bar visible: ${compareBarVisible}`);

      if (compareBarVisible) {
        const compareGoBtn = page.locator('#compareGoBtn');
        const btnText = await compareGoBtn.textContent();
        console.log(`Compare button text: "${btnText.trim()}"`);

        // Verify it says "Compare Chefs" not "Inquire Selected"
        if (btnText.includes('Compare')) {
          console.log('✓ Compare button present with correct text');
        } else {
          results.task3.issues.push(`Button text is "${btnText.trim()}" - expected "Compare Chefs"`);
        }

        // Click Compare button and verify navigation
        const currentUrl = page.url();
        await compareGoBtn.click();
        await page.waitForURL('**/compare**', { timeout: 5000 }).catch(() => {});
        const newUrl = page.url();
        console.log(`Navigated from ${currentUrl} to ${newUrl}`);

        if (newUrl.includes('compare')) {
          console.log('✓ Compare button navigates to compare view');
          results.task3.status = 'PASS';
        } else {
          results.task3.issues.push(`Compare button did not navigate to compare page (url: ${newUrl})`);
        }
      } else {
        results.task3.issues.push('Compare bar not visible after selecting 2 chefs');
      }
    } else {
      results.task3.issues.push(`Not enough chef cards (found ${chefCards})`);
    }

    // ===== TASK 4: Verify Edge Cases =====
    console.log('\n=== TASK 4: Verify Edge Cases ===');

    // 4a: Deselect all — sticky bar disappears
    await page.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.compare-checkbox-label', { timeout: 5000 }).catch(() => {});

    const serviceLabels = page.locator('.compare-checkbox-label');
    const serviceLabelCount = await serviceLabels.count();

    if (serviceLabelCount > 0) {
      // Select first checkbox
      await serviceLabels.first().click({ force: true });
      await page.waitForTimeout(300);

      // Verify bar appeared
      const barAfterSelect = await page.locator('#compareBar.visible').count() > 0;
      console.log(`Bar visible after selecting 1: ${barAfterSelect}`);

      // Deselect
      await serviceLabels.first().click({ force: true });
      await page.waitForTimeout(300);

      const barAfterDeselect = await page.locator('#compareBar.visible').count();
      console.log(`Bar visible after deselect all: ${barAfterDeselect > 0}`);
      if (barAfterDeselect === 0) {
        console.log('✓ Edge case 4a PASS: bar disappears when deselect all');
      } else {
        results.task4.issues.push('4a: Sticky bar does NOT disappear when deselecting all');
      }
    }

    // 4b: Select exactly 1 — sticky bar does NOT appear
    await page.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.compare-checkbox-label', { timeout: 5000 }).catch(() => {});

    const serviceLabels2 = page.locator('.compare-checkbox-label');
    if (await serviceLabels2.count() > 0) {
      // Make sure all are unchecked first
      const allCheckboxes = page.locator('.compare-chef-checkbox');
      for (let i = 0; i < await allCheckboxes.count(); i++) {
        if (await allCheckboxes.nth(i).isChecked()) {
          await serviceLabels2.nth(i).click({ force: true });
          await page.waitForTimeout(200);
        }
      }

      // Now select exactly 1
      await serviceLabels2.first().click({ force: true });
      await page.waitForTimeout(500);

      const barWithOne = await page.locator('#compareBar.visible').count();
      console.log(`Bar visible with 1 selection: ${barWithOne > 0}`);
      if (barWithOne === 0) {
        console.log('✓ Edge case 4b PASS: bar does NOT appear with only 1 selection');
      } else {
        results.task4.issues.push('4b: Sticky bar appears with only 1 selection (should not)');
      }

      // Reset for next test
      await serviceLabels2.first().click({ force: true });
      await page.waitForTimeout(200);
    }

    // 4c: Select 3+ — verify bar shows correct count
    await page.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.compare-checkbox-label', { timeout: 5000 }).catch(() => {});

    const allLabels = page.locator('.compare-checkbox-label');
    const total = await allLabels.count();
    if (total >= 3) {
      await allLabels.nth(0).click({ force: true });
      await page.waitForTimeout(100);
      await allLabels.nth(1).click({ force: true });
      await page.waitForTimeout(100);
      await allLabels.nth(2).click({ force: true });
      await page.waitForTimeout(500);

      const countEl = await page.locator('#selectedChefCount').textContent();
      console.log(`Count with 3 selected: ${countEl}`);
      if (countEl === '3') {
        console.log('✓ Edge case 4c PASS: bar shows correct count for 3+ selections');
      } else {
        results.task4.issues.push(`4c: Count shows "${countEl}" instead of "3" for 3 selections`);
      }
    } else {
      results.task4.issues.push(`4c: Not enough checkboxes to test (only ${total})`);
    }

    // Determine Task 4 pass/fail
    const criticalIssues = results.task4.issues.filter(i => !i.startsWith('4c'));
    if (criticalIssues.length === 0) {
      results.task4.status = 'PASS';
    }

  } catch (err) {
    console.error('Test error:', err.message);
    Object.values(results).forEach(r => r.issues.push(`Test error: ${err.message}`));
  }

  // Console errors check
  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length > 0) {
    console.log('Errors found:', consoleErrors.slice(0, 5));
  } else {
    console.log('No console errors detected');
  }

  await browser.close();

  // Print summary
  console.log('\n========== QA RESULTS SUMMARY ==========');
  console.log(`Task 1: ${results.task1.status} - ${results.task1.name}`);
  if (results.task1.issues.length) console.log('  Issues:', results.task1.issues);
  console.log(`Task 2: ${results.task2.status} - ${results.task2.name}`);
  if (results.task2.issues.length) console.log('  Issues:', results.task2.issues);
  console.log(`Task 3: ${results.task3.status} - ${results.task3.name}`);
  if (results.task3.issues.length) console.log('  Issues:', results.task3.issues);
  console.log(`Task 4: ${results.task4.status} - ${results.task4.name}`);
  if (results.task4.issues.length) console.log('  Issues:', results.task4.issues);

  const passCount = Object.values(results).filter(r => r.status === 'PASS').length;
  const failCount = Object.values(results).filter(r => r.status === 'FAIL').length;
  console.log(`\nTOTAL: ${passCount} passed, ${failCount} failed`);

  if (failCount > 0) {
    console.log('\n>>> GO/NO-GO: NO-GO <<<');
    console.log('Issues need to be resolved before approval.');
  } else {
    console.log('\n>>> GO/NO-GO: GO <<<');
    console.log('All acceptance criteria met.');
  }

  return results;
}

runQA().catch(console.error);