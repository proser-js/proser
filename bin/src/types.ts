import type {PluginItem} from '@babel/core'

export type ProserConfig = {
  index: string
  template?: string
  plugins?: ProserPluginItem[]
  babel?: {
    plugins?: PluginItem[] | null
    presets?: PluginItem[] | null
  }
}

export type ProserPluginItem = string | [string, Record<string, any>]
