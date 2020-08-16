import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import {bin as buildBin} from './build'
import {deletePost} from './utils'
import {ConfirmInput} from './components/confirm-input'
import {QuickSearch} from './components/quick-search-input'

const glob = promisify(glob_)

export async function bin(indexFile: string, argv: {slug?: string} = {}) {
  const slugs = []

  for (const filepath of await glob('**/*.mdx', {
    cwd: path.dirname(indexFile),
    absolute: true,
  })) {
    const slug = path
      .basename(filepath)
      .replace('.mdx', '')
      .replace(/^[0-9]+?-/, '')
    slugs.push({
      value: slug,
      label: slug,
      filepath,
    })
  }

  render(
    React.createElement(() => {
      const [result, setResult] = React.useState<typeof slugs[0]>(
        slugs.find((s) => s.value === argv.slug)
      )
      const [confirmed, setConfirmed] = React.useState<boolean>(undefined)
      const [error, setError] = React.useState('')

      React.useEffect(() => {
        if (argv.slug) {
          if (!result) {
            setError(`A slug matching "${argv.slug}" was not found.`)
          }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      React.useEffect(() => {
        if (result && confirmed) {
          deletePost(result.filepath).then(() => buildBin(indexFile))
        }
      }, [result, confirmed])

      return (
        <Box flexDirection='column'>
          {!result && (
            <QuickSearch items={slugs} onSelect={(item) => setResult(item)} />
          )}

          {result && confirmed === undefined && (
            <Box flexDirection='row'>
              <Text bold backgroundColor='#4C51BF' color='#EBF4FF'>
                {` Are you sure you want to delete this post? (y/N) `}
              </Text>
              <Box marginLeft={1}>
                <ConfirmInput onSubmit={setConfirmed} />
              </Box>
            </Box>
          )}

          {!!result && confirmed === undefined && (
            <Text children={path.relative(process.cwd(), result.filepath)} />
          )}

          {confirmed === false && <Text>Nothing was deleted.</Text>}
          {confirmed === true && (
            <Box flexDirection='row'>
              <Text bold backgroundColor='#4C51BF' color='#EBF4FF'>
                {` Deleting `}
              </Text>
              <Text> {path.relative(process.cwd(), result.filepath)}</Text>
            </Box>
          )}

          {!!error && !result && (
            <Box marginTop={1}>
              <Text color='red'>{error}</Text>
            </Box>
          )}
        </Box>
      )
    })
  )
}
