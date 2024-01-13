let Service, Characteristic;
const axios = require('axios');
const schema = require('./config.schema.json');

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-pccontrol", "PcControl", PcControl);
};

class PcControl {
  constructor(log, config) {
    this.log = log;
    this.logLevel = parseInt(config.logLevel); // Explicitly parse logLevel as an integer
    if (isNaN(this.logLevel)) {
      this.logLevel = 2; // Default to 2 if the parsed value is not a number
    }
    this.currentDisplayState = null;
    this.log(`Current log level: ${this.logLevel}`);
    this.name = config.name || "PcControl"; // Default switch name
    this.ip = config.ip || "192.168.1.117"; // Default ip address
    this.port = config.port || 90; // Default to 90 if port not specified
    this.accessory = "PcControl";
    this.displayCheckbox = config.displayCheckbox !== undefined ? config.displayCheckbox : true;
    this.lockCheckbox = config.lockCheckbox !== undefined ? config.lockCheckbox : true;
    this.currentLockState = null;

    this.manufacturer = "TaDejKas";
    this.model = "Windows";
    this.serialNumber = "535-16-281";

    setInterval(this.checkLockStatus.bind(this), 5000); // Check every 5 seconds

    this.monitorEndpoint = {
      on: "monitor-on",
      off: "monitor-off",
      lock: "lock"
    };

    // Display action
    if (this.displayCheckbox) {
      this.displaySwitchService = new Service.Switch(this.name + " Display");
      this.displaySwitchService.getCharacteristic(Characteristic.On)
        .on('set', this.setSwitchState.bind(this)); // Bind to setSwitchState
    }

    // Lock action
    if (this.lockCheckbox) {
      this.lockService = new Service.LockMechanism(this.name + " Lock");
      this.lockService
        .getCharacteristic(Characteristic.LockTargetState)
        .on('set', this.setLockState.bind(this)); // Bind to setLockState
    }

    // Define a callback for locking the PC
    this.lockCallback = () => {
      this.log(`PC is locked.`);
    };
  }

  customLog(message, level) {
    if (this.logLevel >= level) {
      this.log(message);
    }
  }

  setSwitchState(state, callback) {
    if (this.currentDisplayState === state) {
      this.customLog("Display state is already " + (state ? "on" : "off"), 1);
      callback();
      return;
    }

    // Debounce the state change
    if (this.switchStateTimeout) {
      clearTimeout(this.switchStateTimeout);
    }

    this.switchStateTimeout = setTimeout(() => {
      this.processSwitchState(state, callback);
    }, 500); // Adjust the debounce time as needed
  }

  setSwitchState(state, callback) {
    if (this.currentDisplayState === state) {
      this.customLog("Display state is already " + (state ? "on" : "off"), 2);
      callback(null, state); // No change needed, return early
      return;
    }

    const endpoint = state ? this.monitorEndpoint.on : this.monitorEndpoint.off;
    const url = `http://${this.ip}:${this.port}/${endpoint}`;

    axios.get(url)
      .then((response) => {
        if (response.status === 200) {
          this.currentDisplayState = state; // Update the current state
          this.customLog(`Monitor state changed to ${state ? 'ON' : 'OFF'} successfully`, 1);
          //UNLOCK
          if (state) {
            this.setLockState(Characteristic.LockTargetState.UNSECURED, () => {});
          }
          callback(null, state); // Successful state change
        } else {
          this.customLog(`Error changing monitor state: Unexpected HTTP status code ${response.status}`, 2);
          callback(new Error(`Unexpected HTTP status code ${response.status}`)); // Error in state change
        }
      })
      .catch((error) => {
        this.customLog(`Error changing monitor state: ${error.message}`, 2);
        callback(error); // Error in state change
      });
  }

