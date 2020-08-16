import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const extractMetadata = require('./utils')

async function bin() {
  const filepath = path.join(__dirname, '../src/pages/posts/hello-world.mdx')
  const metadata = await extractMetadata(filepath)
  console.log(metadata)
}

bin()
