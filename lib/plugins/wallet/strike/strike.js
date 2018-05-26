const axios = require('axios')
const _ = require('lodash/fp')

const E = require('../../../error')

module.exports = {
  balance,
  sendCoins,
  newAddress,
  getStatus,
  newFunding,
  cryptoNetwork
}

function cryptoNetwork (account, cryptoCode) {
  return Promise.resolve('test')
}

function checkCryptoCode (cryptoCode) {
  if (cryptoCode !== 'BTC') return Promise.reject(new Error('Unsupported crypto: ' + cryptoCode))
  return Promise.resolve()
}

// This is a cash-out plugin only
const BN = require('../../../bn')
function balance (acount, cryptoCode) {
  return Promise.resolve(BN(1e8))
  return Promise.reject(new E.NotImplementedError())
}

function sendCoins (account, address, cryptoAtoms, cryptoCode) {
  return Promise.reject(new E.NotImplementedError())
}

function newFunding (account, cryptoCode) {
  return Promise.reject(new E.NotImplementedError())
}

function getCharge (account, chargeId) {
  return axios({
    method: 'get',
    url: `https://api.dev.strike.acinq.co/api/v1/charges/${chargeId}`,
    auth: {username: account.token, password: ''}
  }).then(_.get('data'))
}

function createCharge (account, info) {
  const data = {
    amount: info.cryptoAtoms.toNumber(),
    currency: 'btc',
    description: 'Lamassu cryptomat cash-out'
  }

  return axios({
    method: 'post',
    url: 'https://api.dev.strike.acinq.co/api/v1/charges',
    auth: {username: account.token, password: ''},
    data
  }).then(_.get('data'))
}

function newAddress (account, info) {
  return checkCryptoCode(info.cryptoCode)
    .then(() => createCharge(account, info))
    .then(_.tap(console.log))
    .then(r => `strike:${r.id}:${r.payment_hash}:${r.payment_request}`)
}

function getStatus (account, toAddress, requested, cryptoCode) {
  return checkCryptoCode(cryptoCode)
    .then(() => {
      const parts = _.split(':', toAddress)
      const chargeId = parts[1]

      return getCharge(account, chargeId)
        .then(r => ({status: r.paid ? 'confirmed' : 'notSeen'}))
    })
}
