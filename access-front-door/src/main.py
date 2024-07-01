import network
import uasyncio as asyncio
import utime as time
from machine import PWM, Pin
from phew import server
from phew.server import Request

from . import env


class Wifi():
    def __init__(self):
        self.wifi = network.WLAN(network.STA_IF)
        time.sleep_us(100)
        self.wifi.config(dhcp_hostname=env.HOSTNAME)

    async def connect(self, timeout_ms=60*1000):
        if self.is_connected():
            return True

        # Connect to WiFi
        self.wifi.active(True)
        self.wifi.connect(env.WIFI_SSID, env.WIFI_PASSWORD)
        try:
            await asyncio.wait_for_ms(self.wait_for_connected(), timeout_ms)
            return True
        except asyncio.TimeoutError:
            self.wifi.disconnect()
            self.wifi.active(False)
            return False
    
    def ip(self):
        return self.wifi.ifconfig()[0]

    def is_connected(self):
        return self.wifi.isconnected()
    
    async def wait_for_connected(self, connected=True):
        while self.is_connected() is not connected:
            await asyncio.sleep_ms(500)
    
    async def wait_for_disconnected(self):
        while self.is_connected():
            await asyncio.sleep_ms(500)
    
    async def stay_connected(self):
        while True:
            await self.connect()
            await asyncio.sleep_ms(500)


class DoorServer():
    def __init__(self):
        self.pwm = PWM(Pin(23)) # Set up pin D23 to output
        self.led = Pin(2, Pin.OUT) # Pin 2 is the built-in LED
        self.setup_server()

        self.unlocked_until = 0
    
    def setup_server(self):
        self.server = server.Phew()
        self.server.add_route('/', self.index, methods=['POST'])
    
    def parse_duration(self, duration):
        try:
            return int(duration)
        except (TypeError, ValueError):
            return env.DEFAULT_UNLOCK_DURATION
    
    async def index(self, request: Request):
        params = request.data

        # Bail if the request didn't come from a known source
        if params.get('psk') != env.SHARED_PASSWORD:
            return

        duration = self.parse_duration(params.get("duration"))
        unlock_duration = max(min(duration, 30), 1)

        self.unlock()
        asyncio.create_task(self.schedule_lock(unlock_duration * 1000))
        return 'OK'

    async def schedule_lock(self, duration_ms: int):
        until_ms = time.ticks_add(time.ticks_ms(), duration_ms)
        # if until_ms - self.unlocked_until is a negative number then
        # until_ms is before than the current value and we exit early
        if time.ticks_diff(until_ms, self.unlocked_until) < 0:
            return

        self.unlocked_until = until_ms
        await asyncio.sleep_ms(duration_ms)

        # check that self.unlocked_until hasn't been updated
        if self.unlocked_until == until_ms:
            self.lock()
    
    def lock(self):
        self.led.off()
        self.pwm.duty(0)

    def unlock(self):
        # Output signal on pin to unlock and light up the internal light
        self.led.on()
        self.pwm.duty(1023)
    
    def run(self):
        self.server.run()


async def main():
    door = DoorServer()
    door.lock()

    wifi = Wifi()
    while not await wifi.connect():
        print('Connecting...')
    print('Connected:', wifi.ip())

    door.run()


if __name__ == '__main__':
    asyncio.run(main())
