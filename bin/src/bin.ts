#!/usr/bin/env node
import path from 'path'
import minimist from 'minimist'
// @ts-expect-error
import findRoot from 'find-root'
import type {ProserConfig} from './types'
import {buildRenderer} from './build'
import {del} from './delete'
import {post} from './post'
import {watch} from './watch'

const defaultIndex = 'src/posts/index.js'
const argv = minimist(process.argv.slice(2), {
  string: ['root', 'cwd'],
  alias: {r: 'root'},
  default: {
    cwd: process.cwd(),
  },
  '--': true,
})

const root = findRoot(process.cwd())
const pkgJson: {
  [key: string]: any
  proser:
    | {
        [rootName: string]: ProserConfig
      }
    | ProserConfig
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require(root + '/package.json')

// Finds the index files and makes them absolute paths
let configs: Record<string, ProserConfig> = argv.root
  ? (argv.root as string).split(',').reduce((acc, name) => {
      const pkgRoot = (pkgJson.proser as Record<string, ProserConfig>)[name]
      if (pkgRoot === void 0) {
        console.error(
          `Root not found: ${name}.\nThere was no config found in the package.json for this name.`
        )
        process.exit(1)
      }
      acc[name] = {
        ...pkgRoot,
        index: pkgRoot.index || defaultIndex,
      }
      return acc
    }, {} as Record<string, ProserConfig>)
  : pkgJson.proser
  ? Object.keys(pkgJson.proser).reduce((acc, name) => {
      if (pkgJson.proser.index) {
        acc['default'] = pkgJson.proser as ProserConfig
      } else {
        acc[name] = (pkgJson.proser as Record<string, ProserConfig>)[name]
      }
      return acc
    }, {} as Record<string, ProserConfig>)
  : {default: {index: 'src/posts/index.js'}}

// Gives paths to files absolute paths
configs = Object.keys(configs).reduce((acc, key) => {
  const config = configs[key]

  for (const field of ['index', 'template'] as const) {
    const configItem = config[field]
    if (configItem === undefined) {
      continue
    } else if (path.isAbsolute(configItem)) {
      acc[key] = config
    } else {
      const cwd = argv.cwd || root
      acc[key] = {
        ...config,
        [field]: path.join(
          path.isAbsolute(cwd) ? cwd : path.join(process.cwd(), cwd),
          configItem
        ),
      }
    }
  }

  return acc
}, {} as Record<string, ProserConfig>)

const cmd = {
  build: () => buildRenderer(configs, argv),
  watch: () => watch(configs, argv),
  post: () => post(configs, argv),
  delete: () => del(configs, {slug: argv._[1], ...argv}),
}[argv._[0] as 'build' | 'watch' | 'post' | 'delete']

if (!cmd) {
  console.error('Command not found:', argv._[0])
  process.exit(1)
} else cmd()
