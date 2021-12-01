/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
const { Bee, Utils, BeeDebug, BeeError } = require('@ethersphere/bee-js')
const crypto = require('crypto')
const { appendFileSync } = require('fs')
const { formatDateTime, randomShuffle, makeRandomFuncFromSeed, retry, timeout, expBackoff, generateRandomBytes, generateRandomArray, randomRange, sleep } = require('./util')

const TIMEOUT = (process.env.TIMEOUT && parseInt(process.env.TIMEOUT, 10)) || 10 * 60
const POSTAGE_STAMP = process.env.POSTAGE_STAMP || '0000000000000000000000000000000000000000000000000000000000000000'

const BEE_HOSTS = (process.env.BEE_HOSTS && process.env.BEE_HOSTS.split(',')) || ['http://localhost:1633']
const bees = BEE_HOSTS.filter(host => host.length !== 0).map(host => new Bee(host, { onRequest }))

const report = {}

function onRequest(request) {
  // console.debug({ request })
}

async function downloadFile(bee, hash, path) {
  try {
    return await bee.downloadFile(hash, path)
  } catch (e) {
    if (e instanceof BeeError && e.status && e.status !== 404) {
      console.error({ bee, e, hash, path })
    } else if (e === 'timeout') {
      console.error({ bee, e, hash, path })
    }
    throw e
  }
}

async function retrieveFile(bee, hash, path) {
  const start = Date.now()
  await retry(
    () => timeout(
      () => downloadFile(bee, hash, path), 20_000)
    , expBackoff(3_000, 60_000, 1.5)
  )
  const end = Date.now()
  const elapsedSecs = Math.ceil((end - start) / 1000)

  console.log(`Bee ${bee.url}/${hash}/${path} [${i}] finished, elapsed time ${elapsedSecs} secs`)
}

async function retrieveWebsite(bee, files, hash) {
  console.log(`Retrieving website from ${bee.url}`)

  const start = Date.now()

  // retrieve index document first
  const indexDocument = files[0]
  await retrieveFile(bees, hash, indexDocument.path)

  // then retrieve assets in parallel
  const assets = files.slice(1)
  await Promise.all(assets.map(asset => retrieveFile(bee, hash, asset.path)))

  const end = Date.now()
  const elapsedSecs = Math.ceil((end - start) / 1000)
  console.log(`Website retrieved from ${bee.url}, elapsed time ${elapsedSecs} secs, hash ${hash}`)
}

async function retrieveWithReport(bees, files, hash) {
  const waitTime = 2 * 60_000
  console.log(`Waiting ${Math.floor(waitTime / 1000)} seconds...`)
  await sleep(waitTime)

  const start = Date.now()

  await Promise.all(bees.map(bee => retrieveWebsite(bee, files, hash)))

  const end = Date.now()
  const elapsedSecs = Math.ceil((end - start) / 1000)
  console.log(`Website retrieved from all bees, elapsed time ${elapsedSecs} secs, hash ${hash}`)

  report.values.push(elapsedSecs)
}

function makeBeeDebug(bee) {
  const beeDebugUrl = bee.url.replace(':1633', ':1635')
  return new BeeDebug(beeDebugUrl)
}

async function getPostageStamp(bee) {
  try {
    const beeDebug = makeBeeDebug(bee)
    const batches = await beeDebug.getAllPostageBatch()
    if (batches.length > 0) {
      return batches[0].batchID
    }
    return POSTAGE_STAMP
  } catch (e) {
    return POSTAGE_STAMP
  }
}

function makeRandomFile(name, minSize, maxSize, randomSeed) {
    const fileSize = randomRange(minSize, maxSize, makeRandomFuncFromSeed(randomSeed))
    const data = Uint8Array.from(generateRandomBytes(fileSize, randomSeed))

    return {
        path: name,
        data,
    }
}

function makeRandomFontFiles(randomSeed) {
  const numFontFiles = 4
  const fileSeeds = generateRandomArray(numFontFiles, randomSeed)
  const makeRandomFontFile = (seed, name) => makeRandomFile(name, 100_000, 500_000, seed)
  return fileSeeds.map((fileSeed, i) => makeRandomFontFile(fileSeed, `font${i}.ttf`))
}

