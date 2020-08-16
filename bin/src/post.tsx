import path from 'path'
import {promises as fs, existsSync} from 'fs'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import TextInput from 'ink-text-input'
import openEditor from 'open-editor'
import slugify from 'slugify'
import {QuickSearch} from './components/quick-search-input'
import type {Item} from './components/quick-search-input'
import {bin as buildBin} from './build'
import {writePost, importIndexFile} from './utils'

const glob = promisify(glob_)

export async function bin(indexFile: string) {
  const slugs = []
  const exportsPromises = []
  let id = 0

  for (const file of await glob('**/*.mdx', {
    cwd: path.dirname(indexFile),
    absolute: true,
  })) {
    const basename = path.basename(file)
    slugs.push(basename.replace('.mdx', '').replace(/^[0-9]+?-/, ''))
    id = Math.max(parseInt(basename.split('-')[0]) + 1, id)
  }

  const indexFileExports = await importIndexFile(indexFile)
  let defaultTags: {label: string; value: string}[] = []
  let defaultCategories: {label: string; value: string}[] = []
  if (indexFileExports) {
    // Pulls current categories and sorts by commonality
    const tags = taxonomy((indexFileExports as any).posts, 'tags')
    defaultTags = Object.keys(tags)
      .sort((a, b) => tags[b].length - tags[a].length)
      .map((key) => ({label: key, value: key}))
    // Pulls current categories and sorts by commonality
    const categories = taxonomy((indexFileExports as any).posts, 'categories')
    defaultCategories = Object.keys(categories)
      .sort((a, b) => categories[b].length - categories[a].length)
      .map((key) => ({label: key, value: key}))
  }

  render(
    React.createElement(() => {
      const [
        {title, description, categories, tags, slug, error, step},
        dispatch,
      ] = React.useReducer(
        (
          state: {
            title: string
            description: string
            categories: string[]
            tags: string[]
            slug: string
            error: string
            step: number
          },
          action:
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
        ) => {
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
        }
      )

      const steps = [
        {
          title: 'Title',
          value: title,
          onChange: (value: string) =>
            dispatch({type: 'set', key: 'title', value}),
          onSubmit: () => {
            if (!title.trim()) {
              dispatch({
                type: 'setError',
                value: `Title cannot be empty.`,
              })
            } else {
              dispatch({type: 'continue'})
            }
          },
        },
        {
          title: 'Description',
          value: description,
          direction: 'column',
          onChange: (value: string) =>
            dispatch({type: 'set', key: 'description', value}),
          onSubmit: () => {
            if (!title.trim()) {
              dispatch({
                type: 'setError',
                value: `Description cannot be empty.`,
              })
            } else {
              dispatch({type: 'continue'})
            }
          },
        },
        {
          title: 'Slug',
          value: slug,
          onChange: (value: string) =>
            dispatch({type: 'set', key: 'slug', value}),
          onSubmit: () => {
            if (slugs.indexOf(slug) > -1) {
              dispatch({
                type: 'setError',
                value: `You've already used this slug. Slugs must be unique.`,
              })
            } else {
              dispatch({type: 'continue'})
            }
          },
        },
        {
          component: TaxonomicStep,
          title: 'Tags',
          value: tags,
          items: defaultTags.filter(({value}) => !tags.includes(value)),
          onSubmit: (value: string) => {
            if (value === '___DONE___') {
              dispatch({type: 'continue'})
            } else {
              dispatch({type: 'taxonomy', key: 'tags', value})
            }
          },
        },
        {
          component: TaxonomicStep,
          title: 'Categories',
          value: categories,
          items: defaultCategories.filter(
            ({value}) => !categories.includes(value)
          ),
          onSubmit: (value: string) => {
            if (value === '___DONE___') {
              dispatch({type: 'continue'})
            } else {
              dispatch({type: 'taxonomy', key: 'categories', value})
            }
          },
        },
      ] as const

      React.useEffect(() => {
        if (step === steps.length) {
          const filepath = path.join(
            path.dirname(indexFile),
            `${id}-${slug}.mdx`
          )

          writePost(filepath, {
            metadata: {
              title,
              description,
              timestamp: Date.now(),
              tags,
              categories,
            },
          })
            .then(() => {
              openEditor([filepath], {})
            })
            .then(() => buildBin(indexFile))
        }
      }, [step, slug, description, title, tags, categories, steps])

      return (
        <Box flexDirection='column'>
          {steps.map(
            (
              {
                component: Component = Step,
                ...stepProps
              }: typeof stepProps & {component: React.ComponentType},
              i
            ) => (
              <Component key={i} step={i} currentStep={step} {...stepProps} />
            )
          )}

          {!!error && <Text color='red'>{error}</Text>}
        </Box>
      )
    })
  )
}

function Step({
  step,
  currentStep,
  title,
  value,
  direction = 'row',
  onSubmit,
  onChange,
}: {
  step: number
  currentStep: number
  title: string
  value: string
  direction?: 'row' | 'column'
  onSubmit: () => void
  onChange: (value: string) => void
}) {
  return (
    currentStep >= step && (
      <Box flexDirection={direction}>
        <Box marginRight={1}>
          <Text
            bold
            backgroundColor={step === currentStep ? '#4C51BF' : '#EBF4FF'}
            color={step === currentStep ? '#EBF4FF' : '#3C366B'}
          >
            {` ${title} `}
          </Text>
        </Box>

        <Box marginBottom={1}>
          {currentStep === step && (
            <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
          )}

          {currentStep > step && <Text bold>{value}</Text>}
        </Box>
      </Box>
    )
  )
}

function TaxonomicStep({
  step,
  currentStep,
  title,
  label,
  items = [],
  value,
  direction = 'row',
  onSubmit,
}: {
  step: number
  currentStep: number
  title: string
  label?: string
  items?: Item[]
  value: string[]
  direction?: 'row' | 'column'
  onSubmit: (value: string) => void
}) {
  return (
    currentStep >= step && (
      <Box flexDirection={direction}>
        <Box marginRight={1}>
          <Text
            bold
            backgroundColor={step === currentStep ? '#4C51BF' : '#EBF4FF'}
            color={step === currentStep ? '#EBF4FF' : '#3C366B'}
          >
            {` ${title} `}
          </Text>
        </Box>

        <Box flexDirection='column' marginBottom={1}>
          {currentStep >= step && value.length > 0 && (
            <Text bold>{value.join(', ')}</Text>
          )}
          {currentStep === step && (
            <Box marginTop={value.length > 0 ? 1 : 0}>
              <QuickSearch
                label={label || `Select ${title.toLowerCase()}`}
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
      </Box>
    )
  )
}

export function taxonomy<T extends Record<string, any>>(
  posts: T[],
  type: string
) {
  return Object.values(posts).reduce((acc, post) => {
    for (const item of post.metadata[type] || []) {
      acc[item] = acc[item] || []
      acc[item].push(post)
    }

    return acc
  }, {} as Record<string, T[]>)
}
