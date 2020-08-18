#!/usr/bin/env node
import path from 'path'
import minimist from 'minimist'
import findRoot from 'find-root'
import type {ProserConfig} from './types'
import {bin as buildBin} from './build'
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
  proser: {
    [rootName: string]: ProserConfig
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require(root + '/package.json')

// Finds the index files and makes them absolute paths
let configs: Record<string, ProserConfig> = argv.root
  ? (argv.root as string).split(',').reduce((acc, name) => {
      const pkgRoot = pkgJson.proser[name]
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
    }, {})
  : pkgJson.proser
  ? Object.keys(pkgJson.proser).reduce((acc, name) => {
      acc[name] = pkgJson.proser[name]
      return acc
    }, {})
  : {default: {index: 'src/posts/index.js'}}

// Gives paths to files absolute paths
configs = Object.keys(configs).reduce((acc, key) => {
  const config = configs[key]

  for (const field of ['index', 'template'] as const) {
    if (!config[field]) {
      continue
    } else if (path.isAbsolute(config[field])) {
      acc[key] = config
    } else {
      const cwd = argv.cwd || root
      acc[key] = {
        ...config,
        [field]: path.join(
          path.isAbsolute(cwd) ? cwd : path.join(process.cwd(), cwd),
          config[field]
        ),
      }
    }
  }

  return acc
}, {})

const cmd = {
  build: () => buildBin(configs),
  watch: () => watch(configs),
  post: () => post(configs),
  delete: () => del(configs, {slug: argv._[1]}),
}[argv._[0]]

if (!cmd) {
  console.error('Command not found:', argv._[0])
  process.exit(1)
} else cmd()
