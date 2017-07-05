const cp = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const os = require('os')

const makeDir = require('make-dir')
const inquirer = require('inquirer')
const _ = require('lodash/fp')

const options = require('../options')
const coinUtils = require('../coin-utils')

const cryptos = coinUtils.cryptoCurrencies()

function es (cmd, token) {
  const env = {DIGITALOCEAN_TOKEN: token, HOME: os.userInfo().homedir}
  const options = {encoding: 'utf8', env}
  const res = cp.execSync(cmd, options)
  console.log(res)
  return res.toString()
}

function fetchInstalledModules (token) {
  const res = es('terraform state list digitalocean_droplet.blockchain_server')
  const lines = _.compact(_.split('\n', res))
  const codes = _.map('code', cryptos)

  return _.filter(f => _.some(_.startsWith(`module.${f}`), lines), codes)
}

es('terraform get')
const installed = fetchInstalledModules()

function isInstalled (code) {
  return _.includes(code, installed)
}

const choices = _.map(c => {
  const checked = isInstalled(c.code)
  return {
    name: c.display,
    value: c.code,
    checked,
    disabled: checked && 'Installed'
  }
}, cryptos)

const questions = []
const digitalOceanToken = options.digitalOceanToken

if (!digitalOceanToken) {
  questions.push({
    name: 'token',
    message: 'Please enter your DigitalOcean API token:'
  })
}

questions.push({
  type: 'checkbox',
  name: 'crypto',
  message: 'Which cryptocurrencies would you like to install?',
  choices
})

function tunnelize (crypto, ipAddress) {
  const blockchain = crypto.code
  const program = `${blockchain}-tunnel`
  const port = crypto.defaultPort

  const conf = `[program:${program}]
command=autossh -L ${port}:localhost:${port} -o "ExitOnForwardFailure yes" -fN -o "ServerAliveInterval 45" -o "ServerAliveCountMax 2" root@${ipAddress}
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/${blockchain}-tunnel.err.log
stdout_logfile=/var/log/supervisor/${blockchain}-tunnel.out.log
environment="AUTOSSH_GATETIME=0"
`

  const tunnelConfFile = `/etc/supervisor/conf.d/${program}.conf`
  fs.writeFileSync(tunnelConfFile, conf)
}

function terraform (selectedCryptos, token) {
  const codes = _.map('code', selectedCryptos)
  const targets = _.join(' ', _.map(c => `-target=module.${c}`, codes))
  const terraformCmd = `terraform apply ${targets}`
  console.log(terraformCmd)
  es(terraformCmd, token)
  return es('terraform output -json', token)
}

const pp = require('../pp')

function process (codes, answerToken) {
  console.log('Thanks! Launching servers for: %s. Will take a while...', _.join(', ', codes))

  if (answerToken) {
    const userInfo = os.userInfo()
    const configPath = userInfo.username === 'root' ? '/etc/lamassu' : `${userInfo.homedir}/.lamassu`

    makeDir.sync(configPath)
    options.digitalOceanToken = answerToken
    fs.writeFileSync(path.resolve(configPath, 'lamassu.json'), JSON.stringify(options, null, 2))
  }

  const token = answerToken || digitalOceanToken

  const selectedCryptos = _.map(code => _.find(['code', code], cryptos), codes)
  _.forEach(writeConfig, selectedCryptos)
  const res = JSON.parse(terraform(selectedCryptos, token))
  pp('DEBUG100')(res)
  // const inputs = _.map(c => )
  // _.forEach(tunnelize, inputs)
}

inquirer.prompt(questions)
.then(answers => process(answers.crypto, answers.token))

function randomPass () {
  return crypto.randomBytes(32).toString('hex')
}

function buildConfig (crypto) {
  const cryptoCurrency = crypto.code

  // geth doesn't have a config file, so make empty one for compatibility
  if (cryptoCurrency === 'ethereum') return []

  const extras = {
    zcash: ['mainnet=1', 'addnode=mainnet.z.cash']
  }

  const defaultLines = [
    'rpcuser=lamassuserver',
    `rpcpassword=${randomPass()}`,
    'dbcache=500'
  ]

  return _.concat(defaultLines, extras)
}

function writeConfig (crypto) {
  const lines = buildConfig(crypto)
  const configFile = crypto.configFile
  const configPath = path.resolve(options.blockchainDir, configFile)
  fs.writeFileSync(configPath, _.join('\n', lines) + '\n')
}
