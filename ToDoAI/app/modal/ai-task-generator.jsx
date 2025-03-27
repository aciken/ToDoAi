import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';
import { OpenAI } from "openai";
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

// In React Native with Expo, process.env variables aren't directly accessible
// We need to use Expo's configuration for environment variables
import Constants from 'expo-constants';

// Access the API key from environment variables
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Preset categories
const PRESETS = [
  { id: 'work', name: 'Work Day', icon: 'briefcase' },
  { id: 'learning', name: 'Learning', icon: 'school' },
  { id: 'workout', name: 'Fitness', icon: 'fitness' },
  { id: 'relax', name: 'Self-Care', icon: 'heart' },
  { id: 'social', name: 'Social', icon: 'people' },
  { id: 'creative', name: 'Creative', icon: 'brush' },
  { id: 'errands', name: 'Errands', icon: 'cart' },
  { id: 'travel', name: 'Travel', icon: 'airplane' },
];

// Task granularity options
const TASK_DETAIL_LEVELS = [
  { id: 'broad', name: 'Broad', description: 'Few general tasks' },
  { id: 'balanced', name: 'Balanced', description: 'Mix of general and specific' },
  { id: 'detailed', name: 'Detailed', description: 'Many specific tasks' },
];

// Add new constants for additional options
const ENERGY_LEVELS = [
  { id: 'morning', name: 'Morning', icon: 'sunny', description: 'Most productive in the morning' },
  { id: 'afternoon', name: 'Afternoon', icon: 'partly-sunny', description: 'Peak energy in the afternoon' },
  { id: 'evening', name: 'Evening', icon: 'moon', description: 'Most focused in the evening' },
  { id: 'balanced', name: 'Balanced', icon: 'time', description: 'Consistent energy throughout' }
];

const FOCUS_PREFERENCES = [
  { id: 'deep', name: 'Deep Focus', icon: 'brain', description: 'Long, uninterrupted work sessions' },
  { id: 'pomodoro', name: 'Pomodoro', icon: 'timer', description: '25/5 minute work/break cycles' },
  { id: 'flexible', name: 'Flexible', icon: 'sync', description: 'Adaptable to energy levels' }
];

const MEAL_PREFERENCES = [
  { id: 'regular', name: 'Regular', icon: 'restaurant', description: 'Standard meal times' },
  { id: 'flexible', name: 'Flexible', icon: 'fast-food', description: 'Snack-based throughout day' },
  { id: 'none', name: 'None', icon: 'close-circle', description: 'No meal breaks needed' }
];

