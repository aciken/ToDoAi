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
import axios from 'axios';
// Temporarily comment out AsyncStorage if not installed
// import AsyncStorage from '@react-native-async-storage/async-storage';

// Temporarily comment out axios if not installed
// import axios from 'axios';

export default function Signup() {
  // Remove GlobalContext reference temporarily
  // const { setUser } = useGlobalContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
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

  useEffect(() => {
    // Check if passwords match when either password field changes
    if (confirmPassword !== '') {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    

    axios.put('https://809a-109-245-199-118.ngrok-free.app/signup', {
      name,
      email,
      password
    })
    .then((response) => {
      console.log(response.status);
      if(response.status === 200){
        AsyncStorage.setItem('user', JSON.stringify(response.data));
        router.back();
        router.push('/main/TimelineView');
      } else {
        Alert.alert('Error', 'User already exists');
      }
    })
    
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
              Create Account
            </Text>
            <Text className="text-gray-600 text-xl mb-10 text-center">
              Start your journaling journey
            </Text>
            
            {/* Input Fields */}
            <View className="mb-3">
              <TextInput
                className="bg-gray-100 text-gray-900 py-3 px-5 rounded-full text-base"
                placeholder="Your Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            
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
            
            <View className="mb-3">
              <TextInput
                className="bg-gray-100 text-gray-900 py-3 px-5 rounded-full text-base"
                placeholder="Create Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            <View className="mb-2">
              <TextInput
                className={`bg-gray-100 text-gray-900 py-3 px-5 rounded-full text-base ${!passwordsMatch ? 'border border-red-500' : ''}`}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
            
            {/* Password match error */}
            {!passwordsMatch && (
              <Text className="text-red-500 mb-4 ml-2">
                Passwords don't match
              </Text>
            )}
            
            {/* Terms and Privacy */}
            <Text className="text-gray-500 text-center mb-8">
              By signing up, you agree to our{' '}
              <Text className="text-gray-700">Terms of Service</Text> and{' '}
              <Text className="text-gray-700">Privacy Policy</Text>
            </Text>
            
            {/* Sign Up Button */}
            <TouchableOpacity 
              className="bg-gray-900 py-3 rounded-full mb-6"
              onPress={handleSignUp}
            >
              <Text className="text-white text-center text-base font-semibold">
                Create Account
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
            
            {/* Already have an account */}
            <TouchableOpacity 
              className="mb-8"
              onPress={() => router.push('/modal/signin')}
            >
              <Text className="text-gray-500 text-center">
                Already have an account? <Text className="text-gray-700">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
