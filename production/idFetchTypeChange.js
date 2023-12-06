var args = process.argv
if (args.length !== 3) {
  console.log('Usage: node production/idFetchTypeChange.js PATH')
  process.exit(1)
}

var clc = require('cli-color')

var error = clc.bgRed.white
var success = clc.bgGreen.white
var theme = parseInt(args[3])

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
var child
var parent = process

if(parent.stdin.isTTY)
{
	parent.stdin.setRawMode(true)
}  
process.stdin.resume();

var monitor = respawn(['node', 'bin/idFetchTypeChange.js', args[2]], {
  env: {}, // set env vars
  cwd: '.', // set cwd
  maxRestarts: 10, // how many restarts are allowed within 60s
  // or -1 for infinite restarts
  sleep: 1000, // time to sleep between restarts,
  kill: 30000, // wait 30s before force killing after stopping
  stdio: [] // forward stdio options
})

monitor.on('start', function () {
})

monitor.on('stop', function () {
  console.log('The CLI has finished.')
})

monitor.on('crash', function () {})

var spawn_count = 0
monitor.on('spawn', function (process) {
	child = monitor.child
	parent.stdin.pipe(child.stdin)
  spawn_count++
  if (spawn_count == 1) {
    console.log('Starting the ID Fetcher / Type Switcher...')
  } else {
    console.log('Restarting the ID Fetcher / Type Switcher...')
  }
})

monitor.on('warn', function (err) {})

monitor.on('stdout', function (data) {
  process.stdout.write(data.toString('utf-8'))
  //process.stdout.write(defaultColors)
})

monitor.on('stderr', function (data) {
  console.log(data.toString('utf-8'))
  //process.stdout.write(defaultColors)

})
monitor.start() // spawn and watch
