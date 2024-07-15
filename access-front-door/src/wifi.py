import network
import uasyncio as asyncio


class Wifi():
    def __init__(self, env):
        self.env = env
        self.wifi = network.WLAN(network.STA_IF)

    async def connect(self, timeout_ms=60*1000):
        if self.is_connected():
            return True

        # Connect to WiFi
        self.wifi.active(True)
        self.wifi.connect(self.env.WIFI_SSID, self.env.WIFI_PASSWORD)
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

    async def wait_for_connected(self, connection_state=True):
        while self.is_connected() is not connection_state:
            await asyncio.sleep_ms(500)

    async def stay_connected(self):
        while True:
            await self.connect()
            await asyncio.sleep_ms(500)
