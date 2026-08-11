#!/usr/bin/env node
import path from 'node:path';
import { parseCli } from './lib/config.mjs';
import { prepareWorldBankDataset } from './lib/dataset.mjs';

const args = parseCli();
const outDir = path.resolve(args.out || process.env.SFI_CL_DATA_DIR || '.sfi-cl/data/world-bank');
const manifest = await prepareWorldBankDataset({ outDir });
console.log(JSON.stringify({ ok: true, outDir, manifest }, null, 2));
