const http = require('http')
const fs = require('fs')
const os = require('os')
let host, port, user, password, nblocks, ntx

const args = process.argv.reduce((o, c) => {
  const a = c.match(/^-([^=]+)=(.+)$/)
  if (a) o[a[1]] = a[2]
  return o
}, {})

const config = fs.readFileSync(args.config || `${os.homedir()}/.bitcoin/bitcoin.conf`, 'utf8');
config.split('\n').forEach(line => {
  let rpcuser = line.match(/^\s?rpcuser\s?=\s?([^#]+)$/)
  if (rpcuser) user = rpcuser[1]
  let rpcpass = line.match(/^\s?rpcpassword\s?=\s?([^#]+)$/)
  if (rpcpass) password = rpcpass[1]
})

const fee = args.fee && parseFloat(args.fee) || 0.0002

port = args.port || '18332'
host = args.host || '127.0.0.1'
nblocks = args.nblocks && parseInt(args.nblocks, 10)
if (typeof nblocks == 'undefined') nblocks = 105 // default give 5 spendable blocks, 
ntx = args.ntx || 30 // amount of random transactions to generate

function randInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

async function bootstrap() {
  try {
    // make sure we are on regtest
    const net = await rpcPost({ method: 'getblockchaininfo', params: [] })
    if (net.error) throw (net.error.message)
    if (net.result.chain != 'regtest') throw ('this utility can only be run with bitcoind --regtest')
    console.log("regtest chain confirmed, generating blocks")

    if (nblocks) {
      const blocks = await rpcPost({ method: 'generate', params: [nblocks] })
      if (!blocks.result.length) throw ('unable to generate blocks')
      console.log(`blocks requested: ${nblocks}, total blockes created: ${blocks.result.length}`)
    }


    for (let i = 0; i < ntx; i++) {
      const utxos = await rpcPost({ method: 'listunspent', params: [] })
      let sendto = await rpcPost({ method: 'getnewaddress', params: [] })
      const multi = Math.round(Math.random()) == 1
      if (multi) {
        sendto = await rpcPost({ method: 'addmultisigaddress', params: [1, [sendto.result]] })
      }
      const index = randInt(utxos.result.length)
      const utxo = utxos.result[index]
      if (!utxo) {
        console.log('no utxos, mining block')
        const gento = await rpcPost({ method: 'getnewaddress', params: [] })
        const block = await rpcPost({ method: 'generatetoaddress', params: [1, gento.result] })
        console.log('new block', block.result[0])
        continue
      }
      let outputs = {}
      const amt = Math.round((utxo.amount * Math.random()) * 1000000) / 1000000
      const change = await rpcPost({ method: 'getnewaddress', params: [] })
      outputs[sendto.result] = amt
      const chng = Math.round((utxo.amount - amt - fee) * 1000000) / 1000000
      outputs[change.result] = chng
      if (chng < 0) {
        console.log('insufficient funds', utxo.address, utxo.amount, amt)
        continue
      }

      const raw = await rpcPost({ method: 'createrawtransaction', params: [[utxo], outputs] })
      if (raw.error) console.log('raw tx error', raw.error, amt, utxo)
      const signed = await rpcPost({ method: 'signrawtransaction', params: [raw.result] })
      if (signed.error) console.log('signing error', signed.error)
      const newtx = await rpcPost({ method: 'sendrawtransaction', params: [signed.result.hex] })
      console.log('transaction sent: ', newtx.result)
    }

    // mine block
    const gento = await rpcPost({ method: 'getnewaddress', params: [] })
    await rpcPost({ method: 'generatetoaddress', params: [1, gento.result] })

  } catch (e) {
    console.log(e)
  }
}

bootstrap()


function rpcPost(payload) {
  payload.jsonrpc = "1.0"
  return new Promise(function (resolve, reject) {
    let post_req = http.request({
      host: host,
      port: port,
      path: '/',
      method: 'POST',
      headers: {
        "Content-type": "text/plain",
        "Authorization": "Basic " + Buffer.from(`${user}:${password}`, 'binary').toString('base64')
      }
    }, function (res) {
      let out = ''

      res.on('data', function (chunk) {
        out += chunk
      });

      res.on('end', () => {
        let obj = JSON.parse(out)
        resolve(obj)
      });

    });

    post_req.on('error', (err) => {
      console.log('something bad happened', err.message)
    });
    post_req.write(JSON.stringify(payload));
    post_req.end();
  });

}
