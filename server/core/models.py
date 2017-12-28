from django.db import models

# Create your models here.


class User(models.Model):
    email = models.CharField(max_length=300, unique=True)
    token = models.CharField(max_length=1000, unique=True)
    uclapi_token = models.CharField(max_length=1000, unique=True)
