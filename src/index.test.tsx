// import React from 'react'
import {renderHook, act} from '@testing-library/react-hooks'
import {
  usePaginate,
  useOrder,
  useTag,
  useTags,
  useCategory,
  useCategories,
  useTaxonomies,
  useRelatedPosts,
} from './index'

const defaultPosts = [
  {
    id: 0,
    slug: 'hello-cats',
    metadata: {
      title: 'Hello cats',
      tags: ['cat', 'mouse'],
      categories: ['animals'],
      popularity: 0.1,
    },
  },
  {
    id: 1,
    slug: 'hello-dogs',
    metadata: {
      title: 'Hello dogs',
      tags: ['dog', 'mouse'],
      categories: ['animals'],
      popularity: 0.5,
    },
  },
  {
    id: 2,
    slug: 'hello-food',
    metadata: {
      title: 'Hello food',
      tags: ['oatmeal', 'sushi'],
      categories: ['food'],
      popularity: 0.2,
    },
  },
]

describe('usePaginate()', () => {
  it('should incr on next', () => {
    const {result} = renderHook(() =>
      usePaginate(defaultPosts, {postsPerPage: 1})
    )

    expect(result.current[0]).toEqual([defaultPosts[0]])
    expect(result.current[1].page).toBe(1)
    expect(result.current[1].pages).toBe(3)

    act(() => result.current[1].next())
    expect(result.current[0]).toEqual([defaultPosts[1]])
    expect(result.current[1].page).toBe(2)
  })

  it('should decr on prev', () => {
    const {result} = renderHook(() =>
      usePaginate(defaultPosts, {postsPerPage: 1, initialPage: 3})
    )

    expect(result.current[0]).toEqual([defaultPosts[2]])
    expect(result.current[1].page).toBe(3)
    expect(result.current[1].pages).toBe(3)

    act(() => result.current[1].prev())
    expect(result.current[0]).toEqual([defaultPosts[1]])
    expect(result.current[1].page).toBe(2)
  })

  it('should set page', () => {
    const {result} = renderHook(() =>
      usePaginate(defaultPosts, {postsPerPage: 1})
    )

    expect(result.current[0]).toEqual([defaultPosts[0]])
    expect(result.current[1].page).toBe(1)
    expect(result.current[1].pages).toBe(3)

    act(() => result.current[1].set(3))
    expect(result.current[0]).toEqual([defaultPosts[2]])
    expect(result.current[1].page).toBe(3)
  })

  it('should have correct page count', () => {
    const {result} = renderHook(() => usePaginate(defaultPosts))

    expect(result.current[0]).toEqual(defaultPosts)
    expect(result.current[1].page).toBe(1)
    expect(result.current[1].pages).toBe(1)
  })

  it('should bound itself', () => {
    const {result} = renderHook(() => usePaginate(defaultPosts))

    expect(result.current[0]).toEqual(defaultPosts)
    expect(result.current[1].page).toBe(1)

    act(() => result.current[1].next())
    expect(result.current[1].page).toBe(1)

    act(() => result.current[1].prev())
    expect(result.current[1].page).toBe(1)

    act(() => result.current[1].set(4))
    expect(result.current[1].page).toBe(1)
  })

  it('should be controlled', () => {
    let page = 1

    const handleChange = jest.fn((nextPage: number) => {
      page = nextPage
    })

    const {result, rerender} = renderHook(
      ({page}: {page: number}) =>
        usePaginate(defaultPosts, {
          page,
          postsPerPage: 1,
          onChange: handleChange,
        }),
      {initialProps: {page}}
    )

    act(() => result.current[1].next())
    expect(handleChange).toBeCalledWith(2, 1)

    rerender({page})
    expect(result.current[1].page).toBe(2)
  })
})

describe('useOrder()', () => {
  it('should default to desc', () => {
    const {result} = renderHook(() => useOrder(defaultPosts))
    expect(result.current).toEqual(defaultPosts.reverse())
  })

  it('should order by asc', () => {
    const {result} = renderHook(() => useOrder(defaultPosts, 'asc'))
    expect(result.current).toEqual(defaultPosts)
  })

  it('should order by popularity desc', () => {
    const {result} = renderHook(() =>
      useOrder(defaultPosts, {popularity: 'desc'})
    )

    expect(result.current).toEqual([
      defaultPosts[1],
      defaultPosts[2],
      defaultPosts[0],
    ])
  })

  it('should order by title asc', () => {
    const {result} = renderHook(() => useOrder(defaultPosts, {title: 'asc'}))
    expect(result.current).toEqual(defaultPosts)
  })
})

describe('useTag()', () => {
  it('should pass', () => {
    const {result} = renderHook(() => useTag(defaultPosts, 'Cat'))
    expect(result.current.posts).toEqual([defaultPosts[0]])
  })

  it('should also pass', () => {
    const {result} = renderHook(() => useTag(defaultPosts, 'mouse'))
    expect(result.current.posts).toEqual([defaultPosts[0], defaultPosts[1]])
  })

  it('should return empty if not found', () => {
    const {result} = renderHook(() => useTag(defaultPosts, 'quetzalcoatl'))
    expect(result.current.posts).toEqual([])
  })
})

describe('useCategory()', () => {
  it('should pass', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'animals'))
    expect(result.current.posts).toEqual([defaultPosts[0], defaultPosts[1]])
  })

  it('should also pass', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'food'))
    expect(result.current.posts).toEqual([defaultPosts[2]])
  })

  it('should return empty if not found', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'quetzalcoatl'))
    expect(result.current.posts).toEqual([])
  })
})

describe('useRelatedPosts()', () => {
  it('should pass', () => {
    const {result} = renderHook(() =>
      useRelatedPosts(defaultPosts, defaultPosts[0])
    )

    expect(result.current).toEqual([defaultPosts[1], defaultPosts[2]])
  })

  it('should let tag outweigh category', () => {
    const posts = [
      {
        id: 0,
        slug: 'hello-cats',
        metadata: {
          title: 'Hello cats',
          tags: ['cat', 'mouse'],
          categories: ['animals'],
          popularity: 0.1,
        },
      },
      {
        id: 1,
        slug: 'hello-dogs',
        metadata: {
          title: 'Hello dogs',
          tags: ['dog', 'bird'],
          categories: ['animals'],
          popularity: 0.5,
        },
      },
      {
        id: 2,
        slug: 'hello-food',
        metadata: {
          title: 'Hello food',
          tags: ['oatmeal', 'cat'],
          categories: ['food'],
          popularity: 0.2,
        },
      },
    ]

    const {result, rerender} = renderHook(
      ({weight}) => useRelatedPosts(posts, posts[0], weight),
      {
        initialProps: {
          weight: {
            tags: 0.5,
            categories: 1,
          },
        },
      }
    )

    expect(result.current).toEqual([posts[1], posts[2]])

    rerender({
      weight: {
        tags: 1,
        categories: 0.5,
      },
    })

    expect(result.current).toEqual([posts[2], posts[1]])
  })

  it('should weight multiple matches', () => {
    const posts = [
      {
        id: 0,
        slug: 'hello-cats',
        metadata: {
          title: 'Hello cats',
          tags: ['cat', 'mouse', 'fish'],
          categories: ['animals'],
          popularity: 0.1,
        },
      },
      {
        id: 1,
        slug: 'hello-dogs',
        metadata: {
          title: 'Hello dogs',
          tags: ['dog', 'pet'],
          categories: ['animals'],
          popularity: 0.5,
        },
      },
      {
        id: 2,
        slug: 'hello-food',
        metadata: {
          title: 'Hello food',
          tags: ['mouse', 'cat', 'fish'],
          categories: ['food'],
          popularity: 0.2,
        },
      },
    ]

    const {result} = renderHook(
      ({weight}) => useRelatedPosts(posts, posts[0], weight),
      {
        initialProps: {
          weight: {
            tags: 0.5,
            categories: 1,
          },
        },
      }
    )

    expect(result.current).toEqual([posts[2], posts[1]])
  })
})

describe('useTags()', () => {
  it('should pass', () => {
    const {result} = renderHook(() =>
      useTags(defaultPosts, (a, b) => b.posts.length - a.posts.length)
    )

    expect(result.current).toEqual([
      {slug: 'mouse', posts: [defaultPosts[0], defaultPosts[1]]},
      {slug: 'cat', posts: [defaultPosts[0]]},
      {slug: 'dog', posts: [defaultPosts[1]]},
      {slug: 'oatmeal', posts: [defaultPosts[2]]},
      {slug: 'sushi', posts: [defaultPosts[2]]},
    ])
  })
})

describe('useCategories()', () => {
  it('should pass', () => {
    const {result} = renderHook(() =>
      useCategories(defaultPosts, (a, b) => b.posts.length - a.posts.length)
    )

    expect(result.current).toEqual([
      {slug: 'animals', posts: [defaultPosts[0], defaultPosts[1]]},
      {slug: 'food', posts: [defaultPosts[2]]},
    ])
  })
})

describe('useTaxonomies()', () => {
  it('should slugify', () => {
    const data = {id: 0, slug: 'foo-bar', metadata: {tags: ['foo Bar']}}
    const {result} = renderHook(() => useTaxonomies([data], 'tags'))

    expect(result.current).toEqual([
      {
        slug: 'foo-bar',
        posts: [data],
      },
    ])
  })
})
