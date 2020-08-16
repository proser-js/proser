import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import TextInput from 'ink-text-input'
import {QuickSearch} from 'ink-quicksearch-input'
import type {IsSelected} from 'ink-quicksearch-input'
import yn from 'yn'
import {bin as buildBin} from './build'
import {deletePost} from './utils'

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
      }, [])

      React.useEffect(() => {
        if (result && confirmed) {
          deletePost(result.filepath).then(() => buildBin(indexFile))
        }
      }, [result, confirmed])

      return (
        <Box flexDirection='column'>
          {!result && (
            <QuickSearch
              items={slugs}
              onSelect={(item) => setResult(item)}
              indicatorComponent={IndicatorComponent}
              itemComponent={ItemComponent}
              highlightComponent={HighlightComponent}
              statusComponent={StatusComponent}
            />
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

// For the following four, whitespace is important
const IndicatorComponent: React.FC<IsSelected> = ({isSelected}) => {
  return (
    <Text backgroundColor={isSelected ? '#4C51BF' : undefined} color='#EBF4FF'>
      {isSelected ? ' ▶ ' : '   '}
    </Text>
  )
}

const ItemComponent: React.FC<IsSelected> = ({isSelected, children}) => (
  <Text backgroundColor={isSelected ? '#4C51BF' : ''} color='#EBF4FF'>
    {children}
  </Text>
)

const HighlightComponent: React.FC = ({children}) => (
  <Text backgroundColor='#6C71C4'>{children}</Text>
)

export interface StatusProps {
  hasMatch: boolean
  label?: string
}

const StatusComponent: React.FC<StatusProps> = ({
  // hasMatch,
  children,
  label,
}) => (
  <Text>
    {`${label || 'Select a post'}: `}
    <Text color={'#74BEFF'}>{children}</Text>
  </Text>
)

const ConfirmInput = ({
  defaultYn = false,
  placeholder = 'No',
  onSubmit = () => {},
}: ConfirmInputProps) => {
  const [value, setValue] = React.useState<string>('')

  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={setValue}
      onSubmit={(value) => {
        onSubmit(yn(value, {default: defaultYn}))
      }}
    />
  )
}

interface ConfirmInputProps {
  /**
   * @default false
   */
  defaultYn?: boolean
  /**
   * @default n
   */
  placeholder?: string
  onSubmit?: (value: boolean) => any
}