function makeRandomImageFiles(randomSeed) {
  const numImageFiles = 8
  const fileSeeds = generateRandomArray(numImageFiles, randomSeed)
  const makeRandomFontFile = (seed, name) => makeRandomFile(name, 10_000, 500_000, seed)
  return fileSeeds.map((fileSeed, i) => makeRandomFontFile(fileSeed, `image${i}.png`))
}

function makeRandomFiles({ randomSeed, numFiles, minSize, maxSize, name, ext }) {
  const fileSeeds = generateRandomArray(numFiles, randomSeed)
  const makeRandomFontFile = (seed, name) => makeRandomFile(name, minSize, maxSize, seed)
  return fileSeeds.map((fileSeed, i) => makeRandomFontFile(fileSeed, `${name}${i}${ext}`))
}

function makeRandomWebsiteFiles(randomSeed) {
    const numFiles = 100
    const fileSeeds = generateRandomArray(numFiles, randomSeed)

    const indexSeed = fileSeeds[0]
    const indexFile = makeRandomFile('index.html', 10_000, 100_000, indexSeed)

    // assets

    const jsBundleSeed = fileSeeds[1]
    const jsBundleFile = makeRandomFile('index.js', 100_000, 200_000, jsBundleSeed)

    const fontSeed = fileSeeds[2]
    const fontFiles = makeRandomFontFiles(fontSeed)

    const imageSeed = fileSeeds[3]
    const imageFiles = makeRandomImageFiles(imageSeed)

    return [indexFile, jsBundleFile, ...fontFiles, ...imageFiles]
}

async function uploadToRandomBee(randomBee, randomBytes) {
  const files = makeRandomFiles(randomBytes)
  return uploadFiles(randomBee, files)
}

async function uploadFiles(randomBee, files) {
  console.debug({ sizes: files.map(file => file.data.length) })
  console.debug({ totalSize: files.reduce((prev, curr) => prev + curr.data.length, 0)})

  const params = { 'swarm-chunk-test': '1' }
  const postageStamp = await getPostageStamp(randomBee)
  const { reference: hash } = await retry(() => randomBee.uploadCollection(postageStamp, files, {
    axiosOptions: { params },
    indexDocument: 'index.html',
  }))

  console.log(`Bee ${randomBee.url} uploaded, hash ${hash}`)

  report.hash = hash
  report.times = Array(bees.length).fill([])

  return hash
}

function exitWithReport(code) {
  try {
    const csvLine = [report.startDate, report.seed, report.hash, ...report.times].join(',') + '\n'
    appendFileSync('report.csv', csvLine)
  } catch (e) {
    console.error(e)
    code = 1
  } finally {
    console.log('\n')
    process.exit(code)
  }
}
async function uploadAndCheck() {
  const seedBytes = (process.argv[2] && Utils.hexToBytes(process.argv[2])) || crypto.randomBytes(32)
  const seedHex = Utils.bytesToHex(seedBytes)
  report.seed = seedHex

  const startDate = formatDateTime(new Date())
  report.startDate = startDate
  console.log(`Starting at ${startDate}`)
  console.log(`Random seed: ${seedHex}`)
  console.log(`Timeout ${TIMEOUT} secs`)
  console.log(`Bee hosts: ${BEE_HOSTS}`)

  report.values = []
  report.hashes = {}

  const randomFunc = makeRandomFuncFromSeed(seedBytes)
  const randomBees = randomShuffle(bees, randomFunc)
  const numUploadNodes = 1
  const uploadBees = randomBees.slice(0, numUploadNodes)
  const downloadBees = randomBees.slice(numUploadNodes)

  const files = makeRandomWebsiteFiles(seedBytes)

  const hashes = await Promise.all(uploadBees.map(bee => uploadFiles(bee, files)))
  setTimeout(() => { console.error(`Timeout after ${TIMEOUT} secs`); exitWithReport(1) }, TIMEOUT * 1000)

  console.log({hashes})

  await retrieveWithReport(downloadBees, files, hashes[0])
  exitWithReport(0)
}

uploadAndCheck().catch(error => {
  console.error({ error })
  exitWithReport(1)
})
