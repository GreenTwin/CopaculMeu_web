async function testFullAuthFlow() {
  const host = 'http://localhost:8080';
  const testEmail = `volunteer_${Date.now()}@timisoara.ro`;
  const testPassword = 'SafePassword2026!';
  const testName = 'Alexandru Timișoreanul';

  console.log('1. Testing Registration...');
  const regRes = await fetch(`${host}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: testName,
    }),
  });
  console.log('   Registration status:', regRes.status);
  const regData = await regRes.json();
  console.log('   Registered User ID:', regData.id, '| Role:', regData.role);

  console.log('2. Testing Login...');
  const loginRes = await fetch(`${host}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log('   Login status:', loginRes.status);
  const loginData = await loginRes.json();
  console.log('   JWT received:', loginData.accessToken ? 'YES (Length: ' + loginData.accessToken.length + ')' : 'NO');
  console.log('   User profile:', loginData.user.name, '(', loginData.user.email, ')');

  console.log('3. Testing GET /api/auth/me with Bearer token...');
  const meRes = await fetch(`${host}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${loginData.accessToken}`,
    },
  });
  console.log('   Me status:', meRes.status);
  const meData = await meRes.json();
  console.log('   Verified user from token:', meData.name, '| Status:', meData.status);

  console.log('4. Testing Logout...');
  const logoutRes = await fetch(`${host}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginData.accessToken}`,
    },
  });
  console.log('   Logout status:', logoutRes.status);

  console.log('5. Testing GET /api/auth/me after logout (revocation check)...');
  const meAfterLogoutRes = await fetch(`${host}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${loginData.accessToken}`,
    },
  });
  console.log('   Me after logout status:', meAfterLogoutRes.status);

  console.log('All tests finished successfully!');
}

testFullAuthFlow().catch(console.error);
