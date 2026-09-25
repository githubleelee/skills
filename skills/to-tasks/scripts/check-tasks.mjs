#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const statuses = new Map([
  ['not started', 'not started'], ['in progress', 'in progress'], ['done', 'done'],
  ['未开始', 'not started'], ['进行中', 'in progress'], ['已完成', 'done'],
]);
const kinds = new Set(['FS', 'SS', 'FF', 'SF']);
const key = id => BigInt(id).toString();
const started = task => task.status !== 'not started';
const finished = task => task.status === 'done';
const order = (a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0;

export function parseTasks(markdown) {
  const tasks = [];
  const errors = [];
  let current;
  let fence;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const fenced = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenced) {
      if (!fence) fence = fenced[1][0];
      else if (fence === fenced[1][0]) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^#{2,6}\s+#(\d+)\s+(.+?)\s*$/);
    if (heading) {
      const id = key(heading[1]);
      if (id === '0') errors.push(`Line ${index + 1}: task numbers start at #01.`);
      current = { id, label: `#${heading[1]}`, title: heading[2], line: index + 1, dependencies: [] };
      tasks.push(current);
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s*(?:\*\*)?(Status|状态|Dependencies|依赖|Blocker|阻碍)(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*(.*?)\s*$/i);
    if (!field) continue;
    const value = field[2].trim();
    if (/^(Status|状态)$/i.test(field[1])) {
      if (current.status !== undefined) errors.push(`Line ${index + 1}: duplicate status for ${current.label}.`);
      current.status = statuses.get(value.toLowerCase());
      if (!current.status) errors.push(`Line ${index + 1}: invalid status ${JSON.stringify(value)}.`);
    } else if (/^(Blocker|阻碍)$/i.test(field[1])) {
      if (current.hasBlocker) errors.push(`Line ${index + 1}: duplicate blocker for ${current.label}.`);
      current.hasBlocker = true;
      if (!value) errors.push(`Line ${index + 1}: ${current.label} needs a blocker reason.`);
      else if (!/^(none|无|—|-)$/i.test(value)) current.blocker = value;
    } else {
      if (current.hasDependencies) errors.push(`Line ${index + 1}: duplicate dependencies for ${current.label}.`);
      current.hasDependencies = true;
      if (/^(none|无|—|-)$/i.test(value)) continue;
      for (const item of value.split(/[,，]/)) {
        const edge = item.trim().match(/^#(\d+)\s*\[\s*([A-Za-z]{2})\s*\]$/);
        if (!edge || !kinds.has(edge[2].toUpperCase())) {
          errors.push(`Line ${index + 1}: invalid dependency ${JSON.stringify(item.trim())}; use #01 [FS].`);
          continue;
        }
        current.dependencies.push({ id: key(edge[1]), label: `#${edge[1]}`, type: edge[2].toUpperCase() });
      }
    }
  }
  if (tasks.length === 0) errors.push('No tasks found; use headings such as "## #01 Task title".');
  const seen = new Set();
  for (const task of tasks) {
    if (seen.has(task.id)) errors.push(`Line ${task.line}: duplicate task ${task.label}.`);
    seen.add(task.id);
    if (!task.status) errors.push(`Line ${task.line}: ${task.label} needs Status: not started | in progress | done.`);
    if (!task.hasDependencies) errors.push(`Line ${task.line}: ${task.label} needs Dependencies: none or #01 [FS].`);
    if (task.blocker && task.status === 'done') errors.push(`${task.label}: clear Blocker before marking the task done.`);
  }
  return { tasks, errors };
}

function components(graph) {
  const indices = Array(graph.length).fill(-1);
  const lows = Array(graph.length).fill(-1);
  const active = new Set();
  const stack = [];
  const result = [];
  let next = 0;
  function visit(node) {
    indices[node] = lows[node] = next++;
    stack.push(node);
    active.add(node);
    for (const edge of graph[node]) {
      const to = edge.to;
      if (indices[to] === -1) {
        visit(to);
        lows[node] = Math.min(lows[node], lows[to]);
      } else if (active.has(to)) {
        lows[node] = Math.min(lows[node], indices[to]);
      }
    }
    if (lows[node] === indices[node]) {
      const group = [];
      let member;
      do {
        member = stack.pop();
        active.delete(member);
        group.push(member);
      } while (member !== node);
      result.push(group);
    }
  }
  for (let node = 0; node < graph.length; node++) if (indices[node] === -1) visit(node);
  return result;
}

function findPath(graph, from, to, permitted) {
  const queue = [from];
  const previous = new Map([[from, null]]);
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === to) break;
    for (const edge of graph[node]) {
      if (permitted.has(edge.to) && !previous.has(edge.to)) {
        previous.set(edge.to, { node, edge });
        queue.push(edge.to);
      }
    }
  }
  if (!previous.has(to)) return [];
  const path = [];
  for (let node = to; node !== from;) {
    const entry = previous.get(node);
    path.unshift(entry.edge);
    node = entry.node;
  }
  return path;
}

