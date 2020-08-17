import path from 'path'
import {runInThisContext} from 'vm'
import Module from 'module'
import {promises as fs, existsSync} from 'fs'
import * as types from 'babel-types'
import {createCompiler} from '@mdx-js/mdx'
import babelTemplate from '@babel/template'
import instTemplate from '@inst-cli/template'
import generate from '@babel/generator'
import {transformAsync, parseAsync} from '@babel/core'
import prettier from 'prettier'

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
  indexFile: string,
  posts: {filepath: string; exports: string}[]
) {
  let contents = DEFAULT_POSTS_CONTENTS
  if (existsSync(indexFile)) {
    contents = await fs.readFile(indexFile, 'utf-8')
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
      filename: indexFile.replace('.js', '.tsx'),
      babelrc: false,
      configFile: false,
      presets,
      retainLines: true,
    })
    // @ts-ignore
    const exportsBody = exportsAst.program.body

    let componentPath = path.relative(path.dirname(indexFile), post.filepath)
    componentPath = !componentPath.startsWith('.')
      ? './' + componentPath
      : componentPath

    const componentAst = await parseAsync(
      `React.lazy(() => import('${componentPath}'))`,
      {
        filename: indexFile.replace('.js', '.tsx'),
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
    postData.push({
      filepath: post.filepath,
      id: parseInt(id),
      slug,
      exports: exportsBody,
      component: componentBody[0],
    })
  }

  const t = await transformAsync(contents, {
    filename: indexFile.replace('.js', '.tsx'),
    babelrc: false,
    configFile: false,
    retainLines: true,
    presets,
    plugins: [
      function babelPlugin({types: t}: {types: typeof types}) {
        const plugin = {
          visitor: {
            ExportDeclaration(nodePath) {
              // Find only the "posts" declarator. We need it,
              // so we can bail if it isn't here.
              const postsDeclarator = (
                nodePath.node.declaration.declarations || []
              ).find((declarator) => declarator.id.name === 'postsMap')
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
                  (prop) => prop.key.name === 'component'
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
                  ...nextPost.exports.map((exp) => {
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
                      ...data.exports.map((exp) => {
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
    ],
  })

  contents = t.code
  const options = await prettier.resolveConfig(process.cwd())

  // Writes the JS file if it changed
  if (originalContents !== contents) {
    await fs.writeFile(
      indexFile,
      prettier.format(contents, {parser: 'babel', ...options})
    )
  }

  // Writes the TypeScript declarations
  const declarationFile = indexFile.replace(path.extname(indexFile), '.d.ts')

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
      () => (tree) => {
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

const DEFAULT_MDX_TEMPLATE = `export const metadata = {{metadata}}

# {{title}}

> {{description}}
`

export async function writePost(
  filepath: string,
  options: {
    metadata: Record<string, number | string | (number | string)[]>
    template?: string
  } = {
    metadata: {},
  }
) {
  const {metadata, template = DEFAULT_MDX_TEMPLATE} = options
  const metadataAst = generate(
    babelTemplate('SOURCE')({
      SOURCE: types.objectExpression([
        ...Object.keys(metadata).map((key) => {
          const value = metadata[key]
          return types.objectProperty(
            types.stringLiteral(key),
            (babelTemplate.smart(JSON.stringify(value))() as any).expression
          )
        }),
      ]),
    }) as any
  ).code
  const tpl = instTemplate(template, {vars: /{{([\s\w.]+?)}}/g})
  const prettierOptions = await prettier.resolveConfig(process.cwd())
  const contents = prettier.format(
    tpl({
      metadata: metadataAst,
      title: metadata.title,
      description: metadata.description,
    }),
    {parser: 'mdx', ...prettierOptions}
  )

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
    // Allows ES6 lundle configs
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
