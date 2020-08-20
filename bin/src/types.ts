import type {PluginItem, Node} from '@babel/core'

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
export type ProserBabelPluginOptions = {
  config: ProserConfig
  posts: {
    filepath: string
    id: number
    slug: string
    exports: Node
    component: Node
  }[]
}
