// import React from 'react'
import {renderHook, act} from '@testing-library/react-hooks'
import {
  usePaginate,
  useOrder,
  useTag,
  useCategory,
  useRelatedPosts,
} from './index'

const defaultPosts = [
  {
    id: 0,
    metadata: {
      title: 'Hello cats',
      tags: ['cat', 'mouse'],
      categories: ['animals'],
      popularity: 0.1,
    },
  },
  {
    id: 1,
    metadata: {
      title: 'Hello dogs',
      tags: ['dog', 'mouse'],
      categories: ['animals'],
      popularity: 0.5,
    },
  },
  {
    id: 2,
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
    const {result} = renderHook(() => useTag(defaultPosts, 'cat'))
    expect(result.current).toEqual([defaultPosts[0]])
  })

  it('should also pass', () => {
    const {result} = renderHook(() => useTag(defaultPosts, 'mouse'))
    expect(result.current).toEqual([defaultPosts[0], defaultPosts[1]])
  })

  it('should return empty if not found', () => {
    const {result} = renderHook(() => useTag(defaultPosts, 'quetzalcoatl'))
    expect(result.current).toEqual([])
  })
})

describe('useCategory()', () => {
  it('should pass', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'animals'))
    expect(result.current).toEqual([defaultPosts[0], defaultPosts[1]])
  })

  it('should also pass', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'food'))
    expect(result.current).toEqual([defaultPosts[2]])
  })

  it('should return empty if not found', () => {
    const {result} = renderHook(() => useCategory(defaultPosts, 'quetzalcoatl'))
    expect(result.current).toEqual([])
  })
})

describe('useRelatedPosts()', () => {
  it('should pass', () => {
    const {result} = renderHook(() =>
      useRelatedPosts(defaultPosts[0], defaultPosts)
    )

    expect(result.current).toEqual([defaultPosts[1], defaultPosts[2]])
  })

  it('should let tag outweigh category', () => {
    const posts = [
      {
        id: 0,
        metadata: {
          title: 'Hello cats',
          tags: ['cat', 'mouse'],
          categories: ['animals'],
          popularity: 0.1,
        },
      },
      {
        id: 1,
        metadata: {
          title: 'Hello dogs',
          tags: ['dog', 'bird'],
          categories: ['animals'],
          popularity: 0.5,
        },
      },
      {
        id: 2,
        metadata: {
          title: 'Hello food',
          tags: ['oatmeal', 'cat'],
          categories: ['food'],
          popularity: 0.2,
        },
      },
    ]

    const {result, rerender} = renderHook(
      ({weight}) => useRelatedPosts(posts[0], posts, weight),
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
})
