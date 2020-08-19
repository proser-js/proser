import React from 'react'
import type {Item} from './components/quick-search-input'
import type {ProserConfig} from './types'
export declare function post(
  configMap: Record<string, ProserConfig>,
  argv?: {
    slug?: string
    [key: string]: any
  }
): Promise<void>
export declare function TextInput({
  value,
  onSubmit,
  status,
  onChange,
}: TextInputProps): JSX.Element
export interface TextInputProps {
  value: string
  status: ProserInputStatus
  onSubmit: () => void
  onChange: (value: string) => void
}
export declare function TaxonomicInput({
  label,
  items,
  value,
  status,
  onSubmit,
}: TaxonomicInputProps): JSX.Element
export interface TaxonomicInputProps {
  label?: string
  items?: Item[]
  value: string[]
  status: ProserInputStatus
  onSubmit: (value: string) => void
}
export declare function ProserInput({
  render,
  status,
  label,
  flexDirection,
}: ProserInputProps): JSX.Element | null
export interface ProserInputProps {
  label: string
  flexDirection?: 'row' | 'column'
  status: ProserInputStatus
  render: ProserInputRenderer
}
export interface ProserInputRenderer {
  ({status}: {status: ProserInputStatus}): React.ReactElement
}
export declare type ProserInputStatus = 'inactive' | 'active' | 'complete'
export declare type ProserPostInput = Record<string, any>
export declare type ProserPlugin = (
  options: Record<string, any>
) => null | React.ComponentType<ProserPluginProps>
export interface ProserPluginProps {
  metadata: Record<string, any>
  status: ProserInputStatus
  onSubmit: (metadata: Record<string, any>) => void
  [propName: string]: any
}
export declare type ProserPluginModule =
  | ProserPlugin
  | {
      default: ProserPlugin
    }
