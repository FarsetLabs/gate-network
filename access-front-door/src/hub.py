import urequests


class Hub():
    def __init__(self, env):
        self.env = env

    def register_device(self, id):
        url = 'http://{}/register'.format(self.env.HUB_IP_ADDRESS)
        data = {'id': id, 'psk': self.env.SHARED_PASSWORD}
        encoded_data = '&'.join(["{}={}".format(k, v) for k, v in data.items()])
        response = urequests.post(url, data=encoded_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        response.close()
        return response.status_code

    def perform_action(self, id, affect, params):
        url = 'http://{}/action'.format(self.env.HUB_IP_ADDRESS)
        data = {'id': id, 'psk': self.env.SHARED_PASSWORD, affect: affect, params: params}
        encoded_data = '&'.join(["{}={}".format(k, v) for k, v in data.items()])
        response = urequests.post(url, data=encoded_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        response.close()
        return response.status_code
