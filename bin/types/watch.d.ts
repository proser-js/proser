import {ProserConfig} from './types'
export declare function watch(
  configMap: Record<string, ProserConfig>,
  argv?: {
    slug?: string
    [key: string]: any
  }
): Promise<void>
