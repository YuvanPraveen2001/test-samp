var fs = require('fs')

module.exports = {
  bluetooth: {
    bootstrap: fs.readFileSync(__dirname + '/hex/bluetooth_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/bluetooth_application.hex')
  },
  bargraph: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/bargraph_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/bargraph.hex')
  },
  battery: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/battery_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/battery.hex')
  },
  blocker: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/blocker_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/blocker.hex')
  },
  brightness: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/brightness_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/brightness.hex')
  },
  distance: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/distance_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/distance.hex')
  },
  drive: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/drive_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/drive.hex')
  },
  flashlight: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/flashlight_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/flashlight.hex')
  },
  inverse: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/inverse_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/inverse.hex')
  },
  knob: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/knob_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/knob.hex')
  },
  maximum: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/maximum_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/maximum.hex')
  },
  minimum: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/minimum_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/minimum.hex')
  },
  passive: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/passive_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/passive.hex')
  },
  rotate: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/rotate_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/rotate.hex')
  },
  speaker: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/speaker_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/speaker.hex')
  },
  temperature: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/temperature_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/temperature.hex')
  },
  threshold: {
    bootstrap: fs.readFileSync(__dirname + '/hex/pic_bootstrap/threshold_bootstrap.hex'),
    application: fs.readFileSync(__dirname + '/hex/application/threshold.hex')
  }
}
