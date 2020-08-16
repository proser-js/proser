import path from 'path'
import {promisify} from 'util'
import glob_ from 'glob'
import React from 'react'
import {render, Box, Text} from 'ink'
import TextInput from 'ink-text-input'
import openEditor from 'open-editor'
import slugify from 'slugify'
import {bin as buildBin} from './build'
// import {deletePost} from './utils'

export const bin = (indexFile: string) => {}
