import path from 'path'
import {runInThisContext} from 'vm'
import Module from 'module'
import {promises as fs, existsSync} from 'fs'
import * as types from 'babel-types'
// @ts-ignore
import {createCompiler} from '@mdx-js/mdx'
// @ts-ignore
import instTemplate from '@inst-cli/template'
import generate from '@babel/generator'
import {transformAsync, parseAsync, parse} from '@babel/core'
import prettier from 'prettier'
import type {ProserConfig} from './types'

const DEFAULT_POSTS_CONTENTS = `/**
 * ⚠️ DO NOT EDIT
 * -------------
 * This file was autogenerated by Proser.
 * Edits may be overwritten.
 */
import React from 'react'

export const postsMap = {}

export const posts = Object.values(postsMap)
export const postsMapById = posts.reduce((acc, post) => {
  acc[post.id] = post
  return acc
}, {})
`

const POST_TYPES = `/** 
 * 🔆 You can and should edit this file to match your actual Post type.
 *    if you're using extra or different metadata.
 */
import React from 'react';

export type Post = {
  id: number;
  slug: string;
  component: React.LazyExoticComponent<(props: any) => JSX.Element>;
  metadata: {
    title: string;
    description: string;
    // image?: Promise<typeof import('*.jpg')>;
    categories: string[];
    tags: string[];
  }
}

export const postsMap: Record<string, Post>;
export const postsMapById: Record<number, Post>;
export const posts: Post[];
`

export async function writePosts(
  config: ProserConfig,
  posts: {filepath: string; exports: string}[]
) {
  let contents = DEFAULT_POSTS_CONTENTS
  if (existsSync(config.index)) {
    contents = await fs.readFile(config.index, 'utf-8')
  }
  const originalContents = contents
  const presets = [
    ['@babel/preset-typescript', {onlyRemoveTypeImports: true}],
    '@babel/preset-react',
  ]
  const postData: {
    filepath: string
    id: number
    slug: string
    component: any
    exports: any
  }[] = []

  for (const post of posts) {
    const exportsAst = await parseAsync(post.exports, {
      filename: config.index.replace('.js', '.tsx'),
      babelrc: false,
      configFile: false,
      presets,
      retainLines: true,
    })
    // @ts-ignore
    const exportsBody = exportsAst.program.body

    let componentPath = path.relative(path.dirname(config.index), post.filepath)
    componentPath = !componentPath.startsWith('.')
      ? './' + componentPath
      : componentPath

    const componentAst = await parseAsync(
      `React.lazy(() => import('${componentPath}'))`,
      {
        filename: config.index.replace('.js', '.tsx'),
        babelrc: false,
        configFile: false,
        presets,
      }
    )

    // @ts-expect-error
    const componentBody = componentAst.program.body
    const basename = path.basename(post.filepath)
    const [id, ...slugParts] = basename.split('-')
    const slug = slugParts.join('-').replace('.mdx', '')
    const currentData = {
      filepath: post.filepath,
      id: parseInt(id),
      slug,
      exports: exportsBody,
      component: componentBody[0],
    }
    postData.push(currentData)
  }
  const postDataCopy = postData.slice(0)

  const t = await transformAsync(contents, {
    filename: config.index.replace('.js', '.tsx'),
    babelrc: false,
    configFile: false,
    retainLines: true,
    presets: [...presets, ...(config.babel?.presets || [])],
    plugins: [
      function babelPlugin({types: t}: {types: typeof types}) {
        const plugin = {
          visitor: {
            ExportDeclaration(nodePath: any) {
              // Find only the "posts" declarator. We need it,
              // so we can bail if it isn't here.
              const postsDeclarator = (
                nodePath.node.declaration.declarations || []
              ).find((declarator: any) => declarator.id.name === 'postsMap')
              if (!postsDeclarator) return

              const currentPosts = postsDeclarator.init.properties
              const removeThese: Set<string> = new Set()

              for (const i in currentPosts) {
                const currentPost = currentPosts[i]
                const nextPostIndex = postData.findIndex((data) => {
                  return (
                    data.slug ===
                    (currentPost.key.value || currentPost.key.name)
                  )
                })
                const nextPost = postData[nextPostIndex]

                // Removes posts that were deleted
                if (!nextPost) {
                  removeThese.add(i)
                  continue
                } else {
                  // Delete from our post data because we take care of
                  // its changes here
                  postData.splice(nextPostIndex, 1)
                }

                // Replace the current `component` property with the latest
                // one
                const currentProperties = currentPosts[i].value.properties
                const componentPropertyIndex = currentProperties.findIndex(
                  (prop: any) => prop.key.name === 'component'
                )
                const componentProperty =
                  currentProperties[componentPropertyIndex]
                componentProperty.value = nextPost.component.expression
                const nextProperties = currentPosts[i].value.properties.splice(
                  componentPropertyIndex,
                  1
                )
                // Replace all other properties with their latest values
                nextProperties.unshift(
                  t.objectProperty(
                    t.stringLiteral('id'),
                    t.numericLiteral(nextPost.id)
                  ),
                  t.objectProperty(
                    t.stringLiteral('slug'),
                    t.stringLiteral(nextPost.slug)
                  )
                )
                nextProperties.push(
                  ...nextPost.exports.map((exp: any) => {
                    const declarator = exp.declaration.declarations[0]
                    return t.objectProperty(declarator.id, declarator.init)
                  })
                )
                currentPosts[i].value.properties = nextProperties
              }
              const nextPosts = (currentPosts as any[]).filter(
                (_, i) => !removeThese.has(String(i))
              )
              currentPosts.length = 0
              currentPosts.push(
                ...nextPosts,
                ...postData.map((data) =>
                  t.objectProperty(
                    t.stringLiteral(data.slug),
                    t.objectExpression([
                      t.objectProperty(
                        t.stringLiteral('id'),
                        t.numericLiteral(data.id)
                      ),
                      t.objectProperty(
                        t.stringLiteral('slug'),
                        t.stringLiteral(data.slug)
                      ),
                      t.objectProperty(
                        t.stringLiteral('component'),
                        data.component.expression
                      ),
                      ...data.exports.map((exp: any) => {
                        const declarator = exp.declaration.declarations[0]
                        return t.objectProperty(declarator.id, declarator.init)
                      }),
                    ])
                  )
                )
              )
            },
          },
        }

        return plugin
      },
      ...(config.babel?.plugins || []).map((plugin) => [
        plugin,
        {posts: postDataCopy, config},
      ]),
    ],
  })

  contents = t?.code || ''
  const options = await prettier.resolveConfig(process.cwd())

  // Writes the JS file if it changed
  if (originalContents !== contents) {
    const dirname = path.dirname(config.index)
    if (!existsSync(dirname)) await fs.mkdir(dirname, {recursive: true})

    await fs.writeFile(
      config.index,
      prettier.format(contents, {parser: 'babel', ...options})
    )
  }

  // Writes the TypeScript declarations
  const declarationFile = config.index.replace(
    path.extname(config.index),
    '.d.ts'
  )

  if (!existsSync(declarationFile)) {
    await fs.writeFile(
      declarationFile,
      prettier.format(POST_TYPES, {parser: 'typescript', ...options})
    )
  }
}

