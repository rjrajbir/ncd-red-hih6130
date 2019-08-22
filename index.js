module.exports = class HIH6130{
	constructor(addr, config, comm){
		this.config = config;
		this.comm = comm;
		this.addr = addr;
		this.settable = [];
		this.init();
	}

	init(){
		var sensor = this;
		this.comm.writeByte(this.addr, 80).then((r) => {
			sensor.initialized = true;
		}).catch((e) => {
			sensor.initialized = false;
		});
	}
	get(){
		var sensor = this;
		return new Promise((fulfill, reject) => {
			sensor.comm.readBytes(sensor.addr, 4).then((res) => {
				fulfill(sensor.parseStatus(res));
			}).catch((e) => {
				sensor.initialized = false;
				reject(e);
			});
		});
	}
	parseStatus(data){
		var readings = {
			humidity: ((((data[0] & 0x3F) << 8) + data[1]) * 100) / 16383,
	  		temperature: (((data[2] << 8) + (data[3] & 0xFC)) / 4) / 16384 * 165 - 40
		};
		if(this.config.scale == 'f') readings.temperature = (readings.temperature * 1.8) + 32;
		if(this.config.scale == 'k') readings.temperature += 273.15;
		return readings;
	}
};
