# TODO

- [ ] Minify the output of `index.js` by hoisting taxonomy strings
      into variables
  - [ ] Do the same with slugs?
  - See: https://github.com/babel/babel/blob/eea156b2cb8deecfcf82d52aa1b71ba4995c7d68/packages/babel-plugin-transform-react-constant-elements/src/index.js

```js
const e = 'foo',
  f = 'bar',
  g = 'baz'
const ReactLazy = React.lazy

export const postsMap = {
  'foo-baz': {
    title,
    slug: 'foo-baz',
    component: () => ReactLazy(() => import('1-foo-baz.mdx)),
    metadata: {
      tags: [e, g],
      categories: [f],
    },
  },
}
```