export async function readMetadata(filepath: string) {
  const contents = await fs.readFile(filepath, 'utf-8')
  // This variable stores the "export" fields in the mdx file
  let mdxExports = ''
  const compiler = createCompiler({
    filepath,
    remarkPlugins: [
      // This is a plugin that pushes all of the exports to the
      // mdxExports array
      () => (tree: any) => {
        for (const i in tree.children) {
          const child = tree.children[i]

          if (child.type === 'export') {
            mdxExports += '\n' + child.value
          }
        }
      },
    ],
  })

  compiler.process({contents, path: filepath})
  return mdxExports
}

const DEFAULT_MDX_TEMPLATE = `# {{title}}

> {{description}}
`

export async function writePost(
  filepath: string,
  options: {
    metadata: Record<string, unknown>
    argv: Record<string, unknown>
    template?: string
  } = {
    metadata: {},
    argv: {},
  }
) {
  const {metadata, argv, template: customTemplate} = options
  let template: string = DEFAULT_MDX_TEMPLATE

  if (customTemplate) {
    if (customTemplate.endsWith('.js')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const templatePkg = require(customTemplate)
      template = templatePkg(metadata, argv)
    } else {
      template = await fs.readFile(customTemplate, 'utf-8')
    }
  }

  const placeholders: [string, string][] = []
  let stringified = JSON.stringify(
    metadata,
    function (_, val) {
      if (
        typeof val?.toString === 'function' &&
        val.toString() !== '[object Object]' &&
        typeof val !== 'string' &&
        typeof val !== 'number' &&
        typeof val !== 'boolean' &&
        !Array.isArray(val)
      ) {
        const placeholder = `[<::${placeholders.length}::>`
        placeholders.push([placeholder, val.toString()])
        return placeholder
      }

      return val
    },
    2
  )
  placeholders.forEach(
    ([placeholder, value]) =>
      (stringified = stringified.replace(`"${placeholder}"`, value))
  )

  const metadataAst = generate(
    parse(`export const metadata = ${stringified}`, {
      filename: filepath,
      babelrc: false,
      configFile: false,
      babelrcRoots: false,
    }) as any
  ).code
  const tpl = instTemplate(template, {vars: /{{([\s\w.]+?)}}/g})
  const prettierOptions = await prettier.resolveConfig(process.cwd())
  const contents = prettier.format(`${metadataAst}\n\n` + tpl(metadata), {
    parser: 'mdx',
    ...prettierOptions,
  })

  const dirname = path.dirname(filepath)
  if (!existsSync(dirname)) await fs.mkdir(dirname, {recursive: true})
  await fs.writeFile(filepath, contents)
  return contents
}

export async function deletePost(filepath: string) {
  if (existsSync(filepath)) {
    await fs.unlink(filepath)
  }
}

export async function importIndexFile(indexFile: string) {
  let indexFileContents = ''

  if (existsSync(indexFile)) {
    indexFileContents = await fs.readFile(indexFile, 'utf-8')
  } else {
    return
  }

  try {
    const t = await transformAsync(indexFileContents, {
      filename: indexFile,
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'commonjs',
            targets: {
              node: 'current',
            },
          },
        ],
      ],
      plugins: [],
    })
    // Run this in a VM context for safer eval
    const wrapper = runInThisContext(Module.wrap(t?.code || '"use strict"'), {
      filename: indexFile,
    })

    const exports = {}
    const origPaths = module.paths
    module.paths = [path.dirname(indexFile), ...module.paths]

    wrapper.call(
      exports,
      exports,
      require,
      global,
      indexFile,
      path.dirname(indexFile)
    )
    // Resets module paths to originals
    module.paths = origPaths
    return exports
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
