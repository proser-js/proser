import type {PluginItem} from '@babel/core'
export declare type ProserConfig = {
  index: string
  template?: string
  plugins?: ProserPluginItem[]
  babel?: {
    plugins?: PluginItem[] | null
    presets?: PluginItem[] | null
  }
}
export declare type ProserPluginItem = string | [string, Record<string, any>]