export default function AITaskGenerator() {
  const { user, setUser } = useGlobalContext();
  const [prompt, setPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingTasks, setIsAddingTasks] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Preset and customization options
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [detailLevel, setDetailLevel] = useState('balanced');
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [includeBreaks, setIncludeBreaks] = useState(true);
  
  // Add time picker visibility states
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  
  // Add animation state
  const [modalAnimatedValue] = useState(new Animated.Value(0));
  
  // Add new state for additional options
  const [energyLevel, setEnergyLevel] = useState('balanced');
  const [focusPreference, setFocusPreference] = useState('flexible');
  const [mealPreference, setMealPreference] = useState('regular');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Load user data when component mounts
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUser();
  }, []);
  
  // Handle preset selection
  const handlePresetSelect = (preset) => {
    Haptics.selectionAsync();
    setSelectedPreset(preset);
    
    // Auto-populate prompt based on preset
    let presetPrompt = '';
    switch(preset) {
      case 'work':
        presetPrompt = 'A productive workday with meetings and focused time';
        break;
      case 'learning':
        presetPrompt = 'A day focused on learning and studying new topics';
        break;
      case 'workout':
        presetPrompt = 'A fitness-focused day with exercise and healthy meals';
        break;
      case 'relax':
        presetPrompt = 'A relaxing self-care day to recharge';
        break;
      case 'social':
        presetPrompt = 'A social day catching up with friends and family';
        break;
      case 'creative':
        presetPrompt = 'A creative day focused on artistic projects';
        break;
      case 'errands':
        presetPrompt = 'A day to get errands and chores done';
        break;
      case 'travel':
        presetPrompt = 'A day trip or travel itinerary';
        break;
      default:
        presetPrompt = '';
    }
    setPrompt(presetPrompt);
  };
  
  // Generate tasks using OpenAI API
  const generateTasks = async () => {
    if (prompt.trim() === '') {
      Alert.alert('Error', 'Please enter a description for your day or select a preset.');
      return;
    }
    
    setIsGenerating(true);
    setApiError(null);
    
    try {
      const taskCountByDetail = {
        'broad': '4-6',
        'balanced': '6-8',
        'detailed': '8-10'
      };
      
      const taskCountRange = taskCountByDetail[detailLevel];
      
      const fullPrompt = `As a personal productivity assistant, create a realistic and well-structured daily schedule for: "${prompt}".

Key Requirements:
1. Schedule starts at ${wakeUpTime} and ends by ${sleepTime}
2. Generate ${taskCountRange} tasks that are:
   - Realistic and achievable
   - Include clear, actionable descriptions
   - Have appropriate durations (30, 60, 90, 120, 180 minutes)
   - Follow a logical sequence
3. Energy Level: ${ENERGY_LEVELS.find(l => l.id === energyLevel).name}
   - ${ENERGY_LEVELS.find(l => l.id === energyLevel).description}
4. Focus Style: ${FOCUS_PREFERENCES.find(f => f.id === focusPreference).name}
   - ${FOCUS_PREFERENCES.find(f => f.id === focusPreference).description}
5. Meal Schedule: ${MEAL_PREFERENCES.find(m => m.id === mealPreference).name}
   - ${MEAL_PREFERENCES.find(m => m.id === mealPreference).description}
6. ${includeBreaks ? 'Include appropriate breaks between tasks.' : 'Focus on productive tasks without breaks.'}
7. ${detailLevel === 'detailed' ? 'Break down tasks into specific, actionable steps.' : 
  detailLevel === 'broad' ? 'Keep tasks high-level and flexible.' : 
  'Balance between specific and broader tasks.'}

Format the response as a JSON array of task objects with these properties:
{
  "text": "Clear, actionable task description",
  "startTime": "HH:MM in 24-hour format",
  "duration": duration in minutes (30, 60, 90, 120, 180, etc.),
  "completed": false
}`;

      // Use the openai client that's already initialized with env API key
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert personal productivity assistant specializing in creating realistic, well-structured daily schedules. Consider human factors like energy levels, focus time, and natural breaks when planning tasks. Ensure tasks are achievable and follow a logical sequence."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract and parse the JSON response
      const rawContent = completion.choices[0].message.content.trim();
      let jsonContent = rawContent;
      
      // Handle case where API returns markdown code blocks
      if (rawContent.includes("```json")) {
        jsonContent = rawContent.split("```json")[1].split("```")[0].trim();
      } else if (rawContent.includes("```")) {
        jsonContent = rawContent.split("```")[1].split("```")[0].trim();
      }
      
      // Parse JSON and convert to task objects
      const parsedTasks = JSON.parse(jsonContent);
      
      const tasks = parsedTasks.map((task, index) => ({
        id: `ai-${Date.now()}-${index}`,
        text: task.text,
        startTime: task.startTime || "09:00",
        duration: task.duration || 60,
        completed: false
      }));
      
      setGeneratedTasks(tasks);
      
      // Initialize all tasks as selected
      const initialSelected = {};
      tasks.forEach(task => {
        initialSelected[task.id] = true;
      });
      setSelectedTasks(initialSelected);
      
    } catch (error) {
      console.error('Error generating tasks with OpenAI:', error);
      setApiError(
        'Failed to generate tasks. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Format date to YYYY-MM-DD format
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };
  
  // Toggle task selection
  const toggleTaskSelection = (id) => {
    Haptics.selectionAsync();
    setSelectedTasks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Get a friendly date description
  const getDateLabel = (date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      return 'Today';
    } else if (
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()
    ) {
      return 'Tomorrow';
    } else {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    }
  };
  
  // Update addSelectedTasks function to use selectedDate
  const addSelectedTasks = async () => {
    if (!user) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const tasksToAdd = generatedTasks
      .filter(task => selectedTasks[task.id])
      .map(task => ({
        id: Date.now() + Math.random().toString(),
        text: task.text,
        startTime: task.startTime || "09:00",
        duration: task.duration || 60,
        completed: false,
        date: formatDate(selectedDate)
      }));
    
    if (tasksToAdd.length === 0) {
      Alert.alert('No Tasks Selected', 'Please select at least one task to add.');
      return;
    }
    
    setIsAddingTasks(true);
    
    axios.put('https://4c00-109-245-199-118.ngrok-free.app/addaitasks', {
      userID: user._id,
      tasks: tasksToAdd
    })
    .then(response => {
      if(response.status === 200){
        setUser(response.data);
        AsyncStorage.setItem('user', JSON.stringify(response.data));
        router.back();
        router.navigate({
          pathname: "/main/TimelineView",
        });
      }
    })
    .catch(error => {
      console.error('Error adding AI tasks:', error);
    });
  };
  
  // Determine if we should show the overlay gradient
  const showOverlay = isGenerating || generatedTasks.length > 0;
  
  // Parse time string to Date object for the time picker
  const parseTimeToDate = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Format time from date object
  const formatTimeFromDate = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle wake up time change
  const onWakeUpTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      Haptics.selectionAsync();
      setWakeUpTime(formatTimeFromDate(selectedDate));
    }
  };

  // Handle sleep time change
  const onSleepTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      Haptics.selectionAsync();
      setSleepTime(formatTimeFromDate(selectedDate));
    }
  };
  
  // Close wake up time picker
  const closeWakeUpPicker = () => {
    Animated.timing(modalAnimatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowWakeUpPicker(false);
    });
  };
  
  // Close sleep time picker
  const closeSleepPicker = () => {
    Animated.timing(modalAnimatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowSleepPicker(false);
    });
  };
  
  // Open time picker with animation
  const openTimePicker = (pickerType) => {
    Haptics.selectionAsync();
    
    if (pickerType === 'wakeUp') {
      setShowWakeUpPicker(true);
    } else {
      setShowSleepPicker(true);
    }
    
    // Reset animation values
    modalAnimatedValue.setValue(0);
    
    // Start animations
    Animated.timing(modalAnimatedValue, {
      toValue: 2,
      duration: 400,
      useNativeDriver: true
    }).start();
  };
  
  // Render time picker modal
  const renderTimePicker = (visible, time, onChange, onClose, title) => {
    if (!visible) return null;
    
    // Calculate animation values
    const modalScale = modalAnimatedValue.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0.8, 1.05, 1]
    });
    
    const modalOpacity = modalAnimatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1]
    });

    const backdropOpacity = modalAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6]
    });
    
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          opacity: backdropOpacity
        }} />
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1} 
          onPress={onClose}
        />
        <Animated.View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          width: '85%',
          maxWidth: 320,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
          transform: [{ scale: modalScale }],
          opacity: modalOpacity,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#333',
            }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={parseTimeToDate(time)}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={onChange}
            style={{ height: 150, width: '100%' }}
            textColor="#333"
          />
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: 'black',
              paddingVertical: 12,
              borderRadius: 12,
            }}
            onPress={onClose}
          >
            <Text style={{
              color: 'white',
              textAlign: 'center',
              fontWeight: '500',
            }}>Confirm</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 relative">
          {/* Background Decoration */}
          <View className="absolute top-0 right-0 w-48 h-48 bg-gray-200 rounded-full opacity-20 -mr-16 -mt-16" />
          <View className="absolute bottom-0 left-0 w-64 h-64 bg-gray-200 rounded-full opacity-20 -ml-24 -mb-24" />
          
          <ScrollView className="flex-1 px-6 pt-8">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
              >
                <Ionicons name="arrow-back" size={22} color="#333" />
              </TouchableOpacity>
              <Text className="text-gray-900 text-xl font-bold">AI Task Planner</Text>
              <View className="h-10 w-10" />
            </View>
            
            {/* Prompt Input and Options */}
            {(!generatedTasks.length || isGenerating) && (
              <View className="mb-6">
                {/* Main Input Card */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-4">
                      <Ionicons name="sparkles" size={24} color="#fff" />
                    </View>
                    <View>
                      <Text className="text-2xl font-bold text-gray-900">Plan Your Day</Text>
                      <Text className="text-gray-500">Let AI help you organize</Text>
                    </View>
                  </View>

                  <TextInput
                    className="text-gray-800 text-lg mb-4"
                    placeholder="What kind of day do you want to plan?"
                    placeholderTextColor="#999"
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline={true}
                    numberOfLines={2}
                    autoFocus={!isGenerating}
                    editable={!isGenerating}
                  />

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row space-x-2">
                      <TouchableOpacity className="p-2 rounded-full bg-gray-100">
                        <Ionicons name="mic" size={18} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity className="p-2 rounded-full bg-gray-100">
                        <Ionicons name="image" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <Text className="text-gray-400 text-sm">{prompt.length}/200</Text>
                  </View>
                </View>

                {/* Templates Grid */}
                <View className="mb-6">
                  <Text className="text-gray-900 font-medium mb-3">Quick Templates</Text>
                  <View className="flex-row flex-wrap justify-between">
                    {PRESETS.map(preset => (
                      <TouchableOpacity 
                        key={preset.id}
                        className={`w-[48%] mb-3 p-4 rounded-2xl ${
                          selectedPreset === preset.id ? 'bg-black' : 'bg-gray-100'
                        }`}
                        onPress={() => handlePresetSelect(preset.id)}
                      >
                        <View className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                          selectedPreset === preset.id ? 'bg-white' : 'bg-white/80'
                        }`}>
                          <Ionicons 
                            name={preset.icon} 
                            size={20} 
                            color={selectedPreset === preset.id ? '#000' : '#666'} 
                          />
                        </View>
                        <Text className={`${
                          selectedPreset === preset.id ? 'text-white' : 'text-gray-900'
                        } font-medium`}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Settings Card */}
                <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-gray-900 font-medium">Schedule Settings</Text>
                    <TouchableOpacity 
                      className="p-2 rounded-full bg-gray-100"
                      onPress={() => {
                        Haptics.selectionAsync();
                        setShowAdvancedOptions(!showAdvancedOptions);
                      }}
                    >
                      <Ionicons 
                        name={showAdvancedOptions ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity 
                      className="flex-1 bg-gray-100 py-3 px-4 rounded-xl mr-2"
                      onPress={() => openTimePicker('wakeUp')}
                    >
                      <Text className="text-gray-500 text-xs mb-1">Wake Up</Text>
                      <Text className="text-gray-900 font-medium">{wakeUpTime}</Text>
                    </TouchableOpacity>
                    <View className="w-8 h-0.5 bg-gray-300" />
                    <TouchableOpacity 
                      className="flex-1 bg-gray-100 py-3 px-4 rounded-xl ml-2"
                      onPress={() => openTimePicker('sleep')}
                    >
                      <Text className="text-gray-500 text-xs mb-1">Sleep</Text>
                      <Text className="text-gray-900 font-medium">{sleepTime}</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between mb-4">
                    {TASK_DETAIL_LEVELS.map(level => (
                      <TouchableOpacity
                        key={level.id}
                        className={`flex-1 py-2 px-3 rounded-lg mr-2 ${
                          detailLevel === level.id ? 'bg-black' : 'bg-gray-100'
                        }`}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDetailLevel(level.id);
                        }}
                      >
                        <Text className={`${
                          detailLevel === level.id ? 'text-white' : 'text-gray-900'
                        } text-sm font-medium text-center`}>
                          {level.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {showAdvancedOptions && (
                    <>
                      {/* Energy Level */}
                      <View className="mb-4">
                        <Text className="text-gray-700 text-sm mb-2">Energy Level</Text>
                        <View className="flex-row flex-wrap justify-between">
                          {ENERGY_LEVELS.map(level => (
                            <TouchableOpacity
                              key={level.id}
                              className={`w-[48%] mb-2 p-3 rounded-xl ${
                                energyLevel === level.id ? 'bg-black' : 'bg-gray-100'
                              }`}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setEnergyLevel(level.id);
                              }}
                            >
                              <View className="flex-row items-center mb-1">
                                <Ionicons 
                                  name={level.icon} 
                                  size={16} 
                                  color={energyLevel === level.id ? '#fff' : '#666'} 
                                />
                                <Text className={`${
                                  energyLevel === level.id ? 'text-white' : 'text-gray-900'
                                } text-sm font-medium ml-1`}>
                                  {level.name}
                                </Text>
                              </View>
                              <Text className={`${
                                energyLevel === level.id ? 'text-gray-300' : 'text-gray-500'
                              } text-xs`}>
                                {level.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Focus Preference */}
                      <View className="mb-4">
                        <Text className="text-gray-700 text-sm mb-2">Focus Style</Text>
                        <View className="flex-row flex-wrap justify-between">
                          {FOCUS_PREFERENCES.map(pref => (
                            <TouchableOpacity
                              key={pref.id}
                              className={`w-[48%] mb-2 p-3 rounded-xl ${
                                focusPreference === pref.id ? 'bg-black' : 'bg-gray-100'
                              }`}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setFocusPreference(pref.id);
                              }}
                            >
                              <View className="flex-row items-center mb-1">
                                <Ionicons 
                                  name={pref.icon} 
                                  size={16} 
                                  color={focusPreference === pref.id ? '#fff' : '#666'} 
                                />
                                <Text className={`${
                                  focusPreference === pref.id ? 'text-white' : 'text-gray-900'
                                } text-sm font-medium ml-1`}>
                                  {pref.name}
                                </Text>
                              </View>
                              <Text className={`${
                                focusPreference === pref.id ? 'text-gray-300' : 'text-gray-500'
                              } text-xs`}>
                                {pref.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Meal Preference */}
                      <View className="mb-4">
                        <Text className="text-gray-700 text-sm mb-2">Meal Schedule</Text>
                        <View className="flex-row flex-wrap justify-between">
                          {MEAL_PREFERENCES.map(pref => (
                            <TouchableOpacity
                              key={pref.id}
                              className={`w-[48%] mb-2 p-3 rounded-xl ${
                                mealPreference === pref.id ? 'bg-black' : 'bg-gray-100'
                              }`}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setMealPreference(pref.id);
                              }}
                            >
                              <View className="flex-row items-center mb-1">
                                <Ionicons 
                                  name={pref.icon} 
                                  size={16} 
                                  color={mealPreference === pref.id ? '#fff' : '#666'} 
                                />
                                <Text className={`${
                                  mealPreference === pref.id ? 'text-white' : 'text-gray-900'
                                } text-sm font-medium ml-1`}>
                                  {pref.name}
                                </Text>
                              </View>
                              <Text className={`${
                                mealPreference === pref.id ? 'text-gray-300' : 'text-gray-500'
                              } text-xs`}>
                                {pref.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Generate Button */}
                <TouchableOpacity 
                  className={`bg-black py-4 rounded-2xl shadow-sm flex-row justify-center items-center ${
                    isGenerating ? 'opacity-70' : ''
                  }`}
                  onPress={generateTasks}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">Generating Tasks...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="flash" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">Generate Tasks</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {/* Generated Tasks */}
            {generatedTasks.length > 0 && !isGenerating && (
              <View className="mt-2">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="list" size={18} color="#666" style={{ marginRight: 6 }} />
                    <Text className="text-gray-800 font-semibold">
                      Generated Tasks
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGeneratedTasks([]);
                      setSelectedTasks({});
                    }}
                    className="bg-gray-200 rounded-full p-2"
                  >
                    <Ionicons name="refresh" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-600 text-sm mb-2">Your request:</Text>
                  <Text className="text-gray-800 italic">
                    "{prompt}"
                  </Text>
                </View>
                
                <View className="mb-6">
                  {generatedTasks.map((task, index) => (
                    <TouchableOpacity 
                      key={task.id}
                      className={`flex-row items-center py-4 px-4 ${selectedTasks[task.id] ? 'bg-white' : 'bg-gray-50'} rounded-xl mb-3 border ${selectedTasks[task.id] ? 'border-gray-300' : 'border-gray-200'}`}
                      onPress={() => toggleTaskSelection(task.id)}
                    >
                      <View className={`h-5 w-5 rounded-full mr-3 border items-center justify-center ${
                        selectedTasks[task.id] ? 'border-black bg-black' : 'border-gray-400 bg-transparent'
                      }`}>
                        {selectedTasks[task.id] && (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      
                      <View className="flex-1">
                        <Text className={`text-base ${selectedTasks[task.id] ? 'text-gray-800' : 'text-gray-500'}`}>
                          {task.text}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full mr-2">
                            <Ionicons name="time-outline" size={12} color="#666" style={{ marginRight: 4 }} />
                            <Text className="text-gray-600 text-xs">{task.startTime}</Text>
                          </View>
                          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full">
                            <Ionicons name="hourglass-outline" size={12} color="#666" style={{ marginRight: 4 }} />
                            <Text className="text-gray-600 text-xs">{task.duration} min</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Date Selection and Add to Todo List Button */}
                <View className="mb-8">
                  <TouchableOpacity 
                    className="bg-white py-4 px-4 rounded-xl mb-4 border border-gray-200 flex-row justify-between items-center"
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowDatePicker(true);
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={20} color="#666" style={{ marginRight: 8 }} />
                      <Text className="text-gray-800 font-medium">Add tasks for</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 mr-2">{getDateLabel(selectedDate)}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#666" />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    className={`bg-black py-4 rounded-xl shadow-sm ${isAddingTasks ? 'opacity-70' : ''}`}
                    onPress={addSelectedTasks}
                    disabled={isAddingTasks}
                  >
                    {isAddingTasks ? (
                      <View className="flex-row justify-center items-center">
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white text-center font-semibold">
                          Adding Tasks...
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row justify-center items-center">
                        <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white text-center font-semibold">
                          Add Selected Tasks to My Day
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Time Picker Modals */}
      {renderTimePicker(
        showWakeUpPicker, 
        wakeUpTime, 
        onWakeUpTimeChange, 
        closeWakeUpPicker,
        "Set Wake Up Time"
      )}
      
      {renderTimePicker(
        showSleepPicker, 
        sleepTime, 
        onSleepTimeChange, 
        closeSleepPicker,
        "Set Sleep Time"
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            width: '85%',
            maxWidth: 320,
            padding: 16,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#333',
              }}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  Haptics.selectionAsync();
                  setSelectedDate(date);
                }
              }}
              minimumDate={new Date()}
              style={{ height: 150, width: '100%' }}
              textColor="#333"
            />
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: 'black',
                paddingVertical: 12,
                borderRadius: 12,
              }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{
                color: 'white',
                textAlign: 'center',
                fontWeight: '500',
              }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
} 