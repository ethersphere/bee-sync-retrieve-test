const { Bee } = require('@ethersphere/bee-js')
const { readFileSync } = require('fs')

const POSTAGE_STAMP = process.env.POSTAGE_STAMP || '0000000000000000000000000000000000000000000000000000000000000000'
const TOPIC = '0000000000000000000000000000000000000000000000000000000000000000'

async function upload() {
    const reportFileName = process.argv[2] || 'report.csv'
    const beeUrl = process.argv[3] || process.env.BEE_URL
    const feedKey = process.argv[4] || process.env.FEED_KEY

    const bee = new Bee(beeUrl)

    const file = readFileSync(reportFileName)

    try {
        const response = await bee.uploadFile(POSTAGE_STAMP, file, reportFileName, { contentType: 'text/csv' })
        console.log(`Reference: ${response.reference}`)

        if (feedKey) {
            const reference = response.reference
            const feedWriter = bee.makeFeedWriter('sequence', TOPIC, feedKey)
            const feedResponse = await feedWriter.upload(POSTAGE_STAMP, reference)
            const feedUpdate = await feedWriter.download()
            const feedReference = await bee.createFeedManifest(POSTAGE_STAMP, 'sequence', TOPIC, feedWriter.owner)
            console.log(`Feed address: ${feedWriter.owner}`)
            console.log(`Feed topic: ${feedWriter.topic}`)
            console.log(`Feed index: ${feedUpdate.feedIndex}`)
            console.log(`${bee.url}/bzz/${feedReference}/`)
        }
    } catch (e) {
        console.error(e)
    }
}

upload().catch(console.error)
