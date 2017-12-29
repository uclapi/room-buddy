from django.shortcuts import redirect
from django.http import HttpResponse
import random
import string
import os
import requests
from .models import User


def generate_random_state():
    return ''.join(
        random.choice(string.ascii_letters + string.digits) for _ in range(50)
    )


def oauth_login(request):
    state = generate_random_state()
    request.session['state'] = state

    return redirect(
        'https://uclapi.com/oauth/authorise?state={}&client_id={}'.format(
            state,
            os.environ['UCLAPI_CLIENT_ID']
        )
    )


def oauth_callback(request):
    if request.method != 'GET':
        return HttpResponse('request is not of type get')

    try:
        state = request.GET['state']
        code = request.GET['code']
        result = request.GET['result']
    except KeyError:
        return HttpResponse('Request does not include state or code or result')

    if result != 'allowed':
        return HttpResponse(
            'You didn\'t authorise UCL Find Free Room. Please try again'
        )

    if state != request.session.get('state'):
        return HttpResponse('State doesn\'t match. Please try again')

    params = {
        'code': code,
        'client_id': os.environ['UCLAPI_CLIENT_ID'],
        'client_secret': os.environ['UCLAPI_CLIENT_SECRET'],
    }
    r = requests.get('https://uclapi.com/oauth/token', params=params)
    resp = r.json()

    if not resp['ok']:
        return HttpResponse('Token could not be obtained. Please try again')

    uclapi_token = resp['token']

    params = {
        'client_secret': os.environ['UCLAPI_CLIENT_SECRET'],
        'token': uclapi_token,
    }
    r = requests.get('https://uclapi.com/oauth/user/data', params=params)
    resp = r.json()
    try:
        user = User.objects.get(email=resp['email'])
    except User.DoesNotExist:
        new_user = User(
            email=resp['email'],
            token=generate_random_state(),
            uclapi_token=uclapi_token
        )
        new_user.save()
        token = new_user.token
    else:
        user.uclapi_token = uclapi_token
        user.save()
        token = user.token

    # Redirect back to user mobile app with veruto token
    url = "https://auth.expo.io/@wilhelmklopp/uclroombuddy"
    return redirect(
        '{}?token={}'.format(url, token)
    )
