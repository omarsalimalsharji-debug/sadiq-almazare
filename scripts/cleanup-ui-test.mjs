import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export default async function cleanupUiTestData() {
  const tempRoot = process.env.FARMER_FRIEND_UI_TMP;
  const safePrefix = path.join(os.tmpdir(), 'farmer-friend-ui-');
  if (tempRoot && path.resolve(tempRoot).startsWith(safePrefix)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
