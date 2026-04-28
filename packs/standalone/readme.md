# @code-surfer/standalone

For internal use by code-surfer, but you can use it if you want. Just be aware that **it doesn't follow semantic versioning**, so pin the version just in case.

No docs, but you can check the code in `sites/book/`.

## Contributing

Watch and build code:

```bash
$ pnpm install
$ pnpm --filter @code-surfer/standalone start
```

Run storybook:

```bash
$ pnpm --filter book start
```

Watch tests:

```bash
$ pnpm --filter @code-surfer/standalone test:watch
```
