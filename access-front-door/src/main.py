import socket
import time

import network
from machine import PWM, Pin

from . import env


# Variables
RESPONSE = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"


class Door():
    def __init__(self):
        self.pwm = PWM(Pin(23)) # Set up pin D23 to output
        self.led = Pin(2, Pin.OUT) # Pin 2 is the built-in LED
        self.setup_wifi()
        self.setup_socket()

    def setup_wifi(self):
        self.wifi = network.WLAN(network.STA_IF)
        self.wifi.active(True)
        time.sleep_us(100)
        self.wifi.config(dhcp_hostname=env.HOSTNAME)

    def connect_wifi(self):
        # Connect to WiFi
        self.wifi.connect(env.WIFI_SSID, env.WIFI_PASSWORD)
        while not self.wifi.isconnected():
            pass
    
    def setup_socket(self):
        # Set up webserver
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.bind(('', 8080))
        self.socket.listen(5)

    def get_parameters_from(self, request: bytes):
        parameters: dict[str, str] = {}
        request_str = request.decode('utf-8')
        params_index = request_str.find('Content-Length:')
        ampersand_split = request_str[params_index:].split("&")
        for element in ampersand_split:
            equal_split = element.split("=")
            parameters[equal_split[0]] = equal_split[1]

        return parameters

    def read_socket(self):
        conn: socket.socket = self.socket.accept()[0]
        request = conn.recv(1024)
        parameters = self.get_parameters_from(request)
        conn.send(RESPONSE)
        conn.close()

        return parameters
    
    def lock(self):
        self.led.off()
        self.pwm.duty(0)

    def unlock(self):
        # Output signal on pin to unlock and light up the internal light
        self.led.on()
        self.pwm.duty(1023)

    def run(self):
        while True:
            try:
                self.update()
            except Exception as e:
                print(e)

    def update(self):
        self.lock()

        if not self.wifi.isconnected():
            self.connect_wifi()

        parameters = self.read_socket()

        # Bail if the request didn't come from a known source
        if parameters.get('psk') != env.SHARED_PASSWORD:
            return

        duration = parameters.get("duration")
        try:
            duration = int(duration) if duration is not None else env.DEFAULT_UNLOCK_DURATION
        except ValueError:
            return
        unlock_duration = max(min(duration, 30), 1)

        self.unlock()
        time.sleep(unlock_duration)


if __name__ == '__main__':
    door = Door()
    door.run()
