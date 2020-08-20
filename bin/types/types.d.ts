import type {PluginItem, Node} from '@babel/core'
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
export declare type ProserBabelPlugin = {
  config: ProserConfig
  posts: {
    filepath: string
    id: number
    slug: string
    exports: Node
    component: Node
  }[]
}
