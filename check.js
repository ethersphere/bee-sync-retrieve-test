/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
const { Bee } = require('@ethersphere/bee-js')

const BEE_HOSTS = (process.env.BEE_HOSTS && process.env.BEE_HOSTS.split(',')) || ['http://localhost:1633']
const bees = BEE_HOSTS.filter(host => host.length !== 0).map(host => new Bee(host))

async function tryRetrieveHash(bee, hash) {
  const start = Date.now()
  try {
    await bee.downloadData(hash)
    const end = Date.now()
    const elapsed = end - start
    console.log(`Bee ${bee.url} finished, elapsed time ${Math.ceil((elapsed) / 1000)} secs, hash ${hash}`)

    return {
      bee: bee.url,
      hash,
      elapsed,
    }
  } catch (e) {
    return {
      bee: bee.url,
      hash: null,
    }
  }
}

function error(e) {
  throw e
}

async function check() {
  const hash = process.argv[2] || error('missing hash argument')

  const responses = await Promise.all(bees.map(bee => tryRetrieveHash(bee, hash)))
  const missing = responses.filter(response => response.hash === null).length

  console.log({ responses, missing })
}

check().catch(error => {
  console.error({ error })
  process.exit(1)
})
