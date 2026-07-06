from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Team, Task

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends SimpleJWT Custom Obtain Pair Serializer to include extra claims.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['role'] = user.role
        token['email'] = user.email
        return token

    def validate(self, attrs):
        username = attrs.get('username')
        if username:
            if '@' in username:
                try:
                    user_obj = User.objects.get(email__iexact=username)
                    attrs['username'] = user_obj.username
                except User.DoesNotExist:
                    pass
            else:
                try:
                    user_obj = User.objects.get(username__iexact=username)
                    attrs['username'] = user_obj.username
                except User.DoesNotExist:
                    pass

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
        }
        return data


class TeamSerializer(serializers.ModelSerializer):
    leader_name = serializers.ReadOnlyField(source='leader.username')

    class Meta:
        model = Team
        fields = ['id', 'name', 'leader', 'leader_name']


class UserSerializer(serializers.ModelSerializer):
    team_details = TeamSerializer(source='team', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'first_name', 
            'last_name', 
            'role', 
            'team', 
            'team_details',
            'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role', 'team']
        extra_kwargs = {
            'email': {'required': True},
        }

    def create(self, validated_data):
        # We can extract and use accounts services or create user directly
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AssignRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    team_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_team_id(self, value):
        if value is not None and not Team.objects.filter(id=value).exists():
            raise serializers.ValidationError("Team with this ID does not exist.")
        return value


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.ReadOnlyField(source='assignee.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'status',
            'assignee',
            'assignee_name',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
