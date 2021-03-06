import React, {
  FunctionComponent,
  FC,
  useState,
  useEffect,
  useRef,
  useMemo,
  PropsWithChildren,
} from 'react'
import {useStdin, Text, Box} from 'ink'
import hasAnsi from 'has-ansi'
import isEqual from 'lodash.isequal'
// @ts-ignore This module makes stdin emit keypress events,
// that's it.  Hasn't been published in six years, no types
// available.
import keypress from 'keypress'

export type IsSelected = PropsWithChildren<{
  isSelected: boolean
}>

export interface ItemProps extends IsSelected {
  item: Item
  isHighlighted: boolean | undefined
}

export interface Item {
  label: string
  value?: string | number
}

interface KeyPress {
  name: string
  sequence: string
  shift: boolean
}

export interface QuickSearchProps {
  onSelect: (item: Item) => void
  items: Item[]
  label?: string
  focus?: boolean
  caseSensitive?: boolean
  limit?: number
  forceMatchingQuery?: boolean
  clearQueryChars?: string[]
  initialSelectionIndex?: number
  indicatorComponent?: FunctionComponent<IsSelected>
  itemComponent?: FunctionComponent<ItemProps>
  highlightComponent?: FunctionComponent
  statusComponent?: FunctionComponent<StatusProps>
}

export const QuickSearch: FC<QuickSearchProps> = (props) => {
  const {
    items,
    onSelect,
    focus,
    clearQueryChars,
    limit,
    indicatorComponent,
    itemComponent,
    highlightComponent,
    statusComponent,
    label,
    forceMatchingQuery,
  } = Object.assign({}, defaultProps, props)

  // Map prop components onto capitalized names, required
  // for JSX to recognize em
  const Indicator = indicatorComponent
  const Item = itemComponent
  const Highlight = highlightComponent
  const Status = statusComponent

  const [windowIndices, setWindowIndices] = useState({
    selection: 0,
    start: 0,
  })
  const [query, setQuery] = useState('')

  const matchingItems = useMemo(() => {
    return getMatchingItems()
  }, [items, query])
  const usingLimitedView = limit !== 0 && matchingItems.length > limit

  const inkStdin = useStdin()
  useEffect(
    function listenToRawKeyboard() {
      keypress(inkStdin.stdin)
      if (inkStdin.isRawModeSupported) inkStdin.setRawMode(true)
      // @ts-expect-error
      inkStdin.stdin.addListener('keypress', handleKeyPress)
      return () => {
        // @ts-expect-error
        inkStdin.stdin.removeListener('keypress', handleKeyPress)
        if (inkStdin.isRawModeSupported) inkStdin.setRawMode(false)
      }
    },
    [inkStdin, query, items, windowIndices]
  )

  const itemRef = useRef(items)
  useEffect(
    function resetForNewItems() {
      if (!isEqual(items, itemRef.current)) {
        itemRef.current = items
        setWindowIndices({
          selection: 0,
          start: 0,
        })
        setQuery('')
      }
    },
    [items]
  )

  const getValue = () => {
    setQuery('')
    return (
      matchingItems[windowIndices.selection] || {label: query, value: query}
    )
  }

  function getMatchIndex(label: string, query: string) {
    return props.caseSensitive
      ? label.indexOf(query)
      : label.toLowerCase().indexOf(query.toLowerCase())
  }

  function getMatchingItems(alternateQuery?: string) {
    const matchQuery = alternateQuery || query
    if (matchQuery === '') return items
    return items.filter((item) => getMatchIndex(item.label, matchQuery) >= 0)
  }

  function removeCharFromQuery() {
    setQuery((query) => query.slice(0, -1) as string)
  }

  function addCharToQuery(newChar: string) {
    setQuery((query) => {
      const newQuery = query + newChar
      const newMatching = getMatchingItems(newQuery)
      if (newMatching.length === 0 && forceMatchingQuery) {
        return query
      } else {
        setWindowIndices({start: 0, selection: 0})
        return newQuery
      }
    })
  }

  function selectUp() {
    setWindowIndices((windowIndices) => {
      const {selection, start} = windowIndices
      let newSelection = selection
      let newStart = start
      if (selection === 0) {
        // Wrap around to the bottom
        newSelection = matchingItems.length - 1
        if (usingLimitedView) {
          newStart = matchingItems.length - limit
        }
      } else {
        // Go up, potentially moving up window, unless
        // it is already 0.
        newSelection -= 1
        if (usingLimitedView) {
          if (selection - start <= 1 && start > 0) {
            newStart -= 1
          }
        }
      }
      return {
        selection: newSelection,
        start: newStart,
      }
    })
  }

  function selectDown() {
    setWindowIndices(({start, selection}) => {
      let newStart = start
      let newSelection = selection
      if (selection === matchingItems.length - 1) {
        // Wrap around to the top
        newSelection = 0
        if (newStart !== 0) newStart = 0
      } else {
        // Go down, potentially moving window
        newSelection++
        if (
          limit &&
          matchingItems.length > limit &&
          newSelection - newStart >= limit - 1
        ) {
          newStart += 1
        }
      }
      return {
        start: newStart,
        selection: newSelection,
      }
    })
  }

  function handleKeyPress(ch: string, key: KeyPress) {
    if (!focus) return
    if (!key) {
      addCharToQuery(ch)
      return
    }
    if (clearQueryChars.indexOf(ch) !== -1) {
      setQuery('')
    } else if (key.name === 'return') {
      onSelect(getValue())
    } else if (key.name === 'backspace') {
      removeCharFromQuery()
    } else if (key.name === 'up') {
      selectUp()
    } else if (key.name === 'down') {
      selectDown()
    } else if (key.name === 'tab') {
      if (key.shift === false) {
        selectDown()
      } else {
        selectUp()
      }
    } else if (hasAnsi(key.sequence)) {
      // Ignore fancy Ansi escape codes
    } else {
      addCharToQuery(ch)
    }
  }

  const begin = windowIndices.start
  let end = items.length
  if (limit !== 0) end = Math.min(begin + limit, items.length)
  const visibleItems = matchingItems.slice(begin, end)

  return (
    <Box key='quicksearch-input' flexDirection='column'>
      <Box key='status-label'>
        <Status label={label} hasMatch={visibleItems.length > 0}>
          {query}
        </Status>
      </Box>
      {visibleItems.length === 0 ? (
        <Text key='no-items-found'>No matches</Text>
      ) : (
        visibleItems.map((item) => {
          const isSelected =
            matchingItems.indexOf(item) === windowIndices.selection
          const isHighlighted = undefined
          const itemProps: ItemProps = {isSelected, isHighlighted, item}
          const label = item.label

          const queryStart = getMatchIndex(label, query)
          const queryEnd = queryStart + query.length
          itemProps.isHighlighted = true
          const preMatch = label.slice(0, queryStart)
          const match = label.slice(queryStart, queryEnd)
          const postMatch = label.slice(queryEnd)
          const labelComponent = (
            <Text>
              {preMatch}
              <Highlight>{match}</Highlight>
              {postMatch}
            </Text>
          )
          return (
            <Box flexDirection='row' key={`item-${item.label}`}>
              <Item {...itemProps}>
                <Indicator {...itemProps} />
                {labelComponent}
              </Item>
            </Box>
          )
        })
      )}
      {!usingLimitedView ? null : (
        <Box key='num-visible-items'>
          <HighlightComponent>
            Viewing {begin}-{end} of {matchingItems.length} matching items (
            {items.length} items overall)
          </HighlightComponent>
        </Box>
      )}
    </Box>
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
    <Text color='#74BEFF'>{children}</Text>
  </Text>
)

const defaultProps = {
  focus: true,
  caseSensitive: false,
  limit: 6,
  forceMatchingQuery: true,
  clearQueryChars: [
    '\u0015', // Ctrl + U
    '\u0017', // Ctrl + W
  ],
  initialSelectionIndex: 0,
  indicatorComponent: IndicatorComponent,
  itemComponent: ItemComponent,
  highlightComponent: HighlightComponent,
  statusComponent: StatusComponent,
}
