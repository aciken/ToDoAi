import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Temporarily comment out AsyncStorage if not installed
// import AsyncStorage from '@react-native-async-storage/async-storage';

// Temporarily comment out axios if not installed
// import axios from 'axios';

export default function Signin() {
  const router = useRouter();
  // Remove GlobalContext reference temporarily
  // const { setUser } = useGlobalContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignIn = async () => {
    // For testing purposes, just show an alert
    router.back();
    router.push('/main/Home');
    
    // Uncomment when ready to implement actual signin logic
    /*
    try {
      const response = await axios.post('https://your-api-url/signin', {
        email,
        password
      });
      console.log(response.data);
      console.log(response.status);
      if (response.status === 200) {
        AsyncStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
        router.back();
        router.push('/Home');
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
    */
    
    // For now, just navigate back

  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Close button */}
      <TouchableOpacity 
        className="absolute top-12 right-6 z-10" 
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={24} color="#333" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Animated.View 
            className="px-6"
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            {/* Welcome Text */}
            <Text className="text-gray-900 text-4xl font-bold mb-2 text-center">
              Welcome back
            </Text>
            <Text className="text-gray-600 text-xl mb-10 text-center">
              Let's get you in to your journal
            </Text>
            
            {/* Input Fields */}
            <View className="mb-3">
              <TextInput
                className="bg-gray-100 text-gray-900 py-3 px-5 rounded-full text-base"
                placeholder="Your Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View className="mb-2">
              <TextInput
                className="bg-gray-100 text-gray-900 py-3 px-5 rounded-full text-base"
                placeholder="Your Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            {/* Forgot Password */}
            <TouchableOpacity className="mb-8">
              <Text className="text-gray-500 text-center">
                Forgot password?
              </Text>
            </TouchableOpacity>
            
            {/* Sign In Button */}
            <TouchableOpacity 
              className="bg-gray-900 py-3 rounded-full mb-6"
              onPress={handleSignIn}
            >
              <Text className="text-white text-center text-base font-semibold">
                Sign in
              </Text>
            </TouchableOpacity>
            
            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text className="text-gray-500 mx-4">or</Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>
            
            {/* Continue with Google */}
            <TouchableOpacity 
              className="bg-gray-200 py-3 rounded-full mb-6 flex-row justify-center items-center"
            >
              <Ionicons name="logo-google" size={18} color="#333" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 text-center text-base">
                Continue with Google
              </Text>
            </TouchableOpacity>
            
            {/* Don't have an account */}
            <TouchableOpacity 
              className="mb-8"
              onPress={() => router.push('/modal/signup')}
            >
              <Text className="text-gray-500 text-center">
                Don't have an account? <Text className="text-gray-700">Sign up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
