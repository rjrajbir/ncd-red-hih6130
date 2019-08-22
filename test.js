var comms = require('ncd-red-comm');
var hih6130 = require('./index.js');

/*
 * Allows use of a USB to I2C converter form ncd.io
 */
var port = '/dev/tty.usbserial-DN03Q7F9';
var serial = new comms.NcdSerial('/dev/tty.usbserial-DN03Q7F9', 115200);
var comm = new comms.NcdSerialI2C(serial, 0);

var sensor = new hih6130(0x27, {scale: 'f'}, comm);

setInterval(() => {
	sensor.get().then().catch(console.log).then((res) => {
		console.log(res);
	});
}, 1000);