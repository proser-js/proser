export declare function usePaginate<T>(
  posts: T[],
  options?: UsePaginateOptions
): readonly [
  T[],
  {
    readonly page: number
    readonly pages: number
    readonly set: (nextPage: number) => void
    readonly next: () => void
    readonly prev: () => void
  }
]
export interface UsePaginateOptions {
  page?: number
  /**
   * @default 1
   */
  initialPage?: number
  postsPerPage?: number
  onChange?: (page: number, prevPage: number) => any
}
export declare function useOrder<T extends PostLike>(
  posts: T[],
  sortFn?:
    | 'asc'
    | 'desc'
    | {
        [key in Extract<keyof T['metadata'], string>]?: 'asc' | 'desc'
      }
    | ((a: T, b: T) => number)
): T[]
export declare function useTaxonomy<T extends PostLike>(
  posts: T[],
  type: string,
  key: string
): T[]
export declare function useTaxonomies<T extends PostLike>(
  posts: T[],
  type: string,
  sortFn?: (a: [string, T[]], b: [string, T[]]) => number
): Record<string, T[]>
export declare function useTag<T extends PostLike>(posts: T[], tag: string): T[]
export declare function useTags<T extends PostLike>(
  posts: T[],
  sortFn?: (a: [string, T[]], b: [string, T[]]) => number
): Record<string, T[]>
export declare function useCategory<T extends PostLike>(
  posts: T[],
  category: string
): T[]
export declare function useCategories<T extends PostLike>(
  posts: T[],
  sortFn?: (a: [string, T[]], b: [string, T[]]) => number
): Record<string, T[]>
/**
 *
 * @param posts
 * @param weight
 *
 * @example
 * useRelatedPosts(post, posts, {tags: 1, categories: 2})
 */
export declare function useRelatedPosts<T extends PostLike>(
  post: T,
  posts: T[],
  weight?: {
    [taxonomy: string]: number
  }
): T[]
export declare function taxonomy<T extends PostLike>(
  posts: T[],
  type: string
): Record<string, T[]>
export declare function slugify(value: string): string
export interface PostLike {
  id: number
  metadata: Record<string, any>
}