export function checkTasks(markdown) {
  const { tasks, errors } = parseTasks(markdown);
  const blocked = tasks.filter(task => task.blocker).sort(order).map(task => ({ id: task.label, reason: task.blocker }));
  const result = { valid: false, errors, cycles: [], ready: [], readyTogether: [], blocked, taskCount: tasks.length, edgeCount: 0 };
  if (errors.length) return result;
  const byId = new Map(tasks.map(task => [task.id, task]));
  for (const task of tasks) for (const dep of task.dependencies) {
    result.edgeCount++;
    if (!byId.has(dep.id)) errors.push(`${task.label}: unknown predecessor ${dep.label} [${dep.type}].`);
    if (dep.id === task.id) errors.push(`${task.label}: a task cannot depend on itself (${dep.type}).`);
  }
  if (errors.length) return result;

  const nodes = new Map();
  for (const task of tasks) {
    nodes.set(`${task.id}:start`, nodes.size);
    nodes.set(`${task.id}:finish`, nodes.size);
  }
  const graph = Array.from({ length: nodes.size }, () => []);
  const names = Array.from({ length: nodes.size });
  for (const task of tasks) {
    names[nodes.get(`${task.id}:start`)] = `${task.label} start`;
    names[nodes.get(`${task.id}:finish`)] = `${task.label} finish`;
  }
  function connect(a, b, label, strict = false) {
    const from = nodes.get(a);
    const edge = { from, to: nodes.get(b), label, strict };
    graph[from].push(edge);
    return edge;
  }
  for (const task of tasks) connect(`${task.id}:start`, `${task.id}:finish`, `${task.label} work`, true);
  for (const task of tasks) for (const dep of task.dependencies) {
    const before = dep.type[0] === 'F' ? 'finish' : 'start';
    const after = dep.type[1] === 'F' ? 'finish' : 'start';
    connect(`${dep.id}:${before}`, `${task.id}:${after}`, `${byId.get(dep.id).label} [${dep.type}] → ${task.label}`);
    const predecessor = byId.get(dep.id);
    const targetOccurred = after === 'start' ? started(task) : finished(task);
    const requiredOccurred = before === 'start' ? started(predecessor) : finished(predecessor);
    if (targetOccurred && !requiredOccurred) {
      errors.push(`Status conflict: ${task.label} ${after} occurred, but ${predecessor.label} ${before} has not (${dep.type}).`);
    }
  }
  for (const group of components(graph)) {
    const members = new Set(group);
    const strict = group.flatMap(node => graph[node]).find(edge => edge.strict && members.has(edge.to));
    if (!strict) continue;
    const path = [strict, ...findPath(graph, strict.to, strict.from, members)];
    result.cycles.push(path.map(edge => ({ from: names[edge.from], to: names[edge.to], via: edge.label })));
    errors.push(`Impossible event cycle: ${path.map(edge => names[edge.from]).join(' → ')} → ${names[strict.from]}.`);
  }
  if (errors.length) return result;

  const pending = tasks.filter(task => !started(task));
  function fsSatisfied(task) {
    return task.dependencies.filter(dep => dep.type === 'FS').every(dep => finished(byId.get(dep.id)));
  }
  function startSatisfied(task) {
    return fsSatisfied(task) && task.dependencies.filter(dep => dep.type === 'SS').every(dep => started(byId.get(dep.id)));
  }
  result.ready = pending.filter(task => !task.blocker && startSatisfied(task)).sort(order).map(task => task.label);

  const groups = new Map();
  for (const task of pending) {
    const closure = new Map();
    const visit = item => {
      if (closure.has(item.id)) return;
      closure.set(item.id, item);
      for (const dep of item.dependencies) {
        if (dep.type === 'SS' && !started(byId.get(dep.id))) visit(byId.get(dep.id));
      }
    };
    visit(task);
    if (closure.size < 2 || ![...closure.values()].every(item => !item.blocker && fsSatisfied(item))) continue;
    const members = [...closure.values()].sort(order).map(item => item.label);
    groups.set(members.join(','), members);
  }
  result.readyTogether = [...groups.values()].sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()));
  result.valid = true;
  return result;
}

function format(result) {
  if (!result.valid) {
    return ['INVALID task graph:', ...result.errors.map(error => `  - ${error}`),
      ...result.cycles.flatMap((cycle, i) => [`  Cycle ${i + 1}:`, ...cycle.map(edge => `    ${edge.from} → ${edge.to} (${edge.via})`)])].join('\n');
  }
  return [`VALID: ${result.taskCount} tasks, ${result.edgeCount} dependencies.`,
    `Ready individually: ${result.ready.join(', ') || 'none'}.`,
    `Ready together: ${result.readyTogether.map(group => group.join(' + ')).join('; ') || 'none'}.`,
    `Blocked: ${result.blocked.map(item => `${item.id} (${item.reason})`).join('; ') || 'none'}.`].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const sources = args.filter(arg => arg !== '--json');
  if (sources.length !== 1 || sources[0] === '--help') {
    console.error('Usage: node check-tasks.mjs <tasks.md | --stdin> [--json]');
    process.exitCode = 2;
  } else {
    try {
      const text = readFileSync(sources[0] === '--stdin' ? 0 : sources[0], 'utf8');
      const result = checkTasks(text);
      console.log(json ? JSON.stringify(result, null, 2) : format(result));
      if (!result.valid) process.exitCode = 1;
    } catch (error) {
      console.error(`Cannot check tasks: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
