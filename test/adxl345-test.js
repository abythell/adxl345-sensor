'use strict';

/* eslint-env mocha */
process.env.NODE_ENV = 'test';

const chai    = require('chai');
const ADXL345 = require('../ADXL345.js');
const expect  = chai.expect;
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const i2c = require('i2c-bus');

describe('adxl345-sensor', () => {
  let i2cBus = null;
  beforeEach(() => {
    i2cBus = i2c.openSync(0);
  });

  describe('ADXL345#constructor', () => {
    it('uses defaults', () => {
      let adxl345 = new ADXL345();
      expect(adxl345).to.be.an.instanceof(ADXL345);
      expect(adxl345).to.have.property('i2cBusNo', 1);
      expect(adxl345).to.have.property('i2cAddress', 0x53);
      expect(adxl345).to.have.property('i2cBus');
    });
    it('sets options', () => {
      let options = {
        i2cBus,
        i2cBusNo: 123,
        i2cAddress: 456
      };
      let adxl345 = new ADXL345(options);
      expect(adxl345).to.have.property('i2cBusNo', 123);
      expect(adxl345).to.have.property('i2cAddress', 456);
    });
  });

  describe('ADXL345#readByte', () => {
    it('resolves with the value of a register', () => {
      let adxl345 = new ADXL345({i2cBus});
      let readStub = sinon.stub(i2cBus, 'readByte').yields(null, 0xE5);
      return adxl345.readByte('register').then((value) => {
        expect(value).to.equal(0xE5);
        expect(readStub.calledWith(adxl345.i2cAddress, 'register'));
      });
    });
    it('rejects on error', () => {
      let adxl345 = new ADXL345({i2cBus});
      sinon.stub(i2cBus, 'readByte').yields(Error('error'));
      return expect(adxl345.readByte('register')).to.eventually.be.rejectedWith(Error);
    });
  });

  describe('ADXL345#writeByte', () => {
    it('resolves after writing the value to a register', () => {
      let adxl345 = new ADXL345({i2cBus});
      let writeStub = sinon.stub(i2cBus, 'writeByte').yields(null);
      return adxl345.writeByte('register', 'value').then(() => {
        expect(writeStub.calledWith(adxl345.i2cAddress, 'register', 'value'));
      });
    });
    it('rejects on error', () => {
      let adxl345 = new ADXL345({i2cBus});
      sinon.stub(i2cBus, 'readByte').yields(Error('error'));
      return expect(adxl345.readByte('register')).to.eventually.be.rejectedWith(Error);
    });
  });

  describe('ADXL345#getDevId', () => {
    it('reads the device ID', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0xE5);
      return adxl345.getDevId().then((id) => {
        expect(id).to.equal(0xE5);
        expect(stub.calledWith(0x00));
      });
    });
  });

  describe('ADXL345#setPowerCtl', () => {
    it('writes the POWER_CTL register', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'writeByte').resolves();
      return adxl345.setPowerCtl(0x08).then(() => {
        expect(stub.calledWith(0x2D, 0x08)).to.equal(true);

      });
    });
  });

  describe('ADXL345#init', () => {
    it('rejects on device ID mismatch', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'getDevId').resolves(0xFF);
      return expect(adxl345.init()).to.eventually.be.rejectedWith('Unexpected ADXL345 device ID: 0xff');
    });
    it('enables measurement and resolves with device ID', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'getDevId').resolves(0xE5);
      let stub = sinon.stub(adxl345, 'setPowerCtl').resolves();
      return adxl345.init().then((id) => {
        expect(id).to.equal(0xE5);
        expect(stub.calledWith(0x08)).to.equal(true);
      });
    });
  });

  describe('ADXL345#getAcceleration', () => {
    it('gets valid sensor data (m/s² units)', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'readBlock').resolves(Buffer.from([0x10, 0x01, 0x20, 0x02, 0x30, 0x03]));
      return adxl345.getAcceleration().then((data) => {
        expect(data).to.have.all.keys('x', 'y', 'z', 'units');
        expect(data.units).to.be.equal('m/s²');
        expect(data.x).to.equal(0x0110 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
        expect(data.y).to.equal(0x0220 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
        expect(data.z).to.equal(0x0330 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
      });
    });

    it('gets valid sensor data (g-force units)', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'readBlock').resolves(Buffer.from([0x10, 0x01, 0x20, 0x02, 0x30, 0x03]));
      return adxl345.getAcceleration(true).then((data) => {
        expect(data).to.have.all.keys('x', 'y', 'z', 'units');
        expect(data.units).to.be.equal('g');
        expect(data.x).to.equal(0x0110 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
        expect(data.y).to.equal(0x0220 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
        expect(data.z).to.equal(0x0330 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
      });
    });
  });

  describe('ADXL345#setMeasurementRange', () => {
    it('sets measurement ranges', () => {
        let adxl345 = new ADXL345();
        sinon.stub(adxl345, 'readByte').resolves(0);
        let stub = sinon.stub(adxl345, 'writeByte').resolves();
        return adxl345.setMeasurementRange(ADXL345.RANGE_16_G()).then(() => {
          expect(stub.calledWith(0x31, 0b00001011)).to.equal(true);
          return adxl345.setMeasurementRange(ADXL345.RANGE_8_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001010)).to.equal(true);
          return adxl345.setMeasurementRange(ADXL345.RANGE_4_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001001)).to.equal(true);
          return adxl345.setMeasurementRange(ADXL345.RANGE_2_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001000)).to.equal(true);
        });
    });
    it('rejects invalid measurement range (null)', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setMeasurementRange(null)).to.eventually.be.rejectedWith('Invalid range');
    });
    it('it should fail to set invalid measurement range (0xffff)', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setMeasurementRange(0xffff)).to.eventually.be.rejectedWith('Invalid range');
    });
  });

  describe('ADXL345#getMeasurementRange', () => {
    it('gets first two bits of DATA_FORMAT register', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0b11111100);
      return adxl345.getMeasurementRange().then((range) => {
        expect(range).to.equal(0b00);
        expect(stub.calledWith(0x31)).to.equal(true);
      });
    });
  });

  describe('ADXL345#setDataRate', () => {
    it('sets data rate', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'writeByte').resolves();
      return adxl345.setDataRate(0b1111).then(() => {
        expect(stub.calledWith(0x2C, 0b1111)).to.equal(true);
      });
    });
    it('rejects if rate is null', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setDataRate(null)).to.eventually.be.rejectedWith('Invalid data rate');
    });
  });

  describe('ADXL345#getDataRate', () => {
    it('gets data rate', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0b11110000);
      return adxl345.getDataRate().then((rate) => {
        expect(rate).to.equal(0b0000);
        expect(stub.calledWith(0x2C)).to.equal(true);
      });
    });
  });

  describe('ADXL345#setOffset[X|Y|Z]', () => {
    let adxl345 = null;
    let stub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      stub = sinon.stub(adxl345, 'writeByte').resolves();
    });
    it('sets X offset', () => {
      return adxl345.setOffsetX(1).then(() => {
        expect(stub.calledWith(0x1E, 1)).to.equal(true);
      });
    });
    it('sets Y offset', () => {
      return adxl345.setOffsetY(2).then(() => {
        expect(stub.calledWith(0x1F, 2)).to.equal(true);
      });
    });
    it('sets Z offset', () => {
      return adxl345.setOffsetZ(3).then(() => {
        expect(stub.calledWith(0x20, 3)).to.equal(true);
      });
    });
  });

  describe('ADXL345#FIFO_CTL', () => {
    let adxl345 = null;
    let writeStub = null;
    let readStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      writeStub = sinon.stub(adxl345, 'writeByte').resolves();
      readStub = sinon.stub(adxl345, 'readByte');
    });
    it('gets 8-bit value of FIFO_CTL', () => {
      readStub.resolves(0xFF);
      return adxl345.getFIFOCtl().then((value) => {
        expect(readStub.calledWith(0x38)).to.equal(true);
        expect(value).to.equal(0xFF);
      });
    });
    it('sets 8-bit value of FIFO_CTL', () => {
      return adxl345.setFIFOCtl(0xFF).then(() => {
        expect(writeStub.calledWith(0x38, 0xFF)).to.equal(true);
      });
    });
    it('sets watermark/samples', () => {
      readStub.resolves(0b11100000);
      return adxl345.setFIFOCtlSamples(0b00011111).then(() => {
        expect(writeStub.calledWith(0x38, 0b11111111)).to.equal(true);
      });
    });
    it('gets watermark sample count', () => {
      readStub.resolves(0b111000001);
      return adxl345.getFIFOCtlSamples().then((samples) => {
        expect(samples).to.equal(0b00001);
        expect(readStub.calledWith(0x38));
      });
    });
    it('gets trigger bit', () => {
      readStub.resolves(0b00100000);
      return adxl345.getFIFOCtlTrigger().then((trigger) => {
        expect(trigger).to.equal(1);
        readStub.resolves(0b11011111);
        return adxl345.getFIFOCtlTrigger();
      }).then((trigger) => {
        expect(trigger).to.equal(0);
      });
    });
    it('sets trigger bit', () => {
      readStub.resolves(0b11111111);
      return adxl345.setFIFOCtlTrigger(0).then(() => {
        expect(writeStub.calledWith(0x38, 0b11011111));
        readStub.resolves(0b00000000);
        return adxl345.setFIFOCtlTrigger(1).then(() => {
          expect(writeStub.calledWith(0x38, 0b00100000));
        });
      });
    });
    it('sets FIFO_MODE', () => {
      readStub.resolves(0b11111111);
      return adxl345.setFIFOCtlMode(0b00).then(() => {
        expect(writeStub.calledWith(0x38, 0b00111111));
      });
    });
    it('gets FIFO_MODE', () => {
      readStub.resolves(0b00111111);
      return adxl345.getFIFOCtlMode().then((mode) => {
        expect(mode).to.equal(ADXL345.FIFO_CTL_MODE_BYPASS());
        readStub.resolves(0b01111111);
        return adxl345.getFIFOCtlMode();
      }).then((mode) => {
        expect(mode).to.equal(ADXL345.FIFO_CTL_MODE_FIFO());
        readStub.resolves(0b10111111);
        return adxl345.getFIFOCtlMode();
      }).then((mode) => {
        expect(mode).to.equal(ADXL345.FIFO_CTL_MODE_STREAM());
        readStub.resolves(0b11111111);
        return adxl345.getFIFOCtlMode();
      }).then((mode) => {
        expect(mode).to.equal(ADXL345.FIFO_CTL_MODE_TRIGGER());
      });
    });
  });

  describe('ADXL345#FIFO_STATUS', () => {
    let adxl345 = null;
    let readStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      readStub = sinon.stub(adxl345, 'readByte');
    });
    it('gets the value of FIFO_STATUS', () => {
      readStub.resolves(0xFF);
      return adxl345.getFIFOStatus().then((reg) => {
        expect(reg).to.equal(0xFF);
        expect(readStub.calledWith(0x39)).to.equal(true);
      });
    });
    it('gets the number of entries', () => {
      readStub.resolves(0b11010101);
      return adxl345.getFIFOStatusEntries().then((entries) => {
        expect(entries).to.equal(0b10101);
        expect(readStub.calledWith(0x39)).to.equal(true);
      });
    });
    it('gets the trigger bit', () => {
      readStub.resolves(0b10000000);
      return adxl345.getFIFOStatusTrig().then((trig) => {
        expect(trig).to.equal(1);
        expect(readStub.calledWith(0x39)).to.equal(true);
      });
    });
  });

  describe('ADXL345#INT_ENABLE', () => {
    let adxl345 = null;
    let writeStub = null;
    let readStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      writeStub = sinon.stub(adxl345, 'writeByte').resolves();
      readStub = sinon.stub(adxl345, 'readByte');
    });
    it('gets INT_ENABLE register', () => {
      readStub.resolves(0xFF);
      return adxl345.getINTEnable().then((byte) => {
        expect(byte).to.equal(0xFF);
        expect(readStub.calledWith(0x2E)).to.equal(true);
      });
    });
    it('sets INT_ENABLE register', () => {
      writeStub.resolves();
      return adxl345.setINTEnable(ADXL345.INT_DATA_READY).then(() => {
        expect(writeStub.calledWith(0x2E, 0b10000000));
        return adxl345.setINTEnable(ADXL345.INT_SINGLE_TAP());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b01000000));
        return adxl345.setINTEnable(ADXL345.INT_DOUBLE_TAP());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00100000));
        return adxl345.setINTEnable(ADXL345.INT_ACTIVITY());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00010000));
        return adxl345.setINTEnable(ADXL345.INT_INACTIVITY());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00001000));
        return adxl345.setINTEnable(ADXL345.INT_FREE_FALL());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00000100));
        return adxl345.setINTEnable(ADXL345.INT_WATERMARK());
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00000010));
        return adxl345.setINTEnable(ADXL345.INT_OVERRUN);
      }).then(() => {
        expect(writeStub.calledWith(0x2E, 0b00000000));
      });
    });
  });
  describe('ADXL345#INT_MAP', () => {
    let adxl345 = null;
    let writeStub = null;
    let readStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      writeStub = sinon.stub(adxl345, 'writeByte').resolves();
      readStub = sinon.stub(adxl345, 'readByte');
    });
    it('gets INT_MAP register', () => {
      readStub.resolves(0xFF);
      return adxl345.getINTMap().then((byte) => {
        expect(byte).to.equal(0xFF);
        expect(readStub.calledWith(0x2F)).to.equal(true);
      });
    });
    it('sets INT_MAP register', () => {
      writeStub.resolves();
      return adxl345.setINTEnable(ADXL345.INT_DATA_READY).then(() => {
        expect(writeStub.calledWith(0x2F, 0b10000000));
      });
    });
  });

  describe('ADXL345#INT_SOURCE', () => {
    let adxl345 = null;
    let readStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      readStub = sinon.stub(adxl345, 'readByte');
    });
    it('gets INT_SOURCE register', () => {
      readStub.resolves(0xFF);
      return adxl345.getINTSource().then((byte) => {
        expect(byte).to.equal(0xFF);
        expect(readStub.calledWith(0x30)).to.equal(true);
      });
    });
  });
  describe('ADXL345#INT_INVERT', () => {
    let adxl345 = null;
    let readStub = null;
    let writeStub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      readStub = sinon.stub(adxl345, 'readByte');
      writeStub = sinon.stub(adxl345, 'writeByte');
    });
    it('sets active-high', () => {
      readStub.resolves(0xFF);
      return adxl345.setINTActiveHigh().then(() => {
        expect(readStub.calledWith(0x31)).to.equal(true);
        expect(writeStub.calledWith(0x31, 0b11011111)).to.equal(true);
      });
    });
    it('sets active-low', () => {
      readStub.resolves(0x00);
      return adxl345.setINTActiveLow().then(() => {
        expect(readStub.calledWith(0x31)).to.equal(true);
        expect(writeStub.calledWith(0x31, 0b00100000)).to.equal(true);
      });
    });
  });
});
