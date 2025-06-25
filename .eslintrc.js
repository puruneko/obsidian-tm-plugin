module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: { node: true },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parserOptions: {
    sourceType: "module",
  },
  rules: {
    /*
    "@typescript-eslint/no-unused-vars": [
      2,
      { args: "all", argsIgnorePattern: "^_" },
    ],
    */
    "no-unused-vars": "off", //使わない変数は宣言するな->無視
    "@typescript-eslint/no-unused-vars": "off", //["error", { args: "none" }],
    "@typescript-eslint/ban-ts-comment": "off",
    "no-prototype-builtins": "off",
    "@typescript-eslint/no-empty-function": "off", //コードが空の関数は書くな->無視
    "prefer-const": "off", //再代入されないletはconstにしろ->無視
    "@typescript-eslint/no-inferrable-types": "off", //明らかに推論できる型は書くな->無視
  },
};
