import path from 'path'
import React from 'react'
import chokidar from 'chokidar'
import {Box, Text, render} from 'ink'
import debounce from 'lodash.debounce'
import {bin as buildBin} from './build'

export async function bin(
  indexFile = path.join(process.cwd(), 'src/pages/posts/index.js')
) {
  render(
    React.createElement(() => {
      const [message, setMessage] = React.useState('⋯ Building')

      React.useEffect(() => {
        const watcher = chokidar.watch(['**/*.mdx'], {
          cwd: path.dirname(indexFile),
          depth: 99,
          persistent: true,
          awaitWriteFinish: true,
          ignoreInitial: true,
        })
        watcher.on('ready', () =>
          buildBin(indexFile).then(() => setMessage('Built'))
        )
        const rebuilding = debounce(() => {
          setMessage('⋯ Rebuilding')
          buildBin(indexFile).then(() => setMessage('Rebuilt'))
        }, 500) as any
        watcher.on('add', rebuilding)
        watcher.on('change', rebuilding)
        watcher.on('unlink', rebuilding)
      }, [])

      React.useEffect(() => {
        // Ignore loading messages
        if (!message.startsWith('⋯')) {
          const timeout = setTimeout(() => setMessage('Watching'), 2000)
          return () => clearTimeout(timeout)
        }
      })

      return (
        <Box>
          <Text
            bold
            backgroundColor='#4C51BF'
            color='#EBF4FF'
          >{` ${message} `}</Text>
          <Text> {indexFile}</Text>
        </Box>
      )
    })
  )
}
