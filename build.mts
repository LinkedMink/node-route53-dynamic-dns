#!/usr/bin/env bun

const result = await Bun.build({
  entrypoints: ["./src/index.mts"],
  outdir: "./dist",
});

console.log(result);
