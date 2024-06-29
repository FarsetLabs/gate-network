# bin/bash
if [[ -z "$1" ]]; then
    echo "usage: $0 [device_id]"
    mpremote devs
    exit 1;
fi

mpremote connect id:$1 reset
mpremote connect id:$1 cp -r src/* :
mpremote connect id:$1 run ./src/main.py
