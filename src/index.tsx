import React from 'react'
import useChange from '@react-hook/change'
import {orderBy} from 'natural-orderby'
import baseSlugify from 'slugify'

export function usePaginate<T>(posts: T[], options: UsePaginateOptions = {}) {
  const [page, setPage] = React.useState(
    options.page ?? options.initialPage ?? 1
  )
  useChange(page, options.onChange || noop)
  const currentPage = options.page ?? page
  const postsPerPage = options.postsPerPage ?? 20
  const pages = Math.ceil(posts.length / postsPerPage)
  const start = postsPerPage * (currentPage - 1)
  const bound = (value: number) => Math.min(Math.max(1, value), pages)

  return [
    posts.slice(start, start + postsPerPage),
    {
      page: currentPage,
      pages,
      set: (nextPage: number) => setPage(bound(nextPage)),
      next: () => setPage((current) => bound(++current)),
      prev: () => setPage((current) => bound(--current)),
    },
  ] as const
}

export interface UsePaginateOptions {
  page?: number
  /**
   * @default 1
   */
  initialPage?: number
  postsPerPage?: number
  onChange?: (page: number, prevPage: number) => any
}

export function useOrder<T extends PostLike>(
  posts: T[],
  sortFn?:
    | 'asc'
    | 'desc'
    | {[key in Extract<keyof T['metadata'], string>]?: 'asc' | 'desc'}
    | ((a: T, b: T) => number)
) {
  sortFn = sortFn ?? 'desc'

  return React.useMemo(() => {
    if (typeof sortFn === 'object') {
      return orderBy(
        posts,
        Object.keys(sortFn).map((key) => (v) => v.metadata[key]),
        Object.values(sortFn) as ('asc' | 'desc')[]
      )
    }

    return posts.sort(
      sortFn === 'asc'
        ? (a: any, b: any) => a.id - b.id
        : sortFn === 'desc'
        ? (a: any, b: any) => b.id - a.id
        : sortFn
    )
  }, [posts, sortFn])
}

export function useTaxonomy<T extends PostLike>(
  posts: T[],
  type: string,
  key: string
) {
  return React.useMemo(() => {
    const slug = slugify(key)
    return (
      taxonomy(posts, type).find((data) => data.slug === slug) || {
        slug,
        posts: [],
      }
    )
  }, [posts, type, key])
}

export function useTaxonomies<T extends PostLike>(
  posts: T[],
  type: string,
  sortFn?: (
    a: {slug: string; posts: T[]},
    b: {slug: string; posts: T[]}
  ) => number
) {
  return React.useMemo(() => {
    const t = taxonomy(posts, type)
    if (!sortFn) return t
    return t.sort((a, b) => sortFn(a, b))
  }, [posts, type, sortFn])
}

export function useTag<T extends PostLike>(posts: T[], tag: string) {
  return useTaxonomy(posts, 'tags', tag)
}

export function useTags<T extends PostLike>(
  posts: T[],
  sortFn?: (
    a: {slug: string; posts: T[]},
    b: {slug: string; posts: T[]}
  ) => number
) {
  return useTaxonomies(posts, 'tags', sortFn)
}

export function useCategory<T extends PostLike>(posts: T[], category: string) {
  return useTaxonomy(posts, 'categories', category)
}

export function useCategories<T extends PostLike>(
  posts: T[],
  sortFn?: (
    a: {slug: string; posts: T[]},
    b: {slug: string; posts: T[]}
  ) => number
) {
  return useTaxonomies(posts, 'categories', sortFn)
}

/**
 *
 * @param posts
 * @param weight
 *
 * @example
 * useRelatedPosts(posts, post, {tags: 1, categories: 2})
 */
export function useRelatedPosts<T extends PostLike>(
  posts: T[],
  post: T,
  weight: {[taxonomy: string]: number} = {tags: 0.5, categories: 1}
) {
  const weightKey = JSON.stringify(weight)

  return React.useMemo(() => {
    const weightKeys = Object.keys(weight)
    const taxonomies = weightKeys.reduce((acc, key) => {
      acc[key] = taxonomy(posts, key).reduce((ps, t) => {
        ps[t.slug] = t.posts
        return ps
      }, {} as Record<string, T[]>)
      return acc
    }, {} as Record<string, Record<string, T[]>>)
    const weights = new Map<T, number>()

    for (const taxonomy in taxonomies) {
      const taxonomyMap = taxonomies[taxonomy]
      const postTaxonomy = post.metadata[taxonomy]
      // Skip if this taxonomy doesn't exist on the OP
      if (postTaxonomy === void 0) continue
      const matchable = Array.isArray(postTaxonomy)
        ? postTaxonomy
        : [postTaxonomy]

      for (let value of matchable) {
        value = slugify(value)
        const taxPosts = taxonomyMap[value]

        for (let i = 0; i < taxPosts.length; i++) {
          const taxPost = taxPosts[i]
          if (post === taxPost) continue
          const currentWeight = weights.get(taxPost) || 0
          weights.set(taxPost, currentWeight + weight[taxonomy])
        }
      }
    }

    return posts
      .filter((p) => p.id !== post.id)
      .sort((a, b) => (weights.get(b) || 0) - (weights.get(a) || 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, weightKey])
}

export function taxonomy<T extends PostLike>(posts: T[], type: string) {
  const initial = Object.values(posts).reduce((acc, post) => {
    for (let item of post.metadata[type] || []) {
      item = slugify(item)
      acc[item] = acc[item] || []
      acc[item].push(post)
    }

    return acc
  }, {} as Record<string, T[]>)

  return Object.keys(initial).map((key) => ({
    slug: key,
    posts: initial[key],
  }))
}

export function slugify(value: string) {
  return baseSlugify(value, {lower: true, strict: true})
}

function noop() {}

export interface PostLike {
  id: number
  slug: string
  metadata: Record<string, any>
}
