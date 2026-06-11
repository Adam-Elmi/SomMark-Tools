import { nodeResolve } from "@rollup/plugin-node-resolve";

const banner = `/* sommark-highlight | MIT License | https://github.com/Adam-Elmi/SomMark-Highlight */`;

export default [
  {
    input: "index.js",
    output: {
      file: "dist/sommark-highlight.js",
      format: "iife",
      name: "SomMarkHighlight",
      banner,
    },
  },
  {
    input: "src/cdn.js",
    output: {
      file: "dist/sommark-highlight.full.js",
      format: "iife",
      name: "SomMarkHighlight",
      banner,
    },
    plugins: [nodeResolve()],
  },
];
