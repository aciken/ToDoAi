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
  ScrollView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

export default function AddTask() {
  const params = useLocalSearchParams();
  const [taskText, setTaskText] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());

  // Effect to handle returned date from calendar modal
  useEffect(() => {
    if (params.selectedDate) {
      const newDate = new Date(params.selectedDate);
      
      // Keep the time component from the current selectedDateTime
      newDate.setHours(selectedDateTime.getHours());
      newDate.setMinutes(selectedDateTime.getMinutes());
      
      setSelectedDateTime(newDate);
      router.setParams({ selectedDate: null });
    }
  }, [params.selectedDate]);
  
  // Format date to display
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };
  
  // Format date for display (e.g., "March 22, 2023")
  const formatDateForDisplay = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Format time to display
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Open calendar modal for date selection
  const openCalendar = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/modal/calendar-select',
      params: {
        currentDate: formatDate(selectedDateTime)
      }
    });
  };

  const onTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      // Keep the date component from the current selectedDateTime
      const newDateTime = new Date(selectedDateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      setSelectedDateTime(newDateTime);
    }
  };

  const handleAddTask = () => {
    if (taskText.trim() === '') {
      return;
    }

    // Format for display and sorting
    const dateString = formatDate(selectedDateTime);
    const timeString = formatTime(selectedDateTime);

    // Create task object with date and time
    const newTask = {
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      date: dateString,
      time: timeString,
      timestamp: selectedDateTime.getTime(), // For easier sorting
    };

    // Pass task back to main screen
    router.back();
    router.navigate({
      pathname: "/main/Home",
      params: { newTask: JSON.stringify(newTask) }
    });
  };

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
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 pt-12">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-8">
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text className="text-gray-900 text-xl font-bold">New Task</Text>
              <TouchableOpacity onPress={handleAddTask}>
                <Text className="text-gray-900 text-base font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
            
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
                  <Text className="text-gray-900 font-medium">{getDateLabel(selectedDateTime)}</Text>
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
                  <Text className="text-gray-900 font-medium">{formatTime(selectedDateTime)}</Text>
                </View>
                <DateTimePicker
                  value={selectedDateTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  style={{ height: 120 }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 