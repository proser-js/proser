import {FunctionComponent, FC, PropsWithChildren} from 'react'
export declare type IsSelected = PropsWithChildren<{
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
export declare const QuickSearch: FC<QuickSearchProps>
export interface StatusProps {
  hasMatch: boolean
  label?: string
}
