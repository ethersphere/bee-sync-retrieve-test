/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
const { Bee, Utils } = require("@ethersphere/bee-js");
const crypto = require("crypto");
const { appendFileSync } = require("fs");
const {
  formatDateTime,
  randomShuffle,
  makeRandomFuncFromSeed,
  retry,
  timeout,
  expBackoff,
} = require("./util");

const TIMEOUT =
  (process.env.TIMEOUT && parseInt(process.env.TIMEOUT, 10)) || 10 * 60;
const POSTAGE_STAMP =
  process.env.POSTAGE_STAMP ||
  "0000000000000000000000000000000000000000000000000000000000000000";

const uploadBee = process.env.UPLOAD_BEE && new Bee(process.env.UPLOAD_BEE);

const BEE_HOSTS = (process.env.BEE_HOSTS &&
  process.env.BEE_HOSTS.split(",")) || ["http://localhost:1633"];
const bees = BEE_HOSTS.map((host) => new Bee(host));

const report = {};

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function retrieveAll(bees, hash) {
  return new Promise((resolve) => {
    let numRetrieved = 0;
    bees.forEach((bee, i) => {
      const start = Date.now();
      retry(
        () => timeout(() => bee.downloadData(hash), 60_000),
        expBackoff(10_000, 60_000, 1.5)
      ).then((_) => {
        const end = Date.now();
        const elapsedSecs = Math.ceil((end - start) / 1000);

        report.times[numRetrieved] = elapsedSecs;

        numRetrieved += 1;
        console.log(
          `Bee ${bee.url} ${i} finished, elapsed time ${elapsedSecs} secs, hash retrieved from ${numRetrieved}/${bees.length}, hash ${hash}`
        );

        if (numRetrieved === bees.length) {
          resolve();
        }
      });
    });
  });
}

async function retrieveHashFromAll(hash) {
  const start = Date.now();

  await retrieveAll(bees, hash);

  const end = Date.now();
  const elapsedSecs = Math.ceil((end - start) / 1000);
  console.log(
    `Hash retrieved from all bees, elapsed time ${elapsedSecs} secs, hash ${hash}`
  );

  report.values.push(elapsedSecs);
}

async function getPostageStamp(bee) {
  try {
    const batches = await bee.getAllPostageBatch();
    if (batches.length > 0) {
      return batches[0].batchID;
    }
    return POSTAGE_STAMP;
  } catch (e) {
    return POSTAGE_STAMP;
  }
}

async function uploadToRandomBee(randomBee, randomBytes) {
  const params = { "swarm-chunk-test": "1" };
  const postageStamp = await getPostageStamp(randomBee);
  console.log(`Uploading ${randomBytes.length} bytes to ${randomBee.url}`);

  const hash = await retry(() =>
    randomBee.uploadData(postageStamp, randomBytes, {
      axiosOptions: { params },
    })
  );

  const randomBytesHex = Utils.Hex.bytesToHex(randomBytes);
  console.log(
    `Bee ${randomBee.url} uploaded, bytes: ${randomBytes.length}, hash ${hash}`
  );

  report.hash = hash;
  report.times = Array(bees.length).fill([]);

  return hash;
}

function exitWithReport(code) {
  try {
    const csvLine =
      [
        report.startDate,
        report.dataLength,
        report.waitTime,
        report.hash,
        ...report.times,
      ].join(",") + "\n";
    appendFileSync("report.csv", csvLine);
  } catch (e) {
    console.error(e);
    code = 1;
  } finally {
    console.log("\n");
    process.exit(code);
  }
}

async function uploadAndCheck() {
  const seedBytes =
    (process.argv[2] &&
      parseInt(process.argv[2]) &&
      crypto.randomBytes(parseInt(process.argv[2]))) ||
    crypto.randomBytes(500000);

  const waitTime =
    (process.argv[2] &&
      parseInt(process.argv[3]) &&
      parseInt(process.argv[3])) ||
    0;

  const seedHex = Utils.Hex.bytesToHex(seedBytes);
  report.dataLength = seedBytes.length;

  report.waitTime = waitTime;

  const startDate = formatDateTime(new Date());
  report.startDate = startDate;
  console.log(`Starting at ${startDate}`);
  console.log(`Data length: ${seedBytes.length}`);
  console.log(`Timeout ${TIMEOUT} secs`);

  report.values = [];
  report.hashes = {};

  const randomFunc = makeRandomFuncFromSeed(seedBytes);
  const randomBees = randomShuffle(bees, randomFunc);
  const randomBee = randomBees[0];

  const hash = await uploadToRandomBee(uploadBee || randomBee, seedBytes);
  setTimeout(() => {
    console.error(`Timeout after ${TIMEOUT} secs`);
    exitWithReport(1);
  }, TIMEOUT * 1000);

  if (waitTime > 0) {
    console.log(`waiting for ${waitTime} seconds before retrieval`);
    await sleep(waitTime * 1000);
  }

  console.log(`attempting retrieval`);

  await retrieveHashFromAll(hash);
  exitWithReport(0);
}

uploadAndCheck().catch((error) => {
  console.error({ error });
  exitWithReport(1);
});
