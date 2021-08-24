const { Utils } = require('@ethersphere/bee-js')

function sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

function expBackoff(start, max, mul = 2) {
  let current = start

  return () => {
    const timeout = current
    if (timeout * mul <= max) {
      current = timeout * mul
    }
    return timeout
  }
}

async function retry(asyncFn, minSleep = 60_000) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await asyncFn()
    } catch (e) {
      const sleepTime = typeof minSleep === 'number' ? minSleep : minSleep()
      await sleep(minSleep + Math.floor(Math.random() * minSleep))
    }
  }
}

async function timeout(asyncFn, timeoutMsec) {
  const waitTimeout = async () => {
    await sleep(timeoutMsec)
    throw 'timeout'
  }
  return await Promise.race([asyncFn(), waitTimeout()])
}

function randomFromBytes(randomBytes) {
  const hex = Utils.Hex.bytesToHex(randomBytes).slice(0, 8)
  const num = parseInt(hex, 16)
  return num / 0x100000000
}

function generateRandomArray(numRandom, seed) {
  const randomArray = []
  let random = seed
  for (let i = 0; i < numRandom; i++) {
    randomArray.push(random)
    random = Utils.keccak256Hash(random)
  }
  return randomArray
}

function randomShuffle(inputArray, randomFunc = Math.random) {
  const arr = [...inputArray]
  let currentIndex = arr.length

  while (currentIndex > 0) {
    const randomIndex = Math.floor(randomFunc() * currentIndex)
    currentIndex -= 1

    const tmp = arr[currentIndex]
    arr[currentIndex] = arr[randomIndex]
    arr[randomIndex] = tmp
  }

  return arr
}

function makeRandomFuncFromSeed(seedBytes) {
  let randomBytes = seedBytes
  return () => {
    randomBytes = Utils.keccak256Hash(randomBytes)
    return randomFromBytes(randomBytes)
  }
}

function formatDateTime(date) {
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

module.exports = { formatDateTime, makeRandomFuncFromSeed, randomShuffle, generateRandomArray, retry, timeout, expBackoff}
