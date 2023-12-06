var args = process.argv
if (args.length !== 5) {
  console.log('Usage: node production/downgrader PATH CRC_ENABLED THEME(0-5)')
  process.exit(1)
}

var clc = require('cli-color')

var error = clc.bgRed.white
var success = clc.bgGreen.white
var crcEnabled = parseInt(args[3])
var theme = parseInt(args[4])

var defaultColors = ''
switch (theme) {
  // baground/text

  case 0:
    // black/white
    defaultColors = '\x1b[37;40m'
    break
  case 1:
    // blue/white
    defaultColors = '\x1b[37;44m'
    break
  case 2:
    // white/black
    defaultColors = '\x1b[30;47m'
    break
  case 3:
    // magenta/white
    defaultColors = '\x1b[37;45m'
    break
  case 4:
    // cyan/white
    defaultColors = '\x1b[1;37;46m'
    break
  case 5:
    // yellow/white
    defaultColors = '\x1b[1;37;43m'
    break
}

var respawn = require('respawn')

var monitor = respawn(['node', 'bin/downgrade.js', args[2], crcEnabled, defaultColors], {
  env: {}, // set env vars
  cwd: '.', // set cwd
  maxRestarts: 10, // how many restarts are allowed within 60s
  // or -1 for infinite restarts
  sleep: 1000, // time to sleep between restarts,
  kill: 30000, // wait 30s before force killing after stopping
  stdio: [] // forward stdio options
})

monitor.on('start', function () {})

monitor.on('stop', function () {
  console.log('The downgrade CLI has finished. Please restart if you need to downgrade more blocks.')
})

monitor.on('crash', function () {})

var spawn_count = 0
monitor.on('spawn', function (process) {
  spawn_count++
  if (spawn_count == 1) {
    console.log('Starting the OS4->OS3 Downgrade CLI...')
  } else {
    console.log('Restarting the OS4->OS3 Downgrade CLI...')
  }
})

monitor.on('warn', function (err) {})

monitor.on('stdout', function (data) {
  console.log(data.toString('utf-8'))
  process.stdout.write(defaultColors)
})

monitor.on('stderr', function (data) {
  console.log(error(data.toString('utf-8')))
  process.stdout.write(defaultColors)

})
monitor.start() // spawn and watch
