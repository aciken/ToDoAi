import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';

export default function EditTask() {
  const { user, setUser } = useGlobalContext();
  const params = useLocalSearchParams();
  const taskId = params.taskId;
  
  const [task, setTask] = useState(null);
  const [taskText, setTaskText] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load task data when component mounts
  useEffect(() => {
    const loadTask = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const foundTask = user.tasks.find(t => t.id === taskId);
          if (foundTask) {
            setTask(foundTask);
            setTaskText(foundTask.text);
            
            // Set time
            const [timeHours, timeMinutes] = foundTask.startTime.split(':').map(Number);
            const timeDate = new Date();
            timeDate.setHours(timeHours, timeMinutes, 0, 0);
            setSelectedTime(timeDate);
            
            // Set duration
            const durationHours = Math.floor(foundTask.duration / 60);
            const durationMinutes = foundTask.duration % 60;
            setDurationHours(durationHours);
            setDurationMinutes(durationMinutes);
          }
        }
      } catch (error) {
        console.error('Error loading task:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTask();
  }, [taskId]);
  
  // Format time to HH:mm format
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const onTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      Haptics.selectionAsync();
      setSelectedTime(selectedTime);
    }
  };

  // Format duration to string (e.g. "1h 30m")
  const formatDuration = () => {
    if (durationHours === 0 && durationMinutes === 0) return "0m";
    if (durationHours === 0) return `${durationMinutes}m`;
    if (durationMinutes === 0) return `${durationHours}h`;
    return `${durationHours}h ${durationMinutes}m`;
  };

  // Handle save
  const handleSave = async () => {
    if (!taskText.trim()) {
      Alert.alert('Error', 'Please enter a task description.');
      return;
    }
    
    if (durationHours === 0 && durationMinutes === 0) {
      Alert.alert('Error', 'Please set a task duration');
      return;
    }
    
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      const updatedTask = {
        ...task,
        text: taskText.trim(),
        startTime: formatTime(selectedTime),
        duration: (durationHours * 60) + durationMinutes
      };
      
      const response = await axios.put('https://a1e4-109-245-199-118.ngrok-free.app/updatetaskfully', {
        taskId: task.id,
        task: updatedTask,
        userID: user._id
      });
      
      if (response.status === 200) {
        AsyncStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
        router.back();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        Alert.alert(
          'Cannot Update Task',
          error.response.data.message || 'The task overlaps with another task on the same day',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to update task. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Fixed Header */}
      <View className="px-6 pt-8 pb-4 bg-white z-10 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-xl font-bold">Edit Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text className="text-gray-900 text-base font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 pt-4">
            {/* Task Input */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Task Name</Text>
              <TextInput
                className="bg-gray-100 text-gray-900 py-3 px-5 rounded-xl text-base"
                placeholder="What do you need to do?"
                placeholderTextColor="#999"
                value={taskText}
                onChangeText={setTaskText}
                returnKeyType="done"
                multiline={true}
                numberOfLines={2}
                autoFocus={true}
              />
            </View>
            
            {/* Time Picker */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Task Time</Text>
              <View className="bg-gray-100 rounded-xl p-4">
                <View className="flex-row items-center justify-center mb-2">
                  <Ionicons name="time-outline" size={18} color="#666" style={{ marginRight: 6 }} />
                  <Text className="text-gray-900 font-medium">{formatTime(selectedTime)}</Text>
                </View>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  style={{ height: 120 }}
                />
              </View>
            </View>
            
            {/* Duration Picker */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Task Duration</Text>
              <View className="bg-gray-100 rounded-xl p-4">
                <View className="flex-row items-center justify-center mb-5">
                  <Ionicons name="hourglass-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                  <Text className="text-gray-900 font-semibold text-lg">{formatDuration()}</Text>
                </View>
                
                {/* Quick duration buttons */}
                <View className="flex-row justify-between mb-5">
                  <TouchableOpacity 
                    onPress={() => { setDurationHours(0); setDurationMinutes(30); }}
                    className={`py-2 px-4 rounded-full ${durationHours === 0 && durationMinutes === 30 ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <Text className={`${durationHours === 0 && durationMinutes === 30 ? 'text-white' : 'text-gray-700'} font-medium`}>30m</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => { setDurationHours(1); setDurationMinutes(0); }}
                    className={`py-2 px-4 rounded-full ${durationHours === 1 && durationMinutes === 0 ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <Text className={`${durationHours === 1 && durationMinutes === 0 ? 'text-white' : 'text-gray-700'} font-medium`}>1h</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => { setDurationHours(1); setDurationMinutes(30); }}
                    className={`py-2 px-4 rounded-full ${durationHours === 1 && durationMinutes === 30 ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <Text className={`${durationHours === 1 && durationMinutes === 30 ? 'text-white' : 'text-gray-700'} font-medium`}>1h 30m</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => { setDurationHours(2); setDurationMinutes(0); }}
                    className={`py-2 px-4 rounded-full ${durationHours === 2 && durationMinutes === 0 ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <Text className={`${durationHours === 2 && durationMinutes === 0 ? 'text-white' : 'text-gray-700'} font-medium`}>2h</Text>
                  </TouchableOpacity>
                </View>
                
                <View className="flex-row justify-between items-center">
                  {/* Hours selector */}
                  <View className="flex-1 mr-6 bg-gray-200 py-3 px-3 rounded-xl">
                    <Text className="text-gray-700 text-center mb-2 font-medium">Hours</Text>
                    <View className="flex-row justify-center items-center">
                      <TouchableOpacity 
                        onPress={() => durationHours > 0 && setDurationHours(durationHours - 1)}
                        className="bg-white w-9 h-9 rounded-full items-center justify-center shadow-sm"
                      >
                        <Ionicons name="remove" size={20} color="#333" />
                      </TouchableOpacity>
                      
                      <Text className="text-gray-900 text-xl font-semibold mx-4 w-8 text-center">
                        {durationHours}
                      </Text>
                      
                      <TouchableOpacity 
                        onPress={() => setDurationHours(durationHours + 1)}
                        className="bg-white w-9 h-9 rounded-full items-center justify-center shadow-sm"
                      >
                        <Ionicons name="add" size={20} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Minutes selector */}
                  <View className="flex-1 bg-gray-200 py-3 px-3 rounded-xl">
                    <Text className="text-gray-700 text-center mb-2 font-medium">Minutes</Text>
                    <View className="flex-row justify-center items-center">
                      <TouchableOpacity 
                        onPress={() => {
                          if (durationMinutes === 0) {
                            setDurationMinutes(45);
                          } else if (durationMinutes === 15) {
                            setDurationMinutes(0);
                          } else {
                            setDurationMinutes(durationMinutes - 15);
                          }
                        }}
                        className="bg-white w-9 h-9 rounded-full items-center justify-center shadow-sm"
                      >
                        <Ionicons name="remove" size={20} color="#333" />
                      </TouchableOpacity>
                      
                      <Text className="text-gray-900 text-xl font-semibold mx-4 w-8 text-center">
                        {durationMinutes}
                      </Text>
                      
                      <TouchableOpacity 
                        onPress={() => {
                          if (durationMinutes === 45) {
                            setDurationMinutes(0);
                          } else {
                            setDurationMinutes(durationMinutes + 15);
                          }
                        }}
                        className="bg-white w-9 h-9 rounded-full items-center justify-center shadow-sm"
                      >
                        <Ionicons name="add" size={20} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 