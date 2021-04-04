import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "dist/model.js",
  output: {
    format: "cjs"
  },
  plugins: [
    resolve({ preferBuiltins: false, mainFields: ["jsnext"] }),
    commonjs({ ignore: ['./model'] })
  ]
};
