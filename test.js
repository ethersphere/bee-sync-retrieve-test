/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
const { Bee } = require('@ethersphere/bee-js')
const crypto = require('crypto')

const POSTAGE_STAMP = process.env.POSTAGE_STAMP || '0000000000000000000000000000000000000000000000000000000000000000'

const BEE_HOSTS = (process.env.BEE_HOSTS && process.env.BEE_HOSTS.split(',')) || ['http://localhost:1633']
const bees = BEE_HOSTS.map(host => new Bee(host))

function sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

async function tryRetrieveHash(bee, hash) {
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const data = await bee.downloadData(hash)
      const end = Date.now()

      console.log(`Bee ${bee.url} finished, elapsed time ${Math.ceil((end - start) / 1000)} secs, hash ${hash}`)

      return data
    } catch (e) {
      await sleep(30_000 + Math.floor(Math.random() * 60_000))
    }
  }
}

function retrieveAllHashes(bee, hashes) {
  return Promise.all(hashes.map(hash => tryRetrieveHash(bee, hash)))
}

async function retrieveHashFromAll(hash) {
  const start = Date.now()

  await Promise.all(bees.map(bee => tryRetrieveHash(bee, hash)))

  const end = Date.now()
  console.log(`Hash retrieved, elapsed time ${Math.ceil((end - start) / 1000)} secs, hash ${hash}`)
}

async function uploadRandom() {
  const randomData = crypto.randomBytes(32)
  const randomIndex = Math.floor(Math.random() * BEE_HOSTS.length)
  const randomBee = bees[randomIndex]
  const params = { 'swarm-chunk-test': '1' }
  const hash = await randomBee.uploadData(POSTAGE_STAMP, randomData, { axiosOptions: { params } })

  console.log(`Bee ${randomBee.url} uploaded, hash ${hash}`)

  return hash
}

async function uploadAndCheck() {
  const numHashes = (process.argv[2] && parseInt(process.argv[2])) || 1

  const hashes = await Promise.all(Array(numHashes).fill(numHashes).map(uploadRandom))

  console.log({ numHashes, hashes })

  await Promise.all(hashes.map(retrieveHashFromAll))
}

uploadAndCheck().catch(error => {
  console.error({ error })
  process.exit(1)
})
