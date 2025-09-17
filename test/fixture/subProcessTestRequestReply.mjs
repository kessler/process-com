import ProcessComm from '../../lib/ProcessComm.mjs'

const main = new ProcessComm(process)

// rpc
main.onRequest('myApiCall', (data, reply) => {
  reply(data)
})

// event
// main.on('myMainEvent', data => {
//   main.sendMessage('myChildEvent', { some: 'child data', args: process.argv.slice(2) })
// })

main.sendReady()
