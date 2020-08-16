import path from 'path'
import React from 'react'
import minimist from 'minimist'
import {Box, Text, render} from 'ink'
import findRoot from 'find-root'
import {bin as buildBin} from './build'
import {bin as deleteBin} from './delete'
import {bin as postBin} from './post'
import {bin as watchBin} from './watch'
const argv = minimist(process.argv.slice(2))
const root = findRoot(process.cwd())
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkgJson = require(root + '/package.json')
const indexFile =
  argv.index ||
  pkgJson.proser.index ||
  path.join(
    argv.cwd
      ? path.isAbsolute(argv.cwd)
        ? argv.cwd
        : path.join(process.cwd(), argv.cwd)
      : root,
    'src/pages/posts/index.js'
  )

switch (argv._[0]) {
  case 'build':
    render(
      React.createElement(() => {
        const [message, setMessage] = React.useState('⋯ Building')
        React.useEffect(() => {
          buildBin(argv.index).then(() => {
            setMessage('Built')
          })
        }, [])

        return (
          <Box marginBottom={1}>
            <Text
              bold
              backgroundColor={message.startsWith('⋯') ? '#4C51BF' : '#319795'}
              color='#EBF4FF'
            >{` ${message} `}</Text>
            <Text> {indexFile}</Text>
          </Box>
        )
      })
    )
    break

  case 'delete':
    deleteBin(indexFile)
    break

  case 'post':
    postBin(indexFile)
    break

  case 'watch':
    watchBin(indexFile)
    break

  default:
    console.log('Command not found:', argv._[0])
}
