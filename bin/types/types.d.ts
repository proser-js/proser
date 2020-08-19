/// <reference types="react" />
import type {PluginItem} from '@babel/core'
export declare type ProserConfig = {
  index: string
  template?: string
  plugins?: ProserPlugin[]
  babel?: {
    plugins?: PluginItem[] | null
    presets?: PluginItem[] | null
  }
}
declare type ProserPostInput = {
  component: React.ComponentType
  onSubmit: (data: Record<string, any>) => void
}
declare type ProserPlugin = (inputs: ProserPostInput[]) => any
export {}
