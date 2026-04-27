module.exports = {
	env: {
		browser: true,
		es6: true,
		node: true,
		jquery: true,
	},
	extends: ["eslint:recommended"],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module",
	},
	globals: {
		// Frappe globals
		frappe: "readonly",
		__: "readonly",
		$: "readonly",
		jQuery: "readonly",
		window: "readonly",
		document: "readonly",

		// Custom globals for workspace embedder
		WorkspacePageEmbedder: "writable",
	},
	rules: {
		"no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		"no-console": "warn",
		"prefer-const": "error",
		"no-var": "error",
	},
};