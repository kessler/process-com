import ProcessCom from '../../lib/ProcessCom.mjs'

const main = new ProcessCom(process)

// rpc
main.onRequest('myApiCallErrorString', async (data, resolve, reject) => {
  reject('something went wrong')
})

main.onRequest('myApiCallError', async (data, resolve, reject) => {
  reject(new Error('something went wrong'))
})

main.sendReady()
