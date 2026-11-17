import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .emails import send_verification_email

User = get_user_model()


def check_password_strength(password, user):
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"password": list(exc.messages)}) from exc


def check_password_confirmation(attrs):
    if attrs.get("password") != attrs.get("password_confirm"):
        raise serializers.ValidationError({"password_confirm": "Passwords do not match."})


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name", "created_at",
            "password", "is_staff", "is_superuser", "email_verified", "pending_email",
        )
        read_only_fields = ("id", "full_name", "created_at", "is_staff", "email_verified", "pending_email")

    def validate_email(self, value):
        value = value.lower()
        users = User.objects.filter(email__iexact=value)
        if self.instance:
            users = users.exclude(pk=self.instance.pk)
        if users.exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if "password" in attrs:
            user = User(
                email=attrs.get("email", getattr(self.instance, "email", "")),
                first_name=attrs.get("first_name", getattr(self.instance, "first_name", "")),
                last_name=attrs.get("last_name", getattr(self.instance, "last_name", "")),
            )
            check_password_strength(attrs["password"], user)
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        fields = set(validated_data)
        password = validated_data.pop("password", None)
        if password is not None:
            instance.set_password(password)
            instance.pending_email = ""
            instance.verification_id = uuid.uuid4()
            fields.update(("password", "pending_email", "verification_id"))
        if "email" in validated_data and validated_data["email"] != instance.email:
            instance.email_verified = False
            instance.pending_email = ""
            instance.verification_id = uuid.uuid4()
            fields.update(("email_verified", "pending_email", "verification_id"))
        if validated_data.get("email_verified") and not instance.email_verified:
            instance.pending_email = ""
            instance.verification_id = uuid.uuid4()
            fields.update(("pending_email", "verification_id"))
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if fields:
            instance.save(update_fields=fields)
        return instance


class RegistrationSerializer(UserSerializer):
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("password_confirm",)

    def validate(self, attrs):
        check_password_confirmation(attrs)
        return super().validate(attrs)

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return super().create(validated_data)


class ProfileSerializer(UserSerializer):
    current_password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("current_password", "password_confirm")

    def validate(self, attrs):
        email_changed = "email" in attrs and attrs["email"] != self.instance.email
        if email_changed or "password" in attrs:
            if not self.instance.check_password(attrs.get("current_password", "")):
                raise serializers.ValidationError({"current_password": "Enter your current password."})
        if "password" in attrs:
            check_password_confirmation(attrs)
        return super().validate(attrs)

    def update(self, instance, validated_data):
        validated_data.pop("current_password", None)
        validated_data.pop("password_confirm", None)
        email = validated_data.pop("email", instance.email)
        instance = super().update(instance, validated_data)
        if email != instance.email:
            instance.pending_email = email
            instance.verification_id = uuid.uuid4()
            instance.save(update_fields=("pending_email", "verification_id"))
            send_verification_email(instance)
        return instance


class UserSerializerForAdmins(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("is_active",)
        read_only_fields = ("id", "full_name", "created_at", "pending_email")

    def get_fields(self):
        fields = super().get_fields()
        # An omitted HTML checkbox must leave verification unchanged on PUT.
        fields["email_verified"].default_empty_html = serializers.empty
        return fields

    def validate_email_verified(self, value):
        request = self.context.get("request")
        if (not request or not request.user.is_superuser or not self.instance
                or self.instance.pk == request.user.pk):
            raise PermissionDenied("Only a superuser can manually verify another user's email.")
        if not value:
            raise serializers.ValidationError("This control only marks an email as verified.")
        return value


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        attrs["email"] = attrs["email"].lower()
        user = User.objects.filter(email__iexact=attrs["email"], email_verified=False, is_staff=False, is_active=True).first()
        if user and user.check_password(attrs["password"]):
            raise PermissionDenied({"detail": "Verify your email before signing in.", "code": "email_not_verified"})
        return super().validate(attrs)


class EmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class CorrectEmailSerializer(EmailRequestSerializer):
    new_email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class VerificationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=2048)


class PasswordResetSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=100)
    token = serializers.CharField(max_length=200)
    password = serializers.CharField(trim_whitespace=False)
    password_confirm = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        check_password_confirmation(attrs)
        return attrs
