const fs = require('fs')
const path = require('path')

const common = require('./common')

module.exports = {setup}

const es = common.es
const log = common.log

function setup (dataDir) {
  es('apt-get update')
  es('apt-get install libgomp1 -y')
  common.firewall([8233])
  log('Fetching Zcash proofs, will take a while...')
  es('zcash-fetch-params')
  log('Finished fetching proofs.')
  const config = buildConfig()
  fs.writeFileSync(path.resolve(dataDir, 'zcash.conf'), config)
  setupPm2()
}

function buildConfig () {
  return `mainnet=1
addnode=mainnet.z.cash
rpcuser=lamassuserver
rpcpassword=${common.randomPass()}
dbcache=500`
}

function setupPm2 (dataDir) {
  es(`pm2 start zcashd -- -datadir=${dataDir}`)
}
