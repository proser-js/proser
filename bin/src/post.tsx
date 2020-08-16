import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import TextInput from 'ink-text-input'
import openEditor from 'open-editor'
import slugify from 'slugify'
import {bin as buildBin} from './build'
import {writePost} from './utils'

const glob = promisify(glob_)

export async function bin(indexFile: string) {
  const slugs = []
  let id = 0

  for (const file of await glob('**/*.mdx', {
    cwd: path.dirname(indexFile),
    absolute: true,
  })) {
    const basename = path.basename(file)
    slugs.push(basename.replace('.mdx', '').replace(/^[0-9]+?-/, ''))

    id = Math.max(parseInt(basename.split('-')[0]) + 1, id)
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
          step: 0,
          currentStep: step,
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
          step: 1,
          currentStep: step,
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
          step: 2,
          currentStep: step,
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
          {steps.map((stepProps) => (
            <Step key={stepProps.step} {...stepProps} />
          ))}

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
