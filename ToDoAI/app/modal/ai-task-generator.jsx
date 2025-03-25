import React, { useState } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';

export default function AITaskGenerator() {
  const { user, setUser } = useGlobalContext();
  const [prompt, setPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDate, setGenerationDate] = useState(new Date());
  
  // Mocked AI-generated tasks (in a real app, this would call an API)
  const generateTasks = () => {
    if (prompt.trim() === '') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Example task generation based on different prompts
      let tasks = [];
      const lowerPrompt = prompt.toLowerCase();
      
      if (lowerPrompt.includes('work') || lowerPrompt.includes('productive')) {
        tasks = [
          { id: '1', text: 'Review quarterly goals and progress', time: '09:00' },
          { id: '2', text: 'Prepare presentation for team meeting', time: '10:30' },
          { id: '3', text: 'Check and respond to important emails', time: '11:45' },
          { id: '4', text: 'Team lunch discussion about new project', time: '12:30' },
          { id: '5', text: 'Brainstorming session for marketing strategy', time: '14:00' },
          { id: '6', text: 'Update project management board', time: '15:30' },
          { id: '7', text: 'One-on-one meeting with team member', time: '16:15' },
          { id: '8', text: 'Plan tomorrow\'s priorities', time: '17:30' }
        ];
      } else if (lowerPrompt.includes('health') || lowerPrompt.includes('wellness') || lowerPrompt.includes('fitness')) {
        tasks = [
          { id: '1', text: 'Morning meditation and stretching', time: '07:00' },
          { id: '2', text: 'Prepare healthy breakfast with protein', time: '07:30' },
          { id: '3', text: 'Take vitamins and supplements', time: '08:00' },
          { id: '4', text: '30-minute cardio workout', time: '12:00' },
          { id: '5', text: 'Prepare nutrient-rich lunch', time: '13:00' },
          { id: '6', text: 'Take a walking break outside', time: '15:00' },
          { id: '7', text: 'Strength training session', time: '17:30' },
          { id: '8', text: 'Evening yoga and relaxation', time: '20:00' }
        ];
      } else if (lowerPrompt.includes('relax') || lowerPrompt.includes('self-care') || lowerPrompt.includes('day off')) {
        tasks = [
          { id: '1', text: 'Sleep in and wake up naturally', time: '08:30' },
          { id: '2', text: 'Enjoy a slow morning coffee or tea', time: '09:00' },
          { id: '3', text: 'Read a few chapters of your book', time: '10:30' },
          { id: '4', text: 'Take a long, relaxing bath', time: '11:30' },
          { id: '5', text: 'Prepare a simple but delicious lunch', time: '13:00' },
          { id: '6', text: 'Watch an episode of your favorite show', time: '14:30' },
          { id: '7', text: 'Go for a leisurely walk outside', time: '16:00' },
          { id: '8', text: 'Order dinner from your favorite restaurant', time: '18:30' }
        ];
      } else if (lowerPrompt.includes('creative') || lowerPrompt.includes('art') || lowerPrompt.includes('hobby')) {
        tasks = [
          { id: '1', text: 'Morning journaling and idea generation', time: '08:00' },
          { id: '2', text: 'Sketch or doodle while enjoying coffee', time: '09:15' },
          { id: '3', text: 'Research inspiration for your project', time: '10:30' },
          { id: '4', text: 'Work on your creative project', time: '11:45' },
          { id: '5', text: 'Take a break to rest your creative mind', time: '13:30' },
          { id: '6', text: 'Visit a gallery or creative space online', time: '14:45' },
          { id: '7', text: 'Continue your creative project', time: '16:00' },
          { id: '8', text: 'Reflect on today\'s creative progress', time: '18:30' }
        ];
      } else if (lowerPrompt.includes('weekend') || lowerPrompt.includes('fun') || lowerPrompt.includes('social')) {
        tasks = [
          { id: '1', text: 'Brunch with friends at the new café', time: '10:30' },
          { id: '2', text: 'Visit the farmer\'s market', time: '12:00' },
          { id: '3', text: 'Check out the exhibition at the local gallery', time: '14:00' },
          { id: '4', text: 'Coffee and dessert at your favorite spot', time: '15:30' },
          { id: '5', text: 'Pick up flowers or plants for your home', time: '16:30' },
          { id: '6', text: 'Prepare for evening dinner party', time: '17:30' },
          { id: '7', text: 'Host friends for dinner and games', time: '19:00' },
          { id: '8', text: 'Wind down with a movie or show', time: '22:00' }
        ];
      } else {
        // Default balanced day
        tasks = [
          { id: '1', text: 'Morning meditation and planning', time: '07:30' },
          { id: '2', text: 'Check and respond to important emails', time: '09:00' },
          { id: '3', text: 'Work on primary project', time: '10:30' },
          { id: '4', text: 'Lunch break and short walk', time: '12:30' },
          { id: '5', text: 'Team meeting or collaboration', time: '14:00' },
          { id: '6', text: 'Complete administrative tasks', time: '15:30' },
          { id: '7', text: 'Exercise or fitness activity', time: '17:30' },
          { id: '8', text: 'Evening relaxation and preparation for tomorrow', time: '20:00' }
        ];
      }
      
      setGeneratedTasks(tasks);
      
      // Initialize all tasks as selected
      const initialSelected = {};
      tasks.forEach(task => {
        initialSelected[task.id] = true;
      });
      setSelectedTasks(initialSelected);
      
      setIsGenerating(false);
    }, 2000); // 2 second delay to simulate AI thinking
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
  const addSelectedTasks = () => {
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
    
    if (tasksToAdd.length === 0) return;

    console.log(tasksToAdd);

    axios.put('https://a0fb-109-245-199-118.ngrok-free.app/addaitasks', {
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
    

    // Navigate back and pass tasks to home screen

  };
  
  // Determine if we should show the overlay gradient
  const showOverlay = isGenerating || generatedTasks.length > 0;

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
                  Describe your day and let AI create a personalized to-do list for you
                </Text>
              </View>
            )}
            
            {/* Prompt Input */}
            {(!generatedTasks.length || isGenerating) && (
              <View className="mb-6">
                <View className="flex-row mb-2 items-center">
                  <Ionicons name="text" size={18} color="#666" style={{ marginRight: 6 }} />
                  <Text className="text-gray-700 font-medium">What's your day about?</Text>
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
                
                {/* Date Selection */}
                <View className="mt-4 mb-6">
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
                      className={`py-2 px-4 rounded-full ${
                        generationDate.getDate() !== new Date().getDate() && 
                        generationDate.getDate() !== new Date().getDate() + 1 ? 'bg-black' : 'bg-white border border-gray-200'
                      }`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const customDate = new Date();
                        customDate.setDate(customDate.getDate() + 2); // Example: day after tomorrow
                        setGenerationDate(customDate);
                      }}
                    >
                      <Text className={`${
                        generationDate.getDate() !== new Date().getDate() && 
                        generationDate.getDate() !== new Date().getDate() + 1 ? 'text-white' : 'text-gray-700'
                      }`}>Custom</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Generate Button */}
                <TouchableOpacity 
                  className={`py-3 px-6 rounded-xl flex-row justify-center items-center shadow-sm ${prompt.trim() === '' || isGenerating ? 'bg-gray-300' : 'bg-black'}`}
                  onPress={generateTasks}
                  disabled={prompt.trim() === '' || isGenerating}
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
                  className="bg-black py-3 rounded-xl mb-8 shadow-sm"
                  onPress={addSelectedTasks}
                >
                  <Text className="text-white text-center font-semibold">
                    Add Selected Tasks to My Day
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 