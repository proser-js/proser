import path from 'path'
import React from 'react'
import chokidar from 'chokidar'
import {Box, Text, render} from 'ink'
import debounce from 'lodash.debounce'
import {build} from './build'
import {ProserConfig} from './types'

export async function watch(
  configMap: Record<string, ProserConfig>,
  argv: {slug?: string; [key: string]: any} = {}
) {
  render(
    React.createElement(() => {
      const [roots, dispatch] = React.useReducer<
        React.Reducer<WatchState, WatchAction>
      >(
        (state, action) => {
          switch (action.type) {
            case 'status':
              return {
                ...state,
                [action.root]: {
                  status: action.value,
                  error: 'error' in action ? action.error : undefined,
                },
              }
          }
        },
        Object.keys(configMap).reduce((acc, key) => {
          acc[key] = {
            status: 'building',
          }
          return acc
        }, {} as WatchState)
      )

      React.useEffect(() => {
        for (const root in roots) {
          const config = configMap[root]
          dispatch({type: 'status', root, value: 'building'})
          const watcher = chokidar.watch(['**/*.mdx'], {
            cwd: path.dirname(config.index),
            depth: 99,
            persistent: true,
            awaitWriteFinish: true,
            ignoreInitial: true,
          })
          watcher.on('ready', () =>
            build(config, true).then(() =>
              dispatch({type: 'status', root, value: 'built'})
            )
          )
          const rebuilding = debounce(() => {
            dispatch({type: 'status', root, value: 'rebuilding'})
            build(config, true).then(() =>
              dispatch({type: 'status', root, value: 'rebuilt'})
            )
          }, 500) as any
          watcher.on('add', rebuilding)
          watcher.on('change', rebuilding)
          watcher.on('unlink', rebuilding)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      React.useEffect(() => {
        // Ignore loading messages
        const timeout = setTimeout(() => {
          for (const root in roots)
            if (
              roots[root].status !== 'idle' &&
              roots[root].status !== 'building'
            )
              dispatch({type: 'status', root, value: 'watching'})
        }, 2000)
        return () => clearTimeout(timeout)
      })

      return (
        <Box flexDirection='column'>
          {Object.keys(roots).map((root) => {
            const {status, error} = roots[root]
            return (
              <Box
                key={root}
                flexDirection={status === 'error' ? 'column' : 'row'}
              >
                <Text
                  bold
                  backgroundColor={
                    status === 'watching'
                      ? '#805AD5'
                      : status === 'rebuilding' || status === 'building'
                      ? '#4C51BF'
                      : status === 'error'
                      ? '#E53E3E'
                      : '#319795'
                  }
                  color='#EBF4FF'
                >{` ${
                  status === 'building' || status === 'idle'
                    ? 'Building'
                    : status === 'rebuilding'
                    ? 'Rebuilding'
                    : status === 'watching'
                    ? 'Watching'
                    : status === 'error'
                    ? 'Error'
                    : 'Built'
                } `}</Text>
                <Text>
                  {' '}
                  {error || (
                    <React.Fragment>
                      <Text bold>{root}</Text>{' '}
                      <Text color='gray'>
                        {path.relative(process.cwd(), configMap[root].index)}
                      </Text>
                    </React.Fragment>
                  )}
                </Text>
              </Box>
            )
          })}
        </Box>
      )
    })
  )
}

type WatchState = Record<
  string,
  {
    status: WatchStatus
    error?: Error
  }
>

type WatchAction =
  | {
      root: string
      type: 'status'
      value: Exclude<WatchStatus, 'error'>
    }
  | {
      root: string
      type: 'status'
      value: 'error'
      error: Error
    }

type WatchStatus =
  | 'idle'
  | 'building'
  | 'rebuilding'
  | 'built'
  | 'rebuilt'
  | 'watching'
  | 'error'
