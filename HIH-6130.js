"use strict";
process.on('unhandledRejection', r => console.log(r));
const HIH6130 = require("./index.js");

module.exports = function(RED){
	var sensor_pool = {};

	function NcdI2cDeviceNode(config){
		RED.nodes.createNode(this, config);
		this.interval = parseInt(config.interval);
		this.addr = 0x27;
		this.onchangeT = config.onchangeT;
		this.onchangeH = config.onchangeH;
		if(typeof sensor_pool[this.id] != 'undefined'){
			//Redeployment
			clearTimeout(sensor_pool[this.id].timeout);
			delete(sensor_pool[this.id]);
		}
		this.sensor = new HIH6130(this.addr, config, RED.nodes.getNode(config.connection).i2c);
		sensor_pool[this.id] = {
			sensor: this.sensor,
			polling: false,
			timeout: 0,
			node: this
		};

		var node = this;
		var status = "{}";

		function device_status(){
			if(!node.sensor.initialized){
				node.status({fill:"red",shape:"ring",text:"disconnected"});
				return false;
			}
			node.status({fill:"green",shape:"dot",text:"connected"});
			return true;
		}

		function start_poll(){
			if(node.interval && !sensor_pool[node.id].polling){
				sensor_pool[node.id].polling = true;
				get_status(true);
			}
		}

		function stop_poll(){
			clearTimeout(sensor_pool[node.id].timeout);
			sensor_pool[node.id].polling = false;
		}

		function send_payload(_status){
			if(node.onchange && JSON.stringify(_status) == status) return;
			var msg = [],
				dev_status = {topic: 'device_status', payload: _status},
				changed = false;
			if(config.output_all){
				var old_status = JSON.parse(status);
				if(node.onchangeH && Math.abs(_status.humidity - old_status.humidity) < node.onchangeH){
					msg.push(null);
				}else{
					changed = true;
					msg.push({topic: 'humidity', payload: _status.humidity});
				}

				if(node.onchangeT && Math.abs(_status.temperature - old_status.temperature) < node.onchangeT){
					msg.push(null);
				}else{
					changed = true;
					msg.push({topic: 'temperature', payload: _status.temperature});
				}
				msg.push(dev_status);
			}else{
				if((!node.onchangeT || Math.abs(_status.temperature - old_status.temperature) >= node.onchangeT) ||
					(!node.onchangH || Math.abs(_status.humidity - old_status.humidity) >= node.onchangeH)){
					changed = true;
				}
				msg = dev_status;
			}
			if(status == "{}" || changed){
				status = JSON.stringify(_status);
				node.send(msg);
			}
		}

		function get_status(repeat){
			if(repeat) clearTimeout(sensor_pool[node.id].timeout);
			if(device_status(node)){
				node.sensor.get().then((res) => {
					send_payload(res);
				}).catch((err) => {
					node.send({error: err});
				}).then(() => {
					if(repeat && node.interval){
						clearTimeout(sensor_pool[node.id].timeout);
						sensor_pool[node.id].timeout = setTimeout(() => {
							if(typeof sensor_pool[node.id] != 'undefined'){
								get_status(true);
							}
						}, sensor_pool[node.id].node.interval);
					}else{
						sensor_pool[node.id].polling = false;
					}
				});
			}else{
				node.sensor.init();
				clearTimeout(sensor_pool[node.id].timeout);
				sensor_pool[node.id].timeout = setTimeout(() => {
					if(typeof sensor_pool[node.id] != 'undefined'){
						get_status(true);
					}
				}, 3000);
			}
		}

		node.on('close', (removed, done) => {
			if(removed){
				clearTimeout(sensor_pool[node.id].timeout);
				delete(sensor_pool[node.id]);
			}
			done();
		});

		start_poll();
		device_status(node);
	}
	RED.nodes.registerType("ncd-hih6130", NcdI2cDeviceNode);
};