import { View, Text, TouchableOpacity, SafeAreaView, Animated, Image, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  // State to track if we have a photo to display
  const [hasPhoto, setHasPhoto] = useState(false);
  // You can replace this with your actual photo URL or require statement
  const photoSource = null;

  useEffect(() => {
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
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <Animated.View 
        className="flex-1 px-6 justify-between"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
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
            App Name
          </Text>
          
          <Text className="text-gray-700 text-center text-lg mb-10">
            Your app's description goes here. Highlight main features and benefits.
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
