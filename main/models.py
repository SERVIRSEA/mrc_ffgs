from django.db import models
from ckeditor.fields import RichTextField
from django.utils import timezone

class Bulletin(models.Model):
    content = RichTextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return str(self.created_at)


