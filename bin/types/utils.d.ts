import type {ProserConfig} from './types'
export declare function writePosts(
  config: ProserConfig,
  posts: {
    filepath: string
    exports: string
  }[]
): Promise<void>
export declare function readFileCache(filepath: string): string
export declare function readFileCacheAsync(filepath: string): Promise<string>
export declare function readMetadata(
  filepath: string,
  fromCache?: boolean
): Promise<string>
export declare function writePost(
  filepath: string,
  options?: {
    metadata: Record<string, unknown>
    argv: Record<string, unknown>
    template?: string
  }
): Promise<string>
export declare function deletePost(filepath: string): Promise<void>
export declare function importIndexFile(
  indexFile: string
): Promise<{} | undefined>
