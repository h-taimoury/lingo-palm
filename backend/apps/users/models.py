import uuid

from django.db import models
from django.db.models.functions import Lower
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)


# --- Custom User Manager ---
class UserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifier
    for authentication instead of usernames.
    """

    def get_by_natural_key(self, email):
        return self.get(email__iexact=email)

    def create_user(self, email, password, **extra_fields):
        """
        Creates and saves a User with the given email and password.
        """
        if not email:
            raise ValueError("The Email must be set")

        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(
            password
        )  # Receives the raw password, hashes it and adds the hashed password in the password field of User object. This method is a quite simple method provided by AbstractBaseUser class.
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Creates and saves a Superuser with the given email and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


# --- Custom User Model ---
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    pending_email = models.EmailField(blank=True)
    verification_id = models.UUIDField(default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    subscription_ends_at = models.DateTimeField(null=True, blank=True)

    # Required fields for Django's permission system
    is_staff = models.BooleanField(
        default=False
    )  # This field grants the user access to the Django Admin site.
    is_active = models.BooleanField(
        default=True
    )  # This field is the primary switch to enable or disable a user account. If set to False, the user cannot log in at all.

    # Link the UserManager to the model
    objects = UserManager()

    # Specify the field used as the unique identifier for authentication
    USERNAME_FIELD = "email"

    # Fields that are prompted for when creating a user via 'createsuperuser'
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        constraints = [models.UniqueConstraint(Lower("email"), name="users_email_case_insensitive")]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """
        Returns the first_name plus the last_name, with a space in between.
        """
        full_name = "%s %s" % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        """Returns the short name for the user."""
        return self.first_name


class AuthRateLimit(models.Model):
    key = models.CharField(primary_key=True, max_length=64)
    attempts = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)
