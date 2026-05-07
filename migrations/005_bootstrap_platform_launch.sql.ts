import 'dotenv/config';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || './data/maison.db';
const sqlite = new Database(databaseUrl);

console.log('=== MAI-1183: Bootstrap Platform Launch Fix ===\n');
console.log(`Database: ${databaseUrl}\n`);

// Step 1: Fix is_onboarding_service flag
console.log('Step 1: Fixing is_onboarding_service flag...');
const serviceResult = sqlite.prepare('SELECT id, is_onboarding_service, status FROM services WHERE id = 1').get();
console.log(`  Before: Service id=1 has is_onboarding_service=${serviceResult?.is_onboarding_service}, status=${serviceResult?.status}`);

sqlite.prepare('UPDATE services SET is_onboarding_service = 1 WHERE id = 1').run();
console.log('  ✓ Set is_onboarding_service = 1 for service id=1');

// Step 2: Bootstrap chef_onboarding_state
console.log('\nStep 2: Bootstrapping chef_onboarding_state...');
const existingState = sqlite.prepare('SELECT id FROM chef_onboarding_state WHERE chef_id = 1').get();
if (existingState) {
  console.log('  ℹ chef_onboarding_state already exists for chef_id=1, updating...');
  sqlite.prepare(`
    UPDATE chef_onboarding_state 
    SET current_step = 4, step4_completed = 1, updated_at = unixepoch()
    WHERE chef_id = 1
  `).run();
} else {
  sqlite.prepare(`
    INSERT INTO chef_onboarding_state (chef_id, current_step, step4_completed, created_at, updated_at)
    VALUES (1, 4, 1, unixepoch(), unixepoch())
  `).run();
  console.log('  ✓ Inserted chef_onboarding_state for chef_id=1');
}

// Step 3: Mark chef onboarding complete
console.log('\nStep 3: Marking chef onboarding complete...');

// Check if chef_profiles has a record for user_id=1
const chefProfile = sqlite.prepare('SELECT id, onboarding_completed_at FROM chef_profiles WHERE user_id = 1').get();
if (chefProfile) {
  sqlite.prepare(`
    UPDATE chef_profiles 
    SET profile_completed_at = unixepoch(), onboarding_completed_at = unixepoch()
    WHERE user_id = 1
  `).run();
  console.log('  ✓ Updated chef_profiles for user_id=1');
} else {
  console.log('  ⚠ No chef_profiles record found for user_id=1');
}

sqlite.prepare('UPDATE users SET has_completed_onboarding = 1 WHERE id = 1').run();
console.log('  ✓ Set has_completed_onboarding = 1 for user id=1');

// Step 4: Publish service
console.log('\nStep 4: Publishing service...');
sqlite.prepare("UPDATE services SET status = 'published' WHERE id = 1").run();
console.log('  ✓ Set status = published for service id=1');

// Step 5: Verify all changes
console.log('\n=== Verification ===\n');

const verifyService = sqlite.prepare('SELECT id, is_onboarding_service, status FROM services WHERE id = 1').get();
console.log(`Service id=1: is_onboarding_service=${verifyService.is_onboarding_service}, status=${verifyService.status}`);

const verifyOnboardingState = sqlite.prepare('SELECT chef_id, current_step, step4_completed FROM chef_onboarding_state WHERE chef_id = 1').get();
console.log(`chef_onboarding_state: chef_id=${verifyOnboardingState?.chef_id}, current_step=${verifyOnboardingState?.current_step}, step4_completed=${verifyOnboardingState?.step4_completed}`);

const verifyChefProfile = sqlite.prepare('SELECT user_id, profile_completed_at, onboarding_completed_at FROM chef_profiles WHERE user_id = 1').get();
console.log(`chef_profiles: user_id=${verifyChefProfile?.user_id}, profile_completed_at=${verifyChefProfile?.profile_completed_at}, onboarding_completed_at=${verifyChefProfile?.onboarding_completed_at}`);

const verifyUser = sqlite.prepare('SELECT id, has_completed_onboarding FROM users WHERE id = 1').get();
console.log(`users: id=${verifyUser.id}, has_completed_onboarding=${verifyUser.has_completed_onboarding}`);

console.log('\n=== Acceptance Criteria Check ===');
console.log(`✓ Service id=1 has is_onboarding_service = ${verifyService.is_onboarding_service} (expected: 1)`);
console.log(`✓ chef_onboarding_state has record for chef_id=1: ${verifyOnboardingState ? 'YES' : 'NO'}`);
console.log(`✓ chef_profiles.onboarding_completed_at is ${verifyChefProfile?.onboarding_completed_at ? 'NOT null' : 'null'} (expected: NOT null)`);
console.log(`✓ users.has_completed_onboarding = ${verifyUser.has_completed_onboarding} (expected: 1)`);
console.log(`✓ services.status = '${verifyService.status}' (expected: 'published')`);

sqlite.close();
console.log('\n✓ Migration complete');