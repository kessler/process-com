import ProcessCom from '../../lib/ProcessCom.mjs'

const main = new ProcessCom(process)

// rpc
main.onRequest('myApiCall', async (data, resolve, reject) => {
  resolve(data)
})

main.sendReady()
