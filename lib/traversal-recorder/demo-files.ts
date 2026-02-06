/**
 * Generate demo files for testing traversal visualization.
 * Returns a Record<string, string> compatible with bash-tool's files option.
 */
export function generateDemoFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  // Package.json
  files["package.json"] = JSON.stringify(
    {
      name: "demo-project",
      version: "1.0.0",
      scripts: {
        dev: "node src/index.js",
        test: "node tests/test.js",
        build: "node scripts/build.js",
      },
      dependencies: {
        express: "^4.18.0",
        lodash: "^4.17.21",
        dotenv: "^16.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
      },
    },
    null,
    2
  );

  // Source files
  const srcFiles = [
    "index.js",
    "server.js",
    "utils.js",
    "config.js",
    "database.js",
  ];
  srcFiles.forEach((name) => {
    files[`src/${name}`] =
      `// ${name}\nexport function ${name.replace(".js", "")}() {\n  console.log('${name}');\n}\n`;
  });

  // Components
  const components = ["Button", "Card", "Modal", "Header", "Footer", "Sidebar"];
  components.forEach((name) => {
    files[`src/components/${name}.jsx`] =
      `export function ${name}({ children }) {\n  return <div className="${name.toLowerCase()}">{children}</div>;\n}\n`;
  });

  // API routes
  const routes = ["users", "posts", "comments", "auth", "settings"];
  routes.forEach((name) => {
    files[`src/api/${name}.js`] =
      `export async function get${name.charAt(0).toUpperCase() + name.slice(1)}(req, res) {\n  return res.json({ ${name}: [] });\n}\n`;
  });

  // Hooks
  const hooks = ["useAuth", "useApi", "useLocalStorage"];
  hooks.forEach((name) => {
    files[`src/hooks/${name}.js`] =
      `import { useState, useEffect } from 'react';\n\nexport function ${name}() {\n  const [state, setState] = useState(null);\n  return state;\n}\n`;
  });

  // Tests
  files["tests/test.js"] =
    `import { test } from 'node:test';\n\ntest('demo', () => {\n  console.log('pass');\n});\n`;

  files["tests/utils.test.js"] =
    `import { test } from 'node:test';\nimport assert from 'node:assert';\n\ntest('utils', () => {\n  assert.strictEqual(1, 1);\n});\n`;

  // Config files
  files[".gitignore"] = "node_modules\n.env\ndist\n.next\n";
  files["README.md"] =
    "# Demo Project\n\nA sample project for traversal visualization.\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```\n";
  files[".env.example"] = "DATABASE_URL=\nAPI_KEY=\nSECRET_KEY=\n";
  files["tsconfig.json"] = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        strict: true,
        outDir: "./dist",
      },
      include: ["src/**/*"],
      exclude: ["node_modules"],
    },
    null,
    2
  );

  // Scripts
  files["scripts/build.js"] =
    `#!/usr/bin/env node\nconsole.log('Building project...');\n`;

  files["scripts/deploy.js"] =
    `#!/usr/bin/env node\nconsole.log('Deploying project...');\n`;

  // Docs
  files["docs/api.md"] =
    "# API Documentation\n\n## Endpoints\n\n- GET /api/users\n- POST /api/auth\n";

  files["docs/setup.md"] =
    "# Setup Guide\n\n1. Clone the repository\n2. Install dependencies\n3. Run the server\n";

  return files;
}
