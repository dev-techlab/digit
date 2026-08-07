import { randomBytes } from 'crypto';
async function test() {
  const loginRes = await fetch('http://localhost:3210/api/agent/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Deluxe001', password: 'deluxe123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  // console.log('Login cookie:', cookie);

  const walletRes = await fetch('http://localhost:3210/api/agent/wallet', {
    headers: { Cookie: cookie || '' }
  });
  // console.log('Wallet status:', walletRes.status);
  const text = await walletRes.text();
  // console.log('Wallet body:', text.substring(0, 500));
}
test().catch(console.error);
