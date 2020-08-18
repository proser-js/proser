# TODO

- [x] Handle multiple roots (trickier than it seems)
  - Needs named instances?
  - If using multiple roots, don't let a user `post`/`delete` until they select
    the correct root.
  - `build` and `watch` should accept multiple indexes as an argument
- [ ] Plugin system for `build` and `post` (medium)
- [ ] `proser.config.js` file (maybe? only if necessary for now.)

## `package.json` configuration

### Single root

```json
{
  "proser": {
    "index": "path/to/posts/index.js",
    "plugins": ["proser-plugin-image", "./my-own-plugin"]
  }
}
```

### Multiple roots

```json
{
  "proser": {
    "blog": {
      "index": "path/to/blog/posts/index.js",
      "template": "path/to/my-template.mdx"
    },
    "recipes": {
      "index": "path/to/recipes/posts/index.js",
      "plugins": ["proser-plugin-image"]
    }
  }
}
```

## Plugin

> WIP: Needs a lot of careful attention

```ts
type ProserPost = {
  filepath: string
  exports: {}
}

type ProserPlugin = (type: 'build' | 'post', posts: ProserPost[]) => any

const MyPlugin: ProserPlugin = (type, posts) => {
  if (type === 'build') {
  } else if (type === 'post') {
  }
}

export default MyPlugin
```
