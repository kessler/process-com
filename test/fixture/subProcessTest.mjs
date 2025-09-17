import ProcessCom from '../../lib/ProcessCom.mjs'

const main = new ProcessCom(process)

main.on('myMainEvent', data => {
  main.sendMessage('myChildEvent', { some: 'child data', args: process.argv.slice(2) })
})

main.sendReady()
