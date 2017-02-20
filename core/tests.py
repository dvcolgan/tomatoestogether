from django_webtest import WebTest
from selenium import webdriver
from django.test import LiveServerTestCase
from .models import User


class BaseAPITest(WebTest):
    API_ROOT = ''

    def setUp(self):
        self.headers = {}
        self.user = None

    def create_user(self, email, password, name=''):
        user = User.objects.create(
            email=email,
            name=name,
        )
        user.set_password(password)
        user.save()
        self.user = user
        return user

    def login(
            self,
            email='dvcolgan@gmail.com',
            password='password'):
        self.create_user(email, password)

        res = self.post('/auth/token/', {
            'email': 'dvcolgan@gmail.com',
            'password': 'password',
        })
        token = res.json.get('token')
        self.headers = {
            'Authorization': 'JWT ' + token,
        }

    def logout(self):
        self.headers = {}

    def get(self, url, params={}):
        return self.app.get(self.API_ROOT + url, params, self.headers)

    def post(self, url, data):
        return self.app.post_json(self.API_ROOT + url, data, self.headers)

    def put(self, url, data):
        return self.app.put_json(self.API_ROOT + url, data, self.headers)

    def patch(self, url, data):
        return self.app.patch_json(self.API_ROOT + url, data, self.headers)

    def delete(self, url, data):
        return self.app.delete_json(self.API_ROOT + url, data, self.headers)

    def assertResponse(self, res, expected_status_code, expected_json):
        self.assertEqual(res.status_code, expected_status_code)
        self.assertDictEqual(res.json, expected_json)

    def assertResponseCode(self, res, status_code):
        self.assertEqual(res.status_code, status_code)


class TestUserAPI(BaseAPITest):
    API_ROOT = '/api/v1'

    def test_create_account(self):
        res = self.post('/users/', {
            'email': 'dvcolgan@gmail.com',
            'password': 'password',
            'name': 'David',
        })

        self.assertResponse(res, 201, {
            'email': 'dvcolgan@gmail.com',
            'name': 'David',
            'tomato_break_iframe_url': '',
        })

    def test_login(self):
        self.create_user('dvcolgan@gmail.com', 'password')
        res = self.post('/auth/token/', {
            'email': 'dvcolgan@gmail.com',
            'password': 'password',
        })
        token = res.json['token']

        self.assertResponse(res, 200, {
            'token': token,
        })

    def test_change_password(self):
        self.login('dvcolgan@gmail.com', 'password')

        res = self.patch('/users/me/', {
            'password': 'password2',
        })

        res = self.post('/auth/token/', {
            'email': 'dvcolgan@gmail.com',
            'password': 'password2',
        })
        token = res.json['token']

        self.assertResponse(res, 200, {
            'token': token,
        })


class TestTaskAPI(BaseAPITest):
    API_ROOT = '/api/v1'

    def test_create_task(self):
        self.login()
        res = self.post('/tasks/', {
            'title': 'Go to the store',
            'user': self.user.id,
        })

        self.assertResponse(res, 201, {
            'parent': None,
            'title': 'Go to the store',
            'body': '',
            'tomato': None,
            'completed': False,
        })

    #def test_fetch_all_tasks(self):
    #    self.login()
    #    other_user = self.create_other_user()
    #    self.create_task_for(self.user)
    #    self.create_task_for(other_user)

    #    res = self.get('/tasks/')
    #    self.assertEqual(1, len(res.json))


class BaseIntegrationTest(LiveServerTestCase):
    def setUp(self):
        self.browser = webdriver.Chrome()
        self.browser.implicitly_wait(3)
        self.browser.set_window_position(0, 0)
        screen_height = self.browser.execute_script('return window.screen.height')
        self.browser.set_window_size(360, screen_height - 32)
        self.browser.get('http://tomatoestogether_test/')

    def tearDown(self):
        self.browser.quit()


class TestUserIntegration(BaseIntegrationTest):
    def test_create_account(self):
        import ipdb; ipdb.set_trace() 
