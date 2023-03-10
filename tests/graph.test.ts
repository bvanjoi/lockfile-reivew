import { test } from 'uvu';
import { equal } from 'uvu/assert';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import { createLockfileGraph, diffGraph } from '../src';
import type { Graph } from '../src';

test('basic circular should works', async () => {
  const lockfile0 = await load(path.resolve(__dirname, './fixture/case0.yaml'));
  const lockfile1 = await load(path.resolve(__dirname, './fixture/case1.yaml'));
  const diff = diffGraph(lockfile0, lockfile1);
  expect(diff.importers.added.length).toBe(0);
  expect(diff.importers.deleted.length).toBe(0);
  expect(diff.packages.added.length).toBe(0);
  expect(diff.packages.deleted.length).toBe(0);
})

test('should works for add dependency', async () => {
  const lockfile1 = await load(path.resolve(__dirname, './fixture/case1.yaml'));
  const lockfile2 = await load(path.resolve(__dirname, './fixture/case2.yaml'));
  const diff = diffGraph(lockfile1, lockfile2);
  const added = diff.packages.added;
  expect(added.length).toBe(3);
  expect(lockfile2.whoImportThisPackage(added[0])).toBe([['packages/b', '/react@18.0.0', '/loose-envify@1.4.0', '/js-tokens@4.0.0']])
  expect(lockfile2.whoImportThisPackage(added[1])).toBe([['packages/b', '/react@18.0.0', '/loose-envify@1.4.0']])
  expect(lockfile2.whoImportThisPackage(added[2])).toBe([['packages/b', '/react@18.0.0']])
})

test('should works for modified', async () => {
  const lockfile2 = await load(path.resolve(__dirname, './fixture/case2.yaml'));
  const lockfile3 = await load(path.resolve(__dirname, './fixture/case3.yaml'));
  const diff = diffGraph(lockfile2, lockfile3);
  const { added, deleted } = diff.packages;
  expect(added.length).toBe(1);
  expect(deleted.length).toBe(1);
  expect(lockfile3.whoImportThisPackage(added[0])).toBe([['packages/b', '/react@18.1.0']])
  expect(lockfile2.whoImportThisPackage(deleted[0])).toBe([['packages/b', '/react@18.0.0']])
})

test('should works diff importers and pnpm-lock versions', async () => {
  const lockfile3 = await load(path.resolve(__dirname, './fixture/case3.yaml'));
  const lockfile4 = await load(path.resolve(__dirname, './fixture/case4.yaml'));
  const diff = diffGraph(lockfile3, lockfile4);
  {
    const { added, deleted } = diff.importers
    expect(added.length).toBe(2);
    expect(deleted.length).toBe(3);
  }
  {
    const { added, deleted } = diff.packages;
    expect(added.length).toBe(1);
    expect(deleted.length).toBe(0);
  }
})

test.run();

function expect(value: any) {
  return {
    toBe(another: any) {
      return equal(value, another)
    }
  }
}

async function load(lockfilePath: string): Promise<Graph> {
  const content = (await fs.readFile(lockfilePath)).toString('utf-8');
  const loaded = yaml.load(content);
  return createLockfileGraph(loaded)
}