  checkLockStatus() {
    // Corrected checkLockStatus method
    const url = `http://${this.ip}:${this.port}/get-lock-status`;
    
    axios.get(url)
      .then((response) => {
        if (response.status === 200 && response.data && typeof response.data.locked === 'boolean') {
          const lockState = response.data.locked
            ? Characteristic.LockCurrentState.SECURED
            : Characteristic.LockCurrentState.UNSECURED;
          this.lockService.updateCharacteristic(Characteristic.LockCurrentState, lockState);
          this.customLog(`Fetched lock status: ${response.data.locked ? 'locked' : 'unlocked'}`, 2);
        } else {
          this.customLog(`Error fetching lock status: Unexpected HTTP status code ${response.status}`, 2);
        }
      })
      .catch((error) => {
        this.customLog(`Error fetching lock status: ${error.message}`, 2);
      });
  }

  setLockState(state, callback) {
    if (this.currentLockState === state) {
      this.customLog(`Lock state is already ${state === Characteristic.LockTargetState.SECURED ? 'locked' : 'unlocked'}`, 2);
      callback(null, state); // No change needed, return early
      return;
    }

    const endpoint = state === Characteristic.LockTargetState.SECURED ? 'lock' : 'monitor-on';
    const url = `http://${this.ip}:${this.port}/${endpoint}`;

    axios.get(url)
      .then((response) => {
        if (response.status === 200) {
          this.currentLockState = state; // Update the current state
          this.lockService.updateCharacteristic(Characteristic.LockCurrentState, state);
          this.lockService.updateCharacteristic(Characteristic.LockTargetState, state);
          this.customLog(`Lock state changed to ${state === Characteristic.LockTargetState.SECURED ? 'locked' : 'unlocked'} successfully`, 1);
          callback(null, state);
        } else {
          this.customLog(`Error changing lock state: Unexpected HTTP status code ${response.status}`, 2);
          callback(new Error(`Unexpected HTTP status code ${response.status}`));
        }
      })
      .catch((error) => {
        this.customLog(`Error changing lock state: ${error.message}`, 2);
        callback(error);
      });
  }

  lockCallback() {
    this.customLog("PC is locked.", 1);
    }
  unlockCallback() {
      this.customLog("PC is unlocked.", 1);
      }

  checkLockStatus() {
    const url = `http://${this.ip}:${this.port}/get-lock-status`;

    axios.get(url)
        .then((response) => {
            if (response.status === 200 && response.data && typeof response.data.locked === 'boolean') {
                const lockState = response.data.locked
                    ? Characteristic.LockCurrentState.SECURED
                    : Characteristic.LockCurrentState.UNSECURED;
                this.lockService.updateCharacteristic(Characteristic.LockCurrentState, lockState);
                this.customLog(`Fetched lock status: ${response.data.locked ? 'locked' : 'unlocked'}`, 2);
            } else {
              this.customLog(`Error fetching lock status: Unexpected HTTP status code ${response.status}`, 2);
            }
        })
        .catch((error) => {
          this.customLog(`Error fetching lock status: ${error.message}`, 2);
        });
  }


  triggerLock(isLocked) {
    // Only proceed if the PC is currently unlocked
    if (!isLocked) {
        const url = `http://${this.ip}:${this.port}/lock`;
        axios.get(url)
            .then((response) => {
                if (response.status === 200) {
                  this.customLog(`Triggered lock action on PC`, 2);
                } else {
                  this.customLog(`Error triggering lock action: Unexpected HTTP status code ${response.status}`, 2);
                }
            })
            .catch((error) => {
                this.customLog(`Error triggering lock action: ${error.message}`, 2);
            });
    } else {
        this.customLog(`PC is already locked. No action taken.`, 2);
    }
  }


  getServices() {
    const informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, "1.5");
      
    const services = [informationService];

    if (this.displayCheckbox) {
      services.push(this.displaySwitchService);
    }

    if (this.lockCheckbox) {
      services.push(this.lockService);
    }

    return services;
  }
}

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-pccontrol", "PcControl", PcControl);
};
