let Service, Characteristic;
const axios = require('axios');

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-pccontrol", "PcControl", PcControl);
};

class PcControl {
  constructor(log, config) {
    this.log = log;
    this.name = config.name || "PcControl"; // Default
    this.ip = config.ip || "192.168.178.117"; // Default
    this.port = config.port || 90; // Default to 90 if port not specified

    this.manufacturer = "TaDejKas";
    this.model = "Windows";
    this.serialNumber = "535-16-281";

    this.monitorEndpoint = {
      on: "monitor-on",
      off: "monitor-off"
    };

    this.switchService = new Service.Switch(this.name);
    this.switchService.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this));
  }

  setSwitchState(state, callback) {
    const endpoint = state ? this.monitorEndpoint.on : this.monitorEndpoint.off;
    const url = `http://${this.ip}:${this.port}/${endpoint}`;
    axios.get(url)
      .then(() => {
        this.log(`Monitor state changed to ${state ? 'on' : 'off'} successfully`);
        callback();
      })
      .catch((error) => {
        this.log(`Error changing monitor state:`, error);
        callback(error);
      });
  }

  getServices() {
    const informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, "1.5");
  
    return [informationService, this.switchService];
  }
}
