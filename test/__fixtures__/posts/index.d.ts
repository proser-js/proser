/**
 * 🔆 You can and should edit this file to match your actual Post type.
 *    if you're using extra or different metadata.
 */
import React from 'react'

export type Post = {
  component: React.LazyExoticComponent<(props: any) => JSX.Element>
  metadata: {
    title: string
    description: string
    // image?: Promise<typeof import('*.jpg')>
    categories: string[]
    tags: string[]
  }
}

export const posts: Record<string, Post>
