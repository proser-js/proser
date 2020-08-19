import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import InkTextInput from 'ink-text-input'
import openEditor from 'open-editor'
import slugify from 'slugify'
// @ts-expect-error
import findRoot from 'find-root'
// @ts-expect-error
import BigText from 'ink-big-text'
import {QuickSearch} from './components/quick-search-input'
import type {Item} from './components/quick-search-input'
import type {ProserConfig} from './types'
import {build} from './build'
import {writePost, importIndexFile} from './utils'

const glob = promisify(glob_)
const root = findRoot(process.cwd())

export async function post(
  configMap: Record<string, ProserConfig>,
  argv: {slug?: string; [key: string]: any} = {}
) {
  const configName = Object.keys(configMap)[0]
  const config = configMap[configName]
  const slugs: string[] = []
  let id = 0

  for (const file of await glob('**/*.mdx', {
    cwd: path.dirname(config.index),
    absolute: true,
  })) {
    const basename = path.basename(file)
    slugs.push(basename.replace('.mdx', '').replace(/^[0-9]+?-/, ''))
    id = Math.max(parseInt(basename.split('-')[0]) + 1, id)
  }

  const indexFileExports = await importIndexFile(config.index)
  let defaultTags: {label: string; value: string}[] = []
  let defaultCategories: {label: string; value: string}[] = []
  if (indexFileExports) {
    // Pulls current categories and sorts by commonality
    const tags = taxonomy((indexFileExports as any).postsMap, 'tags')
    defaultTags = Object.keys(tags)
      .sort((a, b) => tags[b].length - tags[a].length)
      .map((key) => ({label: key, value: key}))
    // Pulls current categories and sorts by commonality
    const categories = taxonomy(
      (indexFileExports as any).postsMap,
      'categories'
    )
    defaultCategories = Object.keys(categories)
      .sort((a, b) => categories[b].length - categories[a].length)
      .map((key) => ({label: key, value: key}))
  }

  const userInputs: ReturnType<ProserPlugin>[] = !config.plugins
    ? []
    : config.plugins.map((plugin) => {
        const [pluginPath, pluginOptions = {}] =
          typeof plugin === 'string' ? [plugin] : plugin
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginModule: ProserPluginModule = require(pluginPath.startsWith(
          '.'
        )
          ? path.join(root, pluginPath)
          : pluginPath)
        return 'default' in pluginModule
          ? pluginModule.default(pluginOptions)
          : pluginModule(pluginOptions)
      })

  render(
    React.createElement(() => {
      const [
        {
          title,
          description,
          categories,
          tags,
          slug,
          pluginMetadata,
          error,
          step,
        },
        dispatch,
      ] = React.useReducer(
        (state: PostState, action: PostAction) => {
          if (action.type === 'set') {
            state = {...state, error: '', [action.key]: action.value}

            if (action.key === 'title') {
              state.slug = slugify(state.title, {lower: true, strict: true})
            }
          } else if (action.type === 'setError') {
            state = {...state, error: action.value}
          } else if (action.type === 'continue') {
            state = {...state, error: '', step: ++state.step}
          } else if (action.type === 'taxonomy') {
            state = {
              ...state,
              [action.key]: (state[action.key] || []).concat(action.value),
            }
          } else if (action.type === 'pluginMetadata' && action.value) {
            state = {
              ...state,
              error: '',
              step: ++state.step,
              pluginMetadata: {...state.pluginMetadata, ...action.value},
            }
          }

          return state
        },
        {
          title: '',
          description: '',
          slug: '',
          categories: [],
          tags: [],
          error: '',
          step: 0,
          pluginMetadata: {},
        }
      )

      const inputs: React.ReactElement[] = [
        <ProserInput
          key='title'
          label='Title'
          status='inactive'
          render={({status}) => (
            <TextInput
              value={title}
              status={status}
              onChange={(value: string) =>
                dispatch({type: 'set', key: 'title', value})
              }
              onSubmit={() => {
                if (!title.trim()) {
                  dispatch({
                    type: 'setError',
                    value: `Title cannot be empty.`,
                  })
                } else {
                  dispatch({type: 'continue'})
                }
              }}
            />
          )}
        />,
        <ProserInput
          key='description'
          label='Description'
          flexDirection='column'
          status='inactive'
          render={({status}) => (
            <TextInput
              value={description}
              status={status}
              onChange={(value: string) =>
                dispatch({type: 'set', key: 'description', value})
              }
              onSubmit={() => {
                if (!title.trim()) {
                  dispatch({
                    type: 'setError',
                    value: `Description cannot be empty.`,
                  })
                } else {
                  dispatch({type: 'continue'})
                }
              }}
            />
          )}
        />,
        <ProserInput
          key='slug'
          label='Slug'
          status='inactive'
          render={({status}) => (
            <TextInput
              value={slug}
              status={status}
              onChange={(value: string) =>
                dispatch({type: 'set', key: 'slug', value})
              }
              onSubmit={() => {
                if (slugs.indexOf(slug) > -1) {
                  dispatch({
                    type: 'setError',
                    value: `You've already used this slug. Slugs must be unique.`,
                  })
                } else {
                  dispatch({type: 'continue'})
                }
              }}
            />
          )}
        />,
        <ProserInput
          key='tags'
          label='Tags'
          status='inactive'
          render={({status}) => (
            <TaxonomicInput
              label='Select tags'
              items={defaultTags.filter(({value}) => !tags.includes(value))}
              value={tags}
              status={status}
              onSubmit={(value: string) => {
                if (value === '___DONE___') {
                  dispatch({type: 'continue'})
                } else {
                  dispatch({type: 'taxonomy', key: 'tags', value})
                }
              }}
            />
          )}
        />,
        <ProserInput
          key='categories'
          label='Categories'
          status='inactive'
          render={({status}) => (
            <TaxonomicInput
              label='Select categories'
              items={defaultCategories.filter(
                ({value}) => !categories.includes(value)
              )}
              value={categories}
              status={status}
              onSubmit={(value: string) => {
                if (value === '___DONE___') {
                  dispatch({type: 'continue'})
                } else {
                  dispatch({type: 'taxonomy', key: 'categories', value})
                }
              }}
            />
          )}
        />,
      ]

      userInputs.forEach((MaybeComponent, i) => {
        if (MaybeComponent)
          inputs.push(
            <MaybeComponent
              key={'input' + i}
              metadata={{
                title,
                description,
                slug,
                categories,
                tags,
                ...pluginMetadata,
              }}
              status='inactive'
              onSubmit={(value) => dispatch({type: 'pluginMetadata', value})}
            />
          )
      })

      React.useEffect(() => {
        if (step === inputs.length) {
          const filepath = path.join(
            path.dirname(config.index),
            `${id}-${slug}.mdx`
          )

          writePost(filepath, {
            template: config.template,
            argv,
            metadata: {
              title,
              description,
              timestamp: Date.now(),
              tags,
              categories,
              ...pluginMetadata,
            },
          })
            .then(() => {
              openEditor([filepath], {})
            })
            .then(() => build(config))
        }
      }, [
        step,
        slug,
        description,
        title,
        tags,
        categories,
        inputs,
        pluginMetadata,
      ])

      return (
        <Box flexDirection='column'>
          <BigText
            font='tiny'
            text={configName === 'default' ? 'Proser' : configName}
          />

          {inputs.map((Input, i) =>
            React.cloneElement(Input, {
              status:
                i === step ? 'active' : i < step ? 'complete' : 'inactive',
            })
          )}

          {!!error && <Text color='red'>{error}</Text>}
        </Box>
      )
    })
  )
}

