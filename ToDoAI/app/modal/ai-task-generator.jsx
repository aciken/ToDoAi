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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';
import { OpenAI } from "openai";
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function AITaskGenerator() {
  const { user, setUser } = useGlobalContext();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('generate'); // 'generate' or 'ask'
  const [response, setResponse] = useState(null);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const generateTasks = async () => {
    if (prompt.trim() === '') {
      Alert.alert('Error', 'Please enter a description for your tasks.');
      return;
    }
    
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert personal productivity assistant. Generate realistic, actionable tasks based on the user's description.
            IMPORTANT: Your response must be a valid JSON array of task objects with this exact format:
            [
              {
                "text": "Task description",
                "startTime": "HH:MM in 24-hour format",
                "duration": duration in minutes (number)
              }
            ]
            Each task should have a clear description, estimated duration (30, 60, 90, 120, or 180 minutes), and suggested time of day.`
          },
          {
            role: "user",
            content: `Generate a list of tasks for: ${prompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract JSON from the response
      const content = completion.choices[0].message.content.trim();
      let jsonContent = content;
      
      // Handle case where API returns markdown code blocks
      if (content.includes("```json")) {
        jsonContent = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        jsonContent = content.split("```")[1].split("```")[0].trim();
      }
      
      const tasks = JSON.parse(jsonContent);
      setGeneratedTasks(tasks);
      
      // Initialize all tasks as selected
      const initialSelected = {};
      tasks.forEach(task => {
        initialSelected[task.text] = true;
      });
      setSelectedTasks(initialSelected);
      
    } catch (error) {
      console.error('Error generating tasks:', error);
      Alert.alert('Error', 'Failed to generate tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskSelection = (taskText) => {
    Haptics.selectionAsync();
    setSelectedTasks(prev => ({
      ...prev,
      [taskText]: !prev[taskText]
    }));
  };

  const addSelectedTasks = async () => {
    const selectedTaskObjects = generatedTasks.filter(task => selectedTasks[task.text]);
    
    if (selectedTaskObjects.length === 0) {
      Alert.alert('No Tasks Selected', 'Please select at least one task to add.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const tasksToAdd = selectedTaskObjects.map(task => ({
        id: Date.now() + Math.random().toString(),
        text: task.text,
        startTime: task.startTime || "09:00",
        duration: task.duration || 60,
        completed: false,
        date: selectedDate.toISOString().split('T')[0]
      }));
      
      if (user) {
        await axios.put('https://a1e4-109-245-199-118.ngrok-free.app/addaitasks', {
          userID: user._id,
          tasks: tasksToAdd
        });
        
        const updatedUser = {
          ...user,
          tasks: [...user.tasks, ...tasksToAdd]
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      router.back();
      router.navigate({
        pathname: "/main/TimelineView",
      });
      
    } catch (error) {
      console.error('Error adding tasks:', error);
      Alert.alert('Error', 'Failed to add tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const askQuestion = async () => {
    if (prompt.trim() === '') {
      Alert.alert('Error', 'Please enter your question.');
      return;
    }
    
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Get user's past tasks
      const pastTasks = user?.tasks || [];
      const taskHistory = pastTasks.map(task => ({
        text: task.text,
        date: task.date,
        completed: task.completed,
        duration: task.duration
      }));

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert personal productivity assistant. Analyze the user's past tasks and provide insights, patterns, and recommendations.
            Here is the user's task history: ${JSON.stringify(taskHistory)}`
          },
          {
            role: "user",
            content: `Based on my past tasks, ${prompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      setResponse(completion.choices[0].message.content);
      
    } catch (error) {
      console.error('Error getting answer:', error);
      Alert.alert('Error', 'Failed to get answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 border-b border-gray-200">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="h-10 w-10 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <Text className="text-gray-900 text-xl font-bold">AI Assistant</Text>
            <View className="h-10 w-10" />
          </View>

          <ScrollView className="flex-1 px-6">
            {/* Mode Selection */}
            <View className="flex-row bg-gray-100 p-1 rounded-2xl my-6">
              <TouchableOpacity 
                className={`flex-1 py-3 px-4 rounded-xl ${
                  mode === 'generate' ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMode('generate');
                  setPrompt('');
                  setResponse(null);
                  setGeneratedTasks([]);
                  setSelectedTasks({});
                }}
              >
                <Text className={`text-center font-medium ${
                  mode === 'generate' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Generate Tasks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-3 px-4 rounded-xl ${
                  mode === 'ask' ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMode('ask');
                  setPrompt('');
                  setResponse(null);
                  setGeneratedTasks([]);
                  setSelectedTasks({});
                }}
              >
                <Text className={`text-center font-medium ${
                  mode === 'ask' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Ask Questions
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Section */}
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-4">
                  <Ionicons 
                    name={mode === 'generate' ? "sparkles" : "help-circle"} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {mode === 'generate' ? 'Plan Your Tasks' : 'Ask Questions'}
                  </Text>
                  <Text className="text-gray-500">
                    {mode === 'generate' 
                      ? 'Let AI help you organize your day' 
                      : 'Get insights about your past tasks'}
                  </Text>
                </View>
              </View>

              <TextInput
                className="text-gray-800 text-lg mb-4"
                placeholder={
                  mode === 'generate' 
                    ? "What kind of tasks do you want to plan?"
                    : "What would you like to know about your tasks?"
                }
                placeholderTextColor="#999"
                value={prompt}
                onChangeText={setPrompt}
                multiline={true}
                numberOfLines={3}
                autoFocus={!isLoading}
                editable={!isLoading}
              />

              <TouchableOpacity 
                className={`bg-black py-4 rounded-xl shadow-sm flex-row justify-center items-center ${
                  isLoading ? 'opacity-70' : ''
                }`}
                onPress={mode === 'generate' ? generateTasks : askQuestion}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">
                      {mode === 'generate' ? 'Generating Tasks...' : 'Getting Answer...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons 
                      name={mode === 'generate' ? "flash" : "search"} 
                      size={20} 
                      color="#fff" 
                      style={{ marginRight: 8 }} 
                    />
                    <Text className="text-white font-semibold">
                      {mode === 'generate' ? 'Generate Tasks' : 'Ask Question'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Generated Tasks Section */}
            {mode === 'generate' && generatedTasks.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-900 font-semibold">Generated Tasks</Text>
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

                <View className="space-y-3">
                  {generatedTasks.map((task, index) => (
                    <TouchableOpacity 
                      key={index}
                      className={`flex-row items-center p-4 rounded-xl ${
                        selectedTasks[task.text] ? 'bg-white border border-gray-300' : 'bg-gray-50 border border-gray-200'
                      }`}
                      onPress={() => toggleTaskSelection(task.text)}
                    >
                      <View className={`h-5 w-5 rounded-full mr-3 border items-center justify-center ${
                        selectedTasks[task.text] ? 'border-black bg-black' : 'border-gray-400 bg-transparent'
                      }`}>
                        {selectedTasks[task.text] && (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      
                      <View className="flex-1">
                        <Text className={`text-base ${selectedTasks[task.text] ? 'text-gray-900' : 'text-gray-500'}`}>
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

                {/* Date Selection and Add Tasks Button */}
                <View className="mt-6">
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
                    className={`bg-black py-4 rounded-xl shadow-sm flex-row justify-center items-center ${
                      isLoading ? 'opacity-70' : ''
                    }`}
                    onPress={addSelectedTasks}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-semibold">Adding Tasks...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-semibold">Add Selected Tasks</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Response Section for Questions */}
            {mode === 'ask' && response && (
              <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <Text className="text-gray-900 font-semibold mb-4">Response</Text>
                <Text className="text-gray-700 leading-relaxed">
                  {response}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

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