import type {ProserConfig} from './types'
export declare function post(
  configMap: Record<string, ProserConfig>,
  argv?: {
    slug?: string
    [key: string]: any
  }
): Promise<void>
export declare function taxonomy<T extends Record<string, any>>(
  posts: T[],
  type: string
): Record<string, T[]>