export function TextInput({value, onSubmit, status, onChange}: TextInputProps) {
  return (
    <Box marginBottom={1}>
      {status === 'active' && (
        <InkTextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      )}

      {status === 'complete' && <Text>{value}</Text>}
    </Box>
  )
}

export interface TextInputProps {
  value: string
  status: ProserInputStatus
  onSubmit: () => void
  onChange: (value: string) => void
}

export function TaxonomicInput({
  label,
  items = [],
  value,
  status,
  onSubmit,
}: TaxonomicInputProps) {
  return (
    <Box flexDirection='column' marginBottom={1}>
      {(status === 'complete' || status === 'active') && value.length > 0 && (
        <Text bold>{value.join(', ')}</Text>
      )}

      {status === 'active' && (
        <Box marginTop={value.length > 0 ? 1 : 0}>
          <QuickSearch
            label={label}
            items={[
              {
                value: '___DONE___',
                label: value.length === 0 ? 'Skip' : 'Done',
              },
              ...items,
            ]}
            forceMatchingQuery={false}
            onSelect={(item: any) => onSubmit(item.value)}
          />
        </Box>
      )}
    </Box>
  )
}

export interface TaxonomicInputProps {
  label?: string
  items?: Item[]
  value: string[]
  status: ProserInputStatus
  onSubmit: (value: string) => void
}

export function ProserInput({
  render,
  status,
  label,
  flexDirection = 'row',
}: ProserInputProps) {
  return status === 'complete' || status === 'active' ? (
    <Box flexDirection={flexDirection}>
      <Box marginRight={1}>
        <Text
          bold
          backgroundColor={status === 'active' ? '#4C51BF' : '#EBF4FF'}
          color={status === 'active' ? '#EBF4FF' : '#3C366B'}
        >
          {` ${label} `}
        </Text>
      </Box>

      {render({status})}
    </Box>
  ) : null
}

export interface ProserInputProps {
  label: string
  flexDirection?: 'row' | 'column'
  status: ProserInputStatus
  render: ProserInputRenderer
}

export interface ProserInputRenderer {
  ({status}: {status: ProserInputStatus}): React.ReactElement
}

export type ProserInputStatus = 'inactive' | 'active' | 'complete'

function taxonomy<T extends Record<string, any>>(posts: T[], type: string) {
  return Object.values(posts).reduce((acc, post) => {
    for (const item of post.metadata[type] || []) {
      acc[item] = acc[item] || []
      acc[item].push(post)
    }

    return acc
  }, {} as Record<string, T[]>)
}

type PostState = {
  title: string
  description: string
  categories: string[]
  tags: string[]
  slug: string
  error: string
  step: number
  pluginMetadata: Record<string, any>
}

type PostAction =
  | {
      type: 'set'
      key: string
      value: string
    }
  | {
      type: 'setError'
      value: string
    }
  | {
      type: 'continue'
    }
  | {
      type: 'taxonomy'
      key: 'tags' | 'categories'
      value: any
    }
  | {
      type: 'pluginMetadata'
      value: Record<string, any> | null
    }

export type ProserPostInput = Record<string, any>

export type ProserPlugin = (
  options: Record<string, any>
) => null | React.ComponentType<ProserPluginProps>

export interface ProserPluginProps {
  metadata: Record<string, any>
  status: ProserInputStatus
  onSubmit: (metadata: Record<string, any>) => void
  [propName: string]: any
}

export type ProserPluginModule = ProserPlugin | {default: ProserPlugin}
