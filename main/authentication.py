from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

class APIKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        api_key = request.META.get('HTTP_AUTHORIZATION')
        
        if not api_key:
            print("No API key provided in the request.")
            return None
        
        correct_api_key = settings.API_KEY

        if api_key != correct_api_key:
            print(f"API key mismatch. Provided: {api_key}, Expected: {correct_api_key}")
            raise AuthenticationFailed('Invalid API key provided.')
        else:
            print("KEY Matched")
            return (None, api_key)
