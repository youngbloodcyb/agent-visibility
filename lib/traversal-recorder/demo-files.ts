/**
 * Generate random demo files for testing traversal visualization
 */
export function generateDemoFiles(): Array<{ path: string; content: Buffer }> {
  const files: Array<{ path: string; content: Buffer }> = [];

  // Package.json
  files.push({
    path: "package.json",
    content: Buffer.from(
      JSON.stringify(
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
      )
    ),
  });

  // Source files
  const srcFiles = [
    "index.js",
    "server.js",
    "utils.js",
    "config.js",
    "database.js",
  ];
  srcFiles.forEach((name) => {
    files.push({
      path: `src/${name}`,
      content: Buffer.from(
        `// ${name}\nexport function ${name.replace(".js", "")}() {\n  console.log('${name}');\n}\n`
      ),
    });
  });

  // Components
  const components = ["Button", "Card", "Modal", "Header", "Footer", "Sidebar"];
  components.forEach((name) => {
    files.push({
      path: `src/components/${name}.jsx`,
      content: Buffer.from(
        `export function ${name}({ children }) {\n  return <div className="${name.toLowerCase()}">{children}</div>;\n}\n`
      ),
    });
  });

  // API routes
  const routes = ["users", "posts", "comments", "auth", "settings"];
  routes.forEach((name) => {
    files.push({
      path: `src/api/${name}.js`,
      content: Buffer.from(
        `export async function get${name.charAt(0).toUpperCase() + name.slice(1)}(req, res) {\n  return res.json({ ${name}: [] });\n}\n`
      ),
    });
  });

  // Hooks
  const hooks = ["useAuth", "useApi", "useLocalStorage"];
  hooks.forEach((name) => {
    files.push({
      path: `src/hooks/${name}.js`,
      content: Buffer.from(
        `import { useState, useEffect } from 'react';\n\nexport function ${name}() {\n  const [state, setState] = useState(null);\n  return state;\n}\n`
      ),
    });
  });

  // Tests
  files.push({
    path: "tests/test.js",
    content: Buffer.from(
      `import { test } from 'node:test';\n\ntest('demo', () => {\n  console.log('pass');\n});\n`
    ),
  });

  files.push({
    path: "tests/utils.test.js",
    content: Buffer.from(
      `import { test } from 'node:test';\nimport assert from 'node:assert';\n\ntest('utils', () => {\n  assert.strictEqual(1, 1);\n});\n`
    ),
  });

  // Config files
  files.push({
    path: ".gitignore",
    content: Buffer.from("node_modules\n.env\ndist\n.next\n"),
  });
  files.push({
    path: "README.md",
    content: Buffer.from(
      "# Demo Project\n\nA sample project for traversal visualization.\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```\n"
    ),
  });
  files.push({
    path: ".env.example",
    content: Buffer.from("DATABASE_URL=\nAPI_KEY=\nSECRET_KEY=\n"),
  });
  files.push({
    path: "tsconfig.json",
    content: Buffer.from(
      JSON.stringify(
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
      )
    ),
  });

  // Scripts
  files.push({
    path: "scripts/build.js",
    content: Buffer.from(
      `#!/usr/bin/env node\nconsole.log('Building project...');\n`
    ),
  });

  files.push({
    path: "scripts/deploy.js",
    content: Buffer.from(
      `#!/usr/bin/env node\nconsole.log('Deploying project...');\n`
    ),
  });

  // Docs
  files.push({
    path: "docs/api.md",
    content: Buffer.from("# API Documentation\n\n## Endpoints\n\n- GET /api/users\n- POST /api/auth\n"),
  });

  files.push({
    path: "docs/setup.md",
    content: Buffer.from("# Setup Guide\n\n1. Clone the repository\n2. Install dependencies\n3. Run the server\n"),
  });

  return files;
}
