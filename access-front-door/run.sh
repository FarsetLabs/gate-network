# bin/bash
if [[ -z "$1" ]]; then
    echo "usage: $0 [device_id] [flash]"
    mpremote devs
    exit 1;
fi

echo "Resetting device $1 ..."
mpremote connect id:$1 reset

echo "Copying files to device $1 ..."
cd ./src
mpremote connect id:$1 cp -r lib/* :
mpremote connect id:$1 cp ./hub.py :
mpremote connect id:$1 cp ./wifi.py :
mpremote connect id:$1 cp ./env.py :

if [[ -z "$2" ]]; then
    echo "Running main.py remotely ..."
    mpremote connect id:$1 run ./main.py
else
    echo "Copying main.py into place ..."
    mpremote connect id:$1 cp ./main.py :
    echo "Device has been updated"
fi
