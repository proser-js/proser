import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {Box, Text, render} from 'ink'
import {readMetadata, writePosts} from './utils'
import type {ProserConfig} from './types'

const glob = promisify(glob_)

export async function build(config: ProserConfig) {
  const filepaths = []
  const exportsPromises = []

  for (const file of await glob('**/*.mdx', {
    cwd: path.dirname(config.index),
    absolute: true,
  })) {
    if (!/^[0-9]+-/.test(path.basename(file))) continue
    filepaths.push(file)
    exportsPromises.push(readMetadata(file))
  }

  const exportsStrings = await Promise.all(exportsPromises)
  await writePosts(
    config,
    filepaths.map((filepath, i) => ({filepath, exports: exportsStrings[i]}))
  )
}

export async function buildRenderer(
  configMap: Record<string, ProserConfig>,
  argv: {slug?: string; [key: string]: any} = {}
) {
  render(
    React.createElement(() => {
      const [roots, dispatch] = React.useReducer(
        (state: BuildState, action: BuildAction) => {
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
            status: 'loading',
          }
          return acc
        }, {} as BuildState)
      )

      React.useEffect(() => {
        for (const root in roots) {
          dispatch({type: 'status', root, value: 'loading'})
          build(configMap[root])
            .then(() => {
              dispatch({type: 'status', root, value: 'success'})
            })
            .catch((error) => {
              dispatch({type: 'status', root, value: 'error', error})
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      return (
        <Box flexDirection='column' marginBottom={1}>
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
                    status === 'loading'
                      ? '#4C51BF'
                      : status === 'error'
                      ? '#E53E3E'
                      : '#319795'
                  }
                  color='#EBF4FF'
                >{` ${
                  status === 'loading' || status === 'idle'
                    ? 'Building'
                    : status === 'error'
                    ? 'Error'
                    : 'Built'
                } `}</Text>
                <Text>
                  {' '}
                  {error ? (
                    <Text>{error.message}</Text>
                  ) : (
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

type BuildState = Record<
  string,
  {
    status: BuildStatus
    error?: Error
  }
>

type BuildAction =
  | {
      root: string
      type: 'status'
      value: Exclude<BuildStatus, 'error'>
    }
  | {
      root: string
      type: 'status'
      value: 'error'
      error: Error
    }

type BuildStatus = 'idle' | 'loading' | 'success' | 'error'
