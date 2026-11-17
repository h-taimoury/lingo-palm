from django.contrib.auth.backends import ModelBackend


class VerifiedEmailBackend(ModelBackend):
    def user_can_authenticate(self, user):
        return super().user_can_authenticate(user) and (user.is_staff or user.email_verified)
