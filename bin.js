#!/usr/bin/env node
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
lockfile-review [target-lockfile] [current-lockfile]
lr [target-lockfile] [current-lockfile]

Options:
  --path:        Show the introduction path
  --workspace:   Differentiation by workspace
`);
  process.exit(0);
}

const path = require('path');
const fs = require('fs/promises');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { createLockfileGraph, compare } = require('./lib/index');

async function readTask() {
  const targetPath = args[0];
  const currentPath = args[1];
  async function task(p) {
    return fs.readFile(path.resolve(p)).catch(() =>
      fs.readFile(path.resolve(path.dirname(p), 'pnpm-lock.yaml'))
    ).then(content => yaml.load(content.toString('utf-8')))
  }
  const [target, current] = await Promise.all([task(targetPath), task(currentPath)])
  return { target, current }
}

async function run() {
  const { target, current } = await readTask();
  const targetGraph = createLockfileGraph(target);
  const currentGraph = createLockfileGraph(current);
  const compared = compare(targetGraph, currentGraph);

  const showPaths = args.includes('--path');
  const showWorkspace = args.includes('--workspace')

  if (!showPaths && !showWorkspace) {
    const { added, deleted } = compared.show()
    const buffer = [
      ...deleted.map((key) => chalk.red(`- ${key}`)),
      ...added.map((key) => chalk.green(`+ ${key}`))
    ]
    if (buffer.length > 0) {
      console.log(buffer.join('\n'))
    }
    return;
  }

  if (showPaths && showWorkspace) {
    const changed = compared.showWorkspaceAndPath();
    const buffer = []
    for (const importerId in changed) {
      buffer.push(`${importerId}:`);
      for (const key in changed[importerId].deleted) {
        buffer.push(chalk.red(` - ${key}:`))
        buffer.push(...changed[importerId].deleted[key].map(p => p.join(' -> ')).map(item => `     ${item}`))
      }
      for (const key in changed[importerId].added) {
        buffer.push(chalk.green(` + ${key}:`))
        buffer.push(...changed[importerId].added[key].map(p => p.join(' -> ')).map(item => `     ${item}`))
      }
    }
    if (buffer.length > 0) {
      console.log(buffer.join('\n'))
    }
  } else if (showWorkspace) {
    const changed = compared.showWorkspace();
    const buffer = [];
    for (const importerId in changed) {
      buffer.push(`${importerId}:`)
      buffer.push(...changed[importerId].deleted.map(key => chalk.red(`  - ${key}`)))
      buffer.push(...changed[importerId].added.map(key => chalk.green(`  + ${key}`)))
    }
    if (buffer.length > 0) {
      console.log(buffer.join('\n'))
    }
  } else if (showPaths) {
    const { added, deleted } = compared.showPath();
    const buffer = [];
    for (const key in deleted) {
      buffer.push(chalk.red(`- ${key}:`));
      buffer.push(...deleted[key].map(item => item.join(' -> ')).map(item => `   ${item}`))
    }
    for (const key in added) {
      buffer.push(chalk.green(`+ ${key}:`));
      buffer.push(...added[key].map(item => item.join(' -> ')).map(item => `   ${item}`))
    }
    if (buffer.length > 0) {
      console.log(buffer.join('\n'))
    }
  }
}

run();
