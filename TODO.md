# TODO

- [x] Handle multiple roots (trickier than it seems)
  - Needs named instances?
  - If using multiple roots, don't let a user `post`/`delete` until they select
    the correct root.
  - `build` and `watch` should accept multiple indexes as an argument
- [x] Custom template paths
- [x] Plugin system for `build` and `post` (medium)

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
      "template": "path/to/my-template.mdx",
      "babel": {
        "plugins": ["babel-plugin-edit-my-index-file"],
        "presets": ["babel-preset-edit-my-index-file"]
      }
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

What can a plugin do? Right now, add custom inputs to `post`

```tsx
type ProserPlugin = (
  options: Record<string, any>
) => ({status, onSubmit}) => React.ComponentType | null

const MyPlugin: ProserPlugin = (options) => {
  const [value, setValue] = React.useState('')
  return ({onSubmit}) => (
    <TextInput
      value={value}
      onChange={setValue}
      onSubmit={() => onSubmit({myMetadata: value})}
    />
  )
}

export default MyPlugin
```
