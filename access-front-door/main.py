import network
from machine import Pin, PWM
import socket
import time

# Variables
wifi_ssid = "farset-guest"
wifi_password = "donationswelcome"
shared_password = "access-front-door-psk"
hostname = "access-front-door"
default_unlock_duration = 10
response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"

# Connect to WiFi
wifi = network.WLAN(network.STA_IF)
wifi.active(True)
time.sleep_us(100)
wlan.config(dhcp_hostname=hostname)
wifi.connect(wifi_ssid, wifi_password)

while not wifi.isconnected():
    pass

def get_parameters_from(request):
    parameters = {}
    request_str = str(request)
    params_index = request_str.find('Content-Length:')
    ampersandSplit = request_str[params_index:].split("&")

    for element in ampersandSplit:
        equalSplit = element.split("=")
        parameters[equalSplit[0]] = equalSplit[1]

  return parameters

pwm = PWM(Pin(23)) # Set up pin D23 to output
pwm.duty(0)

led = Pin(2, Pin.OUT) # Pin 2 is the built-in LED
led.value(0)

# Set up webserver
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(('', 8080))
s.listen(5)

while True:
    conn, addr = s.accept()
    request = conn.recv(1024)
    parameters = get_parameters_from(request)
    conn.send(response)
    conn.close()

    # Bail if the request didn't come from a known source
    if parmeters['psk'] != shared_password:
        continue

    duration_parameter = parameters["duration"] if parameters["duration"] is not None else default_unlock_duration
    unlock_duration = max(min(duration_parameter, 30), 1)

    # Output signal on pin to unlock and light up the internal light
    led.value(1)
    pwm.duty(1023)

    time.sleep(unlock_duration)

    led.value(0)
    pwm.duty(0)
