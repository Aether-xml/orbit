// Android ARM64: rollup native binary → WASM fallback (absolute symlink)
const fs   = require('fs')
const path = require('path')

const root      = path.resolve(__dirname, '..')
const rollupPath = path.join(root, 'node_modules/rollup')
const wasmPath   = path.join(root, 'node_modules/@rollup/wasm-node')

try { fs.rmSync(rollupPath, { recursive: true, force: true }) } catch (_) { /* ignore */ }

if (fs.existsSync(wasmPath)) {
  fs.symlinkSync(wasmPath, rollupPath)
}
