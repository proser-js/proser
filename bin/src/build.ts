import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import {readMetadata, writePosts} from './utils'

const glob = promisify(glob_)

export async function bin(indexFile: string) {
  const filepaths = []
  const exportsPromises = []

  for (const file of await glob('**/*.mdx', {
    cwd: path.dirname(indexFile),
    absolute: true,
  })) {
    filepaths.push(file)
    exportsPromises.push(readMetadata(file))
  }

  const exportsStrings = await Promise.all(exportsPromises)
  await writePosts(
    indexFile,
    filepaths.map((filepath, i) => ({filepath, exports: exportsStrings[i]}))
  )
}
