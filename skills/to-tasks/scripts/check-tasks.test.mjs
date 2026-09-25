import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkTasks } from './check-tasks.mjs';

const script = fileURLToPath(new URL('./check-tasks.mjs', import.meta.url));
const document = (a = 'not started', b = 'not started', edge = '#01 [FS]') => `# Tasks

## #01 First
Status: ${a}
Outcome: first
Done when: first is complete
Dependencies: none

## #02 Second
Status: ${b}
Outcome: second
Done when: second is complete
Dependencies: ${edge}
`;

test('FS gates starting and completion; frontier updates after completion', () => {
  assert.deepEqual(checkTasks(document()).ready, ['#01']);
  assert.deepEqual(checkTasks(document('done')).ready, ['#02']);
  const invalid = checkTasks(document('in progress', 'in progress'));
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(' '), /Status conflict.*FS/);
});

test('mutual SS permits simultaneous starts and reports a ready group', () => {
  const text = `## #01 First\n状态：未开始\n依赖：#02 [SS]\n## #02 Second\n**状态：** 未开始\n**依赖：** #01 [SS]\n`;
  const result = checkTasks(text);
  assert.equal(result.valid, true);
  assert.deepEqual(result.ready, []);
  assert.deepEqual(result.readyTogether, [['#01', '#02']]);
  assert.equal(checkTasks(text.replaceAll('未开始', '进行中')).valid, true);
});

test('one-way SS can start together; successor also becomes individually ready after predecessor starts', () => {
  const result = checkTasks(document('not started', 'not started', '#01 [SS]'));
  assert.deepEqual(result.ready, ['#01']);
  assert.deepEqual(result.readyTogether, [['#01', '#02']]);
  assert.deepEqual(checkTasks(document('in progress', 'not started', '#01 [SS]')).ready, ['#02']);
});

test('a task-level cycle may be feasible at the event level', () => {
  const text = `## #01 First\nStatus: not started\nDependencies: #02 [FF]\n## #02 Second\nStatus: not started\nDependencies: #01 [SS]\n`;
  assert.equal(checkTasks(text).valid, true);
});

test('an FS cycle is impossible and identifies the event cycle', () => {
  const text = `## #01 First\nStatus: not started\nDependencies: #02 [FS]\n## #02 Second\nStatus: not started\nDependencies: #01 [FS]\n`;
  const result = checkTasks(text);
  assert.equal(result.valid, false);
  assert.equal(result.cycles.length, 1);
  assert.match(result.errors.join(' '), /Impossible event cycle/);
  assert.deepEqual(result.ready, []);
});

test('FF permits simultaneous finishing; SF gates completion on predecessor starting', () => {
  const mutual = `## #01 First\nStatus: done\nDependencies: #02 [FF]\n## #02 Second\nStatus: done\nDependencies: #01 [FF]\n`;
  assert.equal(checkTasks(mutual).valid, true);
  assert.equal(checkTasks(document('not started', 'done', '#01 [SF]')).valid, false);
  assert.equal(checkTasks(document('in progress', 'done', '#01 [SF]')).valid, true);
  assert.equal(checkTasks(document('in progress', 'done', '#01 [FF]')).valid, false);
});

test('malformed references, duplicate IDs, and statuses are reported', () => {
  assert.match(checkTasks(document('not started', 'not started', '#99 [FS]')).errors.join(' '), /unknown predecessor/);
  assert.match(checkTasks(document('not started', 'not started', '#02 [SS]')).errors.join(' '), /cannot depend on itself/);
  assert.match(checkTasks(document('not started', 'not started', '#01 [wrong]')).errors.join(' '), /invalid dependency/);
  assert.match(checkTasks(document('maybe')).errors.join(' '), /invalid status/);
  assert.match(checkTasks(document().replace('## #02 Second', '## #01 Second')).errors.join(' '), /duplicate task/);
});

test('a blocker preserves progress and removes a task from the start frontier', () => {
  const blocked = document().replace('Dependencies: none', 'Dependencies: none\nBlocker: waiting for access');
  const result = checkTasks(blocked);
  assert.equal(result.valid, true);
  assert.deepEqual(result.ready, []);
  assert.deepEqual(result.blocked, [{ id: '#01', reason: 'waiting for access' }]);
  assert.deepEqual(checkTasks(blocked.replace('Blocker: waiting for access', 'Blocker: none')).ready, ['#01']);

  const overlap = document('not started', 'not started', '#01 [SS]')
    .replace('Dependencies: none', 'Dependencies: none\nBlocker: waiting for access');
  assert.deepEqual(checkTasks(overlap).readyTogether, []);
  const underway = overlap.replace('Status: not started', 'Status: in progress');
  assert.deepEqual(checkTasks(underway).ready, ['#02']);
  assert.deepEqual(checkTasks(underway).blocked, [{ id: '#01', reason: 'waiting for access' }]);
});

test('blocker fields need a reason and are cleared before completion', () => {
  const blockedDone = document('done').replace('Dependencies: none', 'Dependencies: none\nBlocker: waiting for access');
  assert.match(checkTasks(blockedDone).errors.join(' '), /clear Blocker/);
  const missing = document().replace('Dependencies: none', 'Dependencies: none\nBlocker:');
  assert.match(checkTasks(missing).errors.join(' '), /needs a blocker reason/);
  const duplicate = document().replace('Dependencies: none', 'Dependencies: none\nBlocker: access\nBlocker: review');
  assert.match(checkTasks(duplicate).errors.join(' '), /duplicate blocker/);
});

test('CLI accepts a file or stdin and returns a failure exit code on errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'to-tasks-'));
  try {
    const file = join(dir, 'tasks.md');
    writeFileSync(file, document());
    const fromFile = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
    assert.equal(fromFile.status, 0);
    assert.match(fromFile.stdout, /Ready individually: #01/);
    const fromStdin = spawnSync(process.execPath, [script, '--stdin', '--json'], { input: document(), encoding: 'utf8' });
    assert.equal(fromStdin.status, 0);
    assert.deepEqual(JSON.parse(fromStdin.stdout).ready, ['#01']);
    const invalid = spawnSync(process.execPath, [script, '--stdin'], { input: document('not started', 'in progress'), encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /INVALID task graph/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
