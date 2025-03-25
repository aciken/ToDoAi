import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Settings() {
  const handleBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const handleSignOut = () => {
    AsyncStorage.removeItem('user');
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={handleBack}
          className="p-2 -ml-2"
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-2">Settings</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Section */}
        <View className="px-4 py-6">
          <View className="flex-row items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center">
              <Ionicons name="person" size={32} color="#666" />
            </View>
            <View className="ml-4">
              <Text className="text-lg font-semibold">John Doe</Text>
              <Text className="text-gray-500">john.doe@example.com</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        <View className="px-4">
          {/* Subscription Status */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-3">SUBSCRIPTION</Text>
            <View className="bg-white rounded-xl border border-gray-200">
              <View className="p-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="diamond-outline" size={20} color="#666" />
                    <Text className="ml-3 text-base">Premium Status</Text>
                  </View>
                  <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-700 text-sm font-medium">Active</Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-500 ml-11">Next billing: March 22, 2024</Text>
              </View>
              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Ionicons name="card-outline" size={20} color="#666" />
                  <Text className="ml-3 text-base">Manage Subscription</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-3">ACCOUNT</Text>
            <View className="bg-white rounded-xl border border-gray-200">
              <TouchableOpacity onPress={handleSignOut} className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text className="ml-3 text-base text-red-500">Sign Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* About */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-3">ABOUT</Text>
            <View className="bg-white rounded-xl border border-gray-200">
              <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="information-circle-outline" size={20} color="#666" />
                  <Text className="ml-3 text-base">About App</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <Text className="ml-3 text-base">Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 