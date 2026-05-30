from rest_framework import serializers
from .models import User, Vendor
from django.contrib.auth import authenticate

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['uid', 'name', 'description']

class UserSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'uid', 'username', 'email', 'phone', 'role', 'vendor', 'is_active']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    vendor_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'vendor_name']

    def create(self, validated_data):
        vendor_name = validated_data.pop('vendor_name', None)
        vendor = None
        if vendor_name:
            vendor, _ = Vendor.objects.get_or_create(name=vendor_name)
            
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            vendor=vendor
        )
        # Default role is 'admin' for the first user of a vendor, otherwise 'agent'
        if vendor and vendor.users.count() == 1:
            user.role = 'admin'
        else:
            user.role = 'agent'
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
