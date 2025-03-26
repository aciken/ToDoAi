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
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';

export default function AddTask() {
  const { user, setUser } = useGlobalContext();
  const params = useLocalSearchParams();
  const [taskText, setTaskText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

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

  // Effect to handle returned date from calendar modal
  useEffect(() => {
    if (params.selectedDate) {
      try {
        console.log('Received date in AddTask:', params.selectedDate);
        
        // Create a new Date object from the selected date string
        const dateArray = params.selectedDate.split('-');
        const year = parseInt(dateArray[0]);
        const month = parseInt(dateArray[1]) - 1; // Months are 0-indexed
        const day = parseInt(dateArray[2]);
        
        // Create new date with the same time as the current selectedTime
        const newDate = new Date();
        newDate.setFullYear(year, month, day);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        
        console.log('Setting date to:', newDate);
        setSelectedDate(newDate);
      } catch (error) {
        console.error('Error updating date:', error);
      }
    }
  }, [params]);
  
  // Format date to YYYY-MM-DD format
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Format date for display (e.g., "March 22, 2023")
  const formatDateForDisplay = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Format time to HH:mm format
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Open calendar modal for date selection
  const openCalendar = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/modal/calendar-select',
      params: {
        currentDate: formatDate(selectedDate),
        from: 'add-task'
      }
    });
  };

  const onTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      // Create new date combining existing date with new time
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      setSelectedTime(selectedTime);
      setSelectedDate(newDateTime); // Update both states
    }
  };

  // Format duration to string (e.g. "1h 30m")
  const formatDuration = () => {
    if (durationHours === 0 && durationMinutes === 0) return "0m";
    if (durationHours === 0) return `${durationMinutes}m`;
    if (durationMinutes === 0) return `${durationHours}h`;
    return `${durationHours}h ${durationMinutes}m`;
  };

  // Get total minutes for API
  const getTotalMinutes = () => {
    return (durationHours * 60) + durationMinutes;
  };

  // Handle duration changes
  const handleHourChange = (value) => {
    setDurationHours(value);
  };

  const handleMinuteChange = (value) => {
    setDurationMinutes(value);
  };

  const handleAddTask = async () => {
    if (!user) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }

    if (taskText.trim() === '') {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    if (durationHours === 0 && durationMinutes === 0) {
      Alert.alert('Error', 'Please set a task duration');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Format for display and sorting
    const dateString = formatDate(selectedDate);
    const timeString = formatTime(selectedTime);
    const durationMinutes = getTotalMinutes();

    // Create task object with structure matching the timeline view
    const newTask = {
      id: String(Date.now()),
      text: taskText.trim(),
      startTime: timeString,
      duration: durationMinutes,
      completed: false,
      date: dateString
    };


  axios.put('https://809a-109-245-199-118.ngrok-free.app/addtask', {newTask, userID: user._id})
  .then((response) => {
    if (response.status === 200) {
      AsyncStorage.setItem('user', JSON.stringify(response.data));
      setUser(response.data);
      router.back({
        params: {
          newTask: JSON.stringify(newTask)
        }
      });
    }
  })
  .catch((error) => {
    console.error('Error adding task:', error);
    Alert.alert('Error', 'Failed to add task. Please try again.');
  }); 
  }

  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  // Check if a date is tomorrow
  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return (
      tomorrow.getFullYear() === date.getFullYear() &&
      tomorrow.getMonth() === date.getMonth() &&
      tomorrow.getDate() === date.getDate()
    );
  };

  // Get a friendly date description
  const getDateLabel = (date) => {
    if (isToday(date)) {
      return 'Today';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return formatDateForDisplay(date);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Fixed Header */}
      <View className="px-6 pt-8 pb-4 bg-white z-10 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-xl font-bold">New Task</Text>
          <TouchableOpacity onPress={handleAddTask}>
            <Text className="text-gray-900 text-base font-semibold">Add</Text>
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
            
            {/* Date Picker - Using calendar modal */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Task Date</Text>
              <TouchableOpacity 
                className="bg-gray-100 rounded-xl py-3 px-5 flex-row justify-between items-center"
                onPress={openCalendar}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                  <Text className="text-gray-900 font-medium">{getDateLabel(selectedDate)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Time Picker - Always visible */}
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