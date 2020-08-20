import type {ProserConfig} from './types'
export declare function build(
  config: ProserConfig,
  watchMode?: boolean
): Promise<void>
export declare function buildRenderer(
  configMap: Record<string, ProserConfig>,
  argv?: {
    slug?: string
    [key: string]: any
  }
): Promise<void>
