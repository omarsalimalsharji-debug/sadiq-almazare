import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'farmer-friend-smoke-'));
const dataDir = path.join(tempRoot, 'data');
const mediaDir = path.join(tempRoot, 'media');
await Promise.all([mkdir(dataDir, { recursive: true }), mkdir(mediaDir, { recursive: true })]);

const seedFarm = { ownerId: 'legacy-smoke-user', ownerName: 'مزارع تجريبي', points: 77, level: 3 };
const seedCompetition = { id: 'legacy-smoke-competition', title: 'سجل قديم', isActive: false };
await writeFile(path.join(dataDir, 'storage.json'), JSON.stringify({
  adminAuth: { salt: 'smoke-salt', hash: '00', mustChangePassword: false, bootstrapConsumed: true, updatedAt: 1 },
  virtualFarms: { 'legacy-smoke-user': seedFarm },
  farmCompetitions: [seedCompetition],
  farmFriendships: [{ id: 'legacy-friendship' }],
  farmReports: [{ id: 'legacy-report' }],
  pointRules: { dailyLogin: 5 },
}), 'utf8');

const portServer = net.createServer();
await new Promise((resolve, reject) => {
  portServer.once('error', reject);
  portServer.listen(0, '127.0.0.1', resolve);
});
const { port } = portServer.address();
await new Promise((resolve) => portServer.close(resolve));

const child = spawn(process.execPath, [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'server.ts'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    DATA_DIR: dataDir,
    MEDIA_STORE_DIR: mediaDir,
    ADMIN_BOOTSTRAP_PASSWORD: 'Smoke-Only-Not-A-Real-Credential-123!',
    TRUST_PROXY_HOPS: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let childOutput = '';
child.stdout.on('data', (chunk) => { childOutput += chunk.toString(); });
child.stderr.on('data', (chunk) => { childOutput += chunk.toString(); });

const baseUrl = `http://127.0.0.1:${port}`;
let started = false;
try {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early.\n${childOutput}`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
      if (response.ok) { started = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(started, `Server did not become ready.\n${childOutput}`);

  const seasonal = await fetch(`${baseUrl}/api/seasonal/config`, { signal: AbortSignal.timeout(5000) });
  assert.equal(seasonal.status, 200);
  assert.equal((await seasonal.json()).success, true);

  const oldFarm = await fetch(`${baseUrl}/api/virtual-farm/state?userId=legacy-smoke-user`, { signal: AbortSignal.timeout(5000) });
  assert.ok(!oldFarm.headers.get('content-type')?.includes('application/json'), 'Old farm API must not remain active.');

  const illustration = await fetch(`${baseUrl}/assets/challenge/oman-date-palm.svg`, { signal: AbortSignal.timeout(5000) });
  assert.equal(illustration.status, 200);
  assert.ok((await illustration.text()).includes('نخلة عمانية'));

  const score = await fetch(`${baseUrl}/api/scores/submit`, {
    signal: AbortSignal.timeout(5000),
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: 'smoke-player',
      userName: 'مزارع الاختبار',
      userGovernorate: 'سلطنة عُمان',
      gameType: 'image_id',
      answers: [{ questionId: 'img-date-palm', selectedIndex: 0, timeTakenSec: 10 }],
      clientNonce: `smoke-${Date.now()}`,
    }),
  });
  assert.equal(score.status, 200);
  const scoreResult = await score.json();
  assert.equal(scoreResult.success, true);
  assert.equal(scoreResult.verifiedScore, 120);

  const persisted = JSON.parse(await readFile(path.join(dataDir, 'storage.json'), 'utf8'));
  assert.deepEqual(persisted.legacyFarmArchive.virtualFarms['legacy-smoke-user'], seedFarm);
  assert.deepEqual(persisted.legacyFarmArchive.farmCompetitions, [seedCompetition]);
  assert.deepEqual(persisted.legacyFarmArchive.farmFriendships, [{ id: 'legacy-friendship' }]);
  assert.deepEqual(persisted.legacyFarmArchive.farmReports, [{ id: 'legacy-report' }]);
  assert.deepEqual(persisted.legacyFarmArchive.pointRules, { dailyLogin: 5 });
  assert.ok(!Object.hasOwn(persisted, 'virtualFarms'), 'Legacy records must live in the archive after migration.');

  console.log('Server smoke test passed: API, image asset, score verification, legacy farm archive, and retired route.');
} finally {
  const exited = new Promise((resolve) => {
    if (child.exitCode !== null) return resolve(true);
    child.once('exit', () => resolve(true));
  });
  child.kill('SIGTERM');
  const graceful = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve(false), 3000))]);
  if (!graceful && child.exitCode === null) child.kill('SIGKILL');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1000))]);
  await rm(tempRoot, { recursive: true, force: true });
}
