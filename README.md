# Homebridge PcControl

A Homebridge plugin for PC control, enabling you to perform various actions on your computer through HomeKit.

## Features

- **Monitor Control**: Turn your monitor on or off.
- **System Sleep**: Coming soon.
- (Coming soon...)

## Installation

Install the plugin via npm (or manually):

```bash
npm install -g homebridge-pccontrol
```

Configuration
Add the following configuration to your Homebridge config.json file:

```bash

"accessories": [
  {
    "accessory": "PcControl",
    "name": "Monitor Control",
    "ip": "YOUR_PC_IP_ADDRESS",
    "port": YOUR_PC_PORT
  },
  // Add other accessories or configurations...
]
```
Replace YOUR_PC_IP_ADDRESS and YOUR_PC_PORT with the appropriate values for your setup.

Usage
After configuring the plugin, you can control your PC through your HomeKit app. The available actions are dependent on the features you have enabled and configured.

Contributing
If you have ideas for new features or improvements, feel free to contribute to the repository:


License
This project is licensed under the MIT License.

Author
TaDejKas - https://github.com/tadejkas1
