from django.http import JsonResponse

from .models import User


def check_for_token(func):
    def inner(request, *args, **kwargs):
        if not request.META.get('HTTP_AUTHORIZATION'):
            response = JsonResponse({
                "message": "No Authorization header provided"
            })
            response.status_code = 401
            return response
        try:
            User.objects.get(token=request.META['HTTP_AUTHORIZATION'])
        except User.DoesNotExist:
            response = JsonResponse({
                "message": "Invalid Authorization token provided"
            })
            response.status_code = 401
            return response
        # else: need to log api request was made by user
        return func(request, *args, **kwargs)
    return inner
