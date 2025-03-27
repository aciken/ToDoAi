import { View, Text, TouchableOpacity, SafeAreaView, Animated, Image, Dimensions } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');

// Updated icons using Ionicons
const ChartIcon = () => (
  <Ionicons name="analytics-outline" size={22} color="#fff" />
);

const AnalyticsIcon = () => (
  <Ionicons name="bar-chart-outline" size={22} color="#fff" />
);

const PersonalizedIcon = () => (
  <Ionicons name="sparkles-outline" size={22} color="#fff" />
);

export default function WelcomePage() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [hasPhoto, setHasPhoto] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;
  const photoSource = null;

  useEffect(() => {
    checkUser();
    
    // Show loading screen for 1.5 seconds
    setTimeout(() => {
      Animated.timing(loadingFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowLoading(false);
        // Start welcome screen animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1500);
  }, []);

  const checkUser = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        // User exists, route to home
        router.replace('/main/TimelineView');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Loading Screen */}
      {showLoading && (
        <Animated.View 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: loadingFadeAnim,
            zIndex: 1
          }}
        >
          <View className="items-center">
            <View className="w-20 h-20 rounded-full bg-gray-900 items-center justify-center mb-4">
              <Ionicons name="checkmark-done-circle" size={40} color="white" />
            </View>
            <Text className="text-xl font-semibold text-gray-900">ToDoAI</Text>
          </View>
        </Animated.View>
      )}
      
      {/* Welcome Content */}
      <Animated.View 
        className="flex-1 px-6 justify-between"
        style={{ 
          opacity: fadeAnim, 
          transform: [{ translateY: slideAnim }],
          display: showLoading ? 'none' : 'flex'
        }}
      >
        {/* Photo Section - Will be empty if no photo */}
        <View className="items-center mt-12 mb-4">
          {hasPhoto ? (
            <Image
              source={photoSource}
              style={{
                width: width * 0.85,
                height: width * 1.2,
                borderRadius: 20,
              }}
              resizeMode="cover"
            />
          ) : (
            // Empty view when no photo is available
            <View style={{ width: width * 0.85, height: width * 0.5 }} />
          )}
        </View>

        {/* Bottom Section - Welcome Text and Buttons */}
        <View className="w-full items-center mb-10">
          <Text className="text-gray-900 text-4xl font-bold mb-3 text-center">
            Simple Day
          </Text>
          
          <Text className="text-gray-700 text-center text-lg mb-10">
            Organize your day with AI-powered task management. Simple, intuitive, and efficient.
          </Text>
          
          <Link href="/modal/signup" asChild>
            <TouchableOpacity 
              className="bg-gray-900 w-full py-4 rounded-full mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <Text className="text-white text-center text-lg font-semibold">
                Get Started
              </Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/modal/signin" asChild>
            <TouchableOpacity>
              <Text className="text-gray-500 text-center text-base">
                Already have an account?
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
const FeatureItem = ({ icon, title, description }) => (
  <View className="flex-row items-start space-x-4">
    <View className="bg-zinc-800 w-10 h-10 rounded-lg items-center justify-center">
      {icon}
    </View>
    <View className="flex-1">
      <Text className="text-base font-medium text-white mb-1">{title}</Text>
      <Text className="text-zinc-400 text-sm">{description}</Text>
    </View>
  </View>
);

