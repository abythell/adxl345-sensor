'use strict';

/*
 * An example demonstrating how to use FIFO mode without requiring
 * external interrupts.
 */

const ADXL345 = require('../ADXL345.js');
const adxl345 = new ADXL345({
  i2cBusNo   : process.env.I2CBUSNO || 1, // defaults to 1
  i2cAddress : ADXL345.I2C_ADDRESS_ALT_GROUNDED() // defaults to 0x53
});

/**
 * Read all available samples from the FIFO
 * @returns {Promise} Resolves with an array of samples, rejects with Error.
 */
function readFIFOSimple() {
  return adxl345.getFIFOStatusEntries().then((samples) => {
    let buffer = [];
    for (let i = 0; i < samples; i += 1) {
      buffer.push(adxl345.getAcceleration(true));
    }
    return Promise.all(buffer);
  });
}

/** read fifo continuously */
function readFIFO() {
  for (;;) {
    readFIFOSimple().then((data) => {
      console.log(data);
    });
  }
}

adxl345.enableMeasurement(false)
.then(() => { adxl345.setDataRate(ADXL345.DATARATE_100_HZ()); })
.then(() => { adxl345.setMeasurementRange(ADXL345.RANGE_2_G()); })
.then(() => { adxl345.setOffsetX(0); })
.then(() => { adxl345.setOffsetY(0); })
.then(() => { adxl345.setOffsetZ(0); })
.then(() => { adxl345.setFIFOCtlMode(ADXL345.FIFO_CTL_MODE_FIFO()); })
.then(() => { adxl345.setFIFOCtlSamples(16); })
// .then(() => { adxl345.setINTActiveLow(); })
// .then(() => { adxl345.setINTMap(ADXL345.INT_OVERRUN()); })
// .then(() => { adxl345.setINTEnable(ADXL345.INT_OVERRUN() | ADXL345.INT_WATERMARK()); })
.then(() => { adxl345.enableMeasurement(true); })
.then(() => { readFIFO(); });
