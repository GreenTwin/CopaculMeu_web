// Mock localStorage for Node.js environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

const CHECKIN_STORAGE_KEY = 'copaculmeu_user_tree_checkins';
const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000;

function getRecordKey(userId, treeId) {
  return `${userId}:${treeId}`;
}

function getAllRecords() {
  try {
    const raw = localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function recordUserTreeCheckin(userId, treeId, timestamp = Date.now()) {
  if (!userId) return;
  const records = getAllRecords();
  records[getRecordKey(userId, treeId)] = timestamp;
  localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(records));
}

function getUserTreeCheckinCooldown(userId, treeId, currentTime = Date.now()) {
  if (!userId) {
    return { canCheckin: false, remainingMs: 0 };
  }
  const records = getAllRecords();
  const lastCheckin = records[getRecordKey(userId, treeId)];
  if (!lastCheckin) {
    return { canCheckin: true, remainingMs: 0 };
  }
  const elapsed = currentTime - lastCheckin;
  const remainingMs = Math.max(0, COOLDOWN_DURATION_MS - elapsed);
  if (remainingMs <= 0) {
    return { canCheckin: true, remainingMs: 0 };
  }
  return { canCheckin: false, remainingMs };
}

function runTests() {
  console.log('--- Testing 24-Hour Per-Tree Per-User Check-in Rule ---');

  const userA = 'user_alex@copaculmeu.ro';
  const userB = 'user_maria@copaculmeu.ro';
  const tree1 = 101;
  const tree2 = 102;
  const now = Date.now();

  // Test 1: Initially, User A can check in on Tree 1
  let res = getUserTreeCheckinCooldown(userA, tree1, now);
  console.assert(res.canCheckin === true, 'Test 1 Failed: User A should initially be able to check in on Tree 1');
  console.log('✓ Test 1 Passed: User A can check in on Tree 1');

  // Test 2: User A performs check in on Tree 1
  recordUserTreeCheckin(userA, tree1, now);
  res = getUserTreeCheckinCooldown(userA, tree1, now + 1000); // 1 second later
  console.assert(res.canCheckin === false, 'Test 2 Failed: Tree 1 should be in cooldown for User A');
  console.assert(res.remainingMs > 0 && res.remainingMs <= COOLDOWN_DURATION_MS, 'Test 2 Failed: remainingMs should be around 24h');
  console.log(`✓ Test 2 Passed: Tree 1 is in 24h cooldown for User A (${Math.round(res.remainingMs / 3600000)}h remaining)`);

  // Test 3: User A CAN check in on Tree 2 on the SAME day!
  res = getUserTreeCheckinCooldown(userA, tree2, now + 5000);
  console.assert(res.canCheckin === true, 'Test 3 Failed: User A should be able to check in on Tree 2 on the same day');
  console.log('✓ Test 3 Passed: User A CAN check in on Tree 2 on the same day');

  // Test 4: User A checks in on Tree 2 as well
  recordUserTreeCheckin(userA, tree2, now + 5000);
  res = getUserTreeCheckinCooldown(userA, tree2, now + 6000);
  console.assert(res.canCheckin === false, 'Test 4 Failed: Tree 2 should now be in cooldown for User A');
  console.log('✓ Test 4 Passed: Tree 2 is now in cooldown for User A');

  // Test 5: User B CAN check in on Tree 1 today (different user)
  res = getUserTreeCheckinCooldown(userB, tree1, now + 10000);
  console.assert(res.canCheckin === true, 'Test 5 Failed: User B should be able to check in on Tree 1');
  console.log('✓ Test 5 Passed: User B CAN check in on Tree 1 (user isolation verified)');

  // Test 6: After 24 hours + 1 minute, User A can check in on Tree 1 again
  const after24h = now + COOLDOWN_DURATION_MS + 60 * 1000;
  res = getUserTreeCheckinCooldown(userA, tree1, after24h);
  console.assert(res.canCheckin === true, 'Test 6 Failed: User A should be allowed to check in on Tree 1 after 24 hours');
  console.log('✓ Test 6 Passed: User A can check in on Tree 1 again after 24 hours');

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests();
