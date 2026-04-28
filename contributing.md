1. Fork the repo
2. Install deps: `$ pnpm install`
3. Run tests: `$ pnpm test`

- Open Storybook: `$ pnpm --filter book start`
- Open docs and demos: `$ pnpm --filter docs start`

  - http://localhost:8000/demo/
  - http://localhost:8000/full/
  - http://localhost:8000/test/
  - http://localhost:8000/themes/
  - http://localhost:8000/errors/

- Start the module/s you want to change
  - `pnpm --filter @code-surfer/step-parser start`
  - `pnpm --filter @code-surfer/standalone start`
  - `pnpm --filter @code-surfer/themes start`
  - `pnpm --filter code-surfer start`
