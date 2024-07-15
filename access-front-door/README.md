# Access Front Door

This is the code required for opening the front door latch.


## Flashing ESP32

```bash
pip install esptool

# Find the serial port of the connected ESP32
esptool.py flash_id

# Wipe the chip
esptool.py --port [serial_port] erase_flash

# Download the latest firmware from https://micropython.org/download/ESP32_GENERIC/
# Install the firmware
esptool.py --chip esp32 --port [serial_port] --baud 460800 write_flash -z 0x1000 [path_to_downloaded_bin_file]
```


## Setting up environment variables

1. Clone this repository
   ```sh
   git clone git@github.com:FarsetLabs/gate-network.git
   cd gate-network
   ```
1. Create the environment file
   ```sh
   cp ./access-front-door/src/env.example.py ./access-front-door/src/env.py
   ```
1. Set `WIFI_SSID` and `WIFI_PASSWORD` to your wifi ssid and password
1. Update any other variables


## Micropython type hints in VSCode

### Install these extensions:
* https://marketplace.visualstudio.com/items?itemName=ms-python.python
* https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance


### Setup virtualenv and install stubs
```bash
# setup virtualenv
python3 -m venv .venv

# activate virtualenv
source ./.venv/bin/activate

# install micropython stubs
pip3 install -U micropython-esp32-stubs

# install mpremote (optional, lets you connect via command line)
pip3 install -U mpremote
```

### Configure vscode
`.vscode/settings.json`
```json
{
    "python.languageServer": "Pylance",
    "python.analysis.typeCheckingMode": "basic",
    "python.analysis.diagnosticSeverityOverrides": {
        "reportMissingModuleSource": "none"
    },
    "python.analysis.typeshedPaths": [
        // Replace <python_version> with whatever the folder name is in .venv/lib/
        ".venv/lib/<python_version>/site-packages",
    ],
    "python.analysis.extraPaths": [
        // Allow importing from lib/
        "access-front-door/src/lib",
    ],
    "pylint.args": [
        // Fixes imports
        "--init-hook 'import sys; sys.path.append(\".\")'",
    ],
}
```


### Copy code to device via command line (requires mpremote)
```bash
# make sure you are in the access-front-door directory
cd access-front-door

# list connected devices
./run.sh

# copy code and run main.py on device
./run.sh [device_id]
```
