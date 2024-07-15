import uasyncio as asyncio
import utime as time
from machine import PWM, Pin
from phew import server
from phew.server import Request

import env
from hub import Hub
from wifi import Wifi


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
        params = request.form

        # Bail if the request didn't come from a known source
        if params.get('psk') != env.SHARED_PASSWORD:
            return

        # Reparse any params which were passed from the initial sender
        proxied_params = server._parse_query_string(params.get("params"))
        duration = self.parse_duration(proxied_params.get("duration"))
        unlock_duration = max(min(duration, 30), 1)

        self.unlock()
        asyncio.create_task(self.schedule_lock(unlock_duration * 1000))
        return 'OK'

    async def schedule_lock(self, duration_ms: int):
        until_ms = time.ticks_add(time.ticks_ms(), duration_ms)
        # if until_ms - self.unlocked_until is a negative number then
        # until_ms is before the current value and we exit early
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
        self.server.run(port = 8080)


async def main():
    door = DoorServer()
    door.lock()

    wifi = Wifi(env)
    while not await wifi.connect():
        print('Connecting...')
    print('Connected:', wifi.ip())

    print("Registering with the hub ...")
    hub = Hub(env)
    status_code = hub.register_device('access-front-door')
    if status_code == 200:
        print('Device registered successfully')
    else:
        print('Error registering device:', status_code)

    door.run()


if __name__ == '__main__':
    asyncio.run(main())
