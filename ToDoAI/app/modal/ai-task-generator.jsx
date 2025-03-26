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

export default function AITaskGenerator() {
  const { user, setUser } = useGlobalContext();
  const [prompt, setPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDate, setGenerationDate] = useState(new Date());
  const [isAddingTasks, setIsAddingTasks] = useState(false);
  const [apiError, setApiError] = useState(null);
  
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
      // Build the enhanced prompt
      const taskCountByDetail = {
        'broad': '4-6',
        'balanced': '6-8',
        'detailed': '8-10'
      };
      
      const taskCountRange = taskCountByDetail[detailLevel];
      
      // Prepare prompt for OpenAI with all customization options
      const fullPrompt = `Generate a detailed personalized to-do list with ${taskCountRange} tasks for: "${prompt}".
Your schedule should start at ${wakeUpTime} (wake up time) and end by ${sleepTime} (sleep time).
${includeBreaks ? 'Include appropriate breaks and meal times.' : 'Focus on productive tasks without breaks.'}
${detailLevel === 'detailed' ? 'Make tasks very specific with clear deliverables.' : 
  detailLevel === 'broad' ? 'Keep tasks broader and higher-level.' : 
  'Balance between specific and broader tasks.'}

Format as a JSON array of objects, each with "text" and "time" properties.
- "text" should be clear, actionable task descriptions
- "time" should be in 24-hour format (HH:MM) between ${wakeUpTime} and ${sleepTime}
- Arrange tasks in chronological order
- Use realistic time durations for each task
- Add context to make tasks meaningful
- Include morning routine and evening wind-down activities

Example: [{"text": "Morning meditation and goal setting", "time": "07:00"}, {"text": "Check emails and prioritize day's work", "time": "09:30"}]`;

      // Use the openai client that's already initialized with env API key
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a personal productivity assistant specializing in creating thoughtful, realistic daily schedules. Consider the user's needs and create an optimal plan for their day."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
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
        time: task.time || "09:00"
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
  
  // Add selected tasks to the to-do list
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
        completed: false,
        date: formatDate(generationDate),
        time: task.time,
        timestamp: new Date(`${formatDate(generationDate)}T${task.time}`).getTime(),
        isAIGenerated: true // Mark as AI-generated
      }));
    
    if (tasksToAdd.length === 0) {
      Alert.alert('No Tasks Selected', 'Please select at least one task to add.');
      return;
    }
    
    setIsAddingTasks(true);
    
    axios.put('https://809a-109-245-199-118.ngrok-free.app/addaitasks', {
      userID: user._id,
      tasks: tasksToAdd
    })
    .then(response => {

      if(response.status === 200){
        setUser(response.data);
        AsyncStorage.setItem('user', JSON.stringify(response.data));
      router.back();
      router.navigate({
        pathname: "/main/Home",
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
            
            {/* Illustration */}
            {!generatedTasks.length && !isGenerating && (
              <View className="items-center mb-8">
                <View className="w-36 h-36 bg-gray-200 rounded-full items-center justify-center mb-4">
                  <Ionicons name="bulb" size={64} color="#333" />
                </View>
                <Text className="text-center text-lg font-semibold text-gray-800 mb-1">
                  AI Task Generator
                </Text>
                <Text className="text-center text-gray-600 px-8 mb-4">
                  Describe your day or pick a template and let AI create a personalized to-do list
                </Text>
              </View>
            )}
            
            {/* Prompt Input and Options */}
            {(!generatedTasks.length || isGenerating) && (
              <View className="mb-6">
                {/* Template Selection */}
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">Quick Templates</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                    {PRESETS.map(preset => (
                      <TouchableOpacity 
                        key={preset.id}
                        className={`mr-3 py-2 px-3 rounded-full flex-row items-center ${
                          selectedPreset === preset.id ? 'bg-black' : 'bg-white border border-gray-200'
                        }`}
                        onPress={() => handlePresetSelect(preset.id)}
                      >
                        <Ionicons 
                          name={preset.icon} 
                          size={16} 
                          color={selectedPreset === preset.id ? '#fff' : '#666'} 
                          style={{ marginRight: 6 }}
                        />
                        <Text className={`${
                          selectedPreset === preset.id ? 'text-white' : 'text-gray-700'
                        } font-medium`}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Day Description */}
                <View className="mb-4">
                  <View className="flex-row mb-2 items-center">
                    <Ionicons name="text" size={18} color="#666" style={{ marginRight: 6 }} />
                    <Text className="text-gray-700 font-medium">Describe Your Day</Text>
                  </View>
                  <TextInput
                    className="bg-white border border-gray-200 text-gray-800 py-3 px-4 rounded-xl text-base shadow-sm"
                    placeholder="e.g., 'A productive work day with focus time' or 'A relaxing self-care day'"
                    placeholderTextColor="#999"
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline={true}
                    numberOfLines={3}
                    autoFocus={!isGenerating}
                    editable={!isGenerating}
                  />
                </View>
                
                {/* Date Selection */}
                <View className="mb-4">
                  <View className="flex-row mb-2 items-center">
                    <Ionicons name="calendar" size={18} color="#666" style={{ marginRight: 6 }} />
                    <Text className="text-gray-700 font-medium">For which day?</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity 
                      className={`py-2 px-4 rounded-full mr-2 ${generationDate.getDate() === new Date().getDate() ? 'bg-black' : 'bg-white border border-gray-200'}`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setGenerationDate(new Date());
                      }}
                    >
                      <Text className={`${generationDate.getDate() === new Date().getDate() ? 'text-white' : 'text-gray-700'}`}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className={`py-2 px-4 rounded-full mr-2 ${
                        generationDate.getDate() === new Date().getDate() + 1 ? 'bg-black' : 'bg-white border border-gray-200'
                      }`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setGenerationDate(tomorrow);
                      }}
                    >
                      <Text className={`${
                        generationDate.getDate() === new Date().getDate() + 1 ? 'text-white' : 'text-gray-700'
                      }`}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="py-2 px-4 rounded-full bg-white border border-gray-200"
                      onPress={() => {
                        Haptics.selectionAsync();
                        // Open date picker or calendar modal
                      }}
                    >
                      <Text className="text-gray-700">Choose</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Advanced Options */}
                <View className="mb-4">
                  <TouchableOpacity className="flex-row mb-2 items-center" onPress={() => setShowAdvanced(!showAdvanced)}>
                    <Ionicons name="options" size={18} color="#666" style={{ marginRight: 6 }} />
                    <Text className="text-gray-700 font-medium">Customization Options</Text>
                  </TouchableOpacity>
                  
                  {/* Task Detail Level */}
                  <View className="mb-3 bg-white p-3 rounded-xl border border-gray-200">
                    <Text className="text-gray-700 mb-2">Task Detail Level:</Text>
                    <View className="flex-row justify-between">
                      {TASK_DETAIL_LEVELS.map(level => (
                        <TouchableOpacity
                          key={level.id}
                          className={`flex-1 p-2 mr-2 rounded-lg items-center ${
                            detailLevel === level.id ? 'bg-gray-100 border border-gray-300' : 'bg-white border border-gray-200'
                          }`}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setDetailLevel(level.id);
                          }}
                        >
                          <Text className={`${detailLevel === level.id ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                            {level.name}
                          </Text>
                          <Text className="text-gray-500 text-xs text-center mt-1">{level.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Time Range */}
                  <View className="mb-3 bg-white p-3 rounded-xl border border-gray-200">
                    <Text className="text-gray-700 mb-2">Daily Schedule:</Text>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1 mr-3">
                        <Text className="text-gray-500 text-xs mb-1">Wake Up</Text>
                        <TouchableOpacity 
                          className="bg-gray-100 py-2 px-3 rounded-lg border border-gray-200"
                          onPress={() => {
                            Haptics.selectionAsync();
                            openTimePicker('wakeUp');
                          }}
                        >
                          <Text className="text-gray-700 text-center">{wakeUpTime}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text className="text-gray-500">to</Text>
                      <View className="flex-1 ml-3">
                        <Text className="text-gray-500 text-xs mb-1">Sleep</Text>
                        <TouchableOpacity 
                          className="bg-gray-100 py-2 px-3 rounded-lg border border-gray-200"
                          onPress={() => {
                            Haptics.selectionAsync();
                            openTimePicker('sleep');
                          }}
                        >
                          <Text className="text-gray-700 text-center">{sleepTime}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  
                  {/* Include Breaks Toggle */}
                  <TouchableOpacity 
                    className="mb-3 bg-white p-3 rounded-xl border border-gray-200 flex-row justify-between items-center"
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIncludeBreaks(!includeBreaks);
                    }}
                  >
                    <Text className="text-gray-700">Include Breaks & Meals:</Text>
                    <View className={`w-6 h-6 rounded-full ${includeBreaks ? 'bg-green-500' : 'bg-gray-300'} items-center justify-center`}>
                      {includeBreaks && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                
                {/* Error message if API call fails */}
                {apiError && (
                  <View className="mt-2 p-3 bg-red-50 rounded-xl border border-red-200">
                    <Text className="text-red-600 text-sm">{apiError}</Text>
                  </View>
                )}
                
                {/* Generate Button */}
                <TouchableOpacity 
                  className="bg-black py-3 px-4 rounded-xl mt-2 shadow-sm"
                  onPress={generateTasks}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">Generating...</Text>
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
                      Tasks for {getDateLabel(generationDate)}
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
                
                <Text className="text-gray-600 italic mb-4 text-sm">
                  "{prompt}"
                </Text>
                
                <View className="mb-6">
                  {generatedTasks.map((task) => (
                    <TouchableOpacity 
                      key={task.id}
                      className={`flex-row items-center py-3 px-4 ${selectedTasks[task.id] ? 'bg-white' : 'bg-gray-100'} rounded-xl mb-2 border ${selectedTasks[task.id] ? 'border-gray-300' : 'border-gray-200'}`}
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
                        <Text className="text-gray-500 text-xs">
                          <Ionicons name="time-outline" size={12} color="#666" style={{ marginRight: 2 }} />
                          {task.time}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Add to Todo List Button */}
                <TouchableOpacity 
                  className={`bg-black py-3 rounded-xl mb-8 shadow-sm ${isAddingTasks ? 'opacity-70' : ''}`}
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
                    <Text className="text-white text-center font-semibold">
                      Add Selected Tasks to My Day
                    </Text>
                  )}
                </TouchableOpacity>
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
    </SafeAreaView>
  );
} 