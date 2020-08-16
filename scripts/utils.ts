import path from 'path'
import {promises as fs} from 'fs'
import Module from 'module'
import {runInThisContext} from 'vm'
// @ts-ignore
import {createCompiler} from '@mdx-js/mdx'
import {transformAsync} from '@babel/core'

export default function extractMetadata(filepath: string) {
  const contents = await fs.readFile(filepath, 'utf-8')
  // This variable stores the "export" fields in the mdx file
  const mdxExports = []
  const compiler = createCompiler({
    filepath,
    remarkPlugins: [
      // This is a plugin that pushes all of the exports to the
      // mdxExports array
      () => (tree, other) => {
        console.log(other)
        for (const child of tree.children) {
          if (child.type === 'export') {
            mdxExports.push(child.value)
          }
        }
      },
    ],
  })
  // Runs the compiler
  compiler.process({contents, path: filepath})
  // Now that we've got our exports, we can compile them to
  // the proper version of node using babel.
  const t = await transformAsync(mdxExports.join(), {
    filename: filepath,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
    plugins: [],
  })
  // This is a safe way to run the code we receive back from babel.
  // It runs in its own context using a vm.
  const wrapper = runInThisContext(Module.wrap(t?.code || '"use strict"'))
  // This stores the exports in the code so we can use their values
  // later.
  const wrapperExports = {}
  // Runs the code in its context
  wrapper.call(
    wrapperExports,
    wrapperExports,
    module.require,
    global,
    filepath,
    path.dirname(filepath)
  )

  return wrapperExports
}
