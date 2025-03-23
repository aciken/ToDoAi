import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import * as Haptics from 'expo-haptics';

export default function CalendarSelect() {
  const params = useLocalSearchParams();
  const currentDate = params.currentDate || formatDate(new Date());
  const tasksParam = params.tasksData ? JSON.parse(params.tasksData) : [];
  
  // Format date to YYYY-MM-DD format
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle date selection
  const handleDateSelect = (date) => {
    Haptics.selectionAsync();
    router.back({
      params: { selectedDate: date.dateString }
    });
  };
  
  // Go to today
  const goToToday = () => {
    Haptics.selectionAsync();
    const today = formatDate(new Date());
    router.back({
      params: { selectedDate: today }
    });
  };
  
  // Close the modal without selecting a date
  const closeModal = () => {
    router.back();
  };
  
  // Generate the marked dates object for the calendar
  const getMarkedDates = () => {
    const markedDates = {};
    
    // Mark tasks dates
    tasksParam.forEach(task => {
      if (!markedDates[task.date]) {
        markedDates[task.date] = { marked: true, dotColor: '#333' };
      }
    });
    
    // Mark selected date
    markedDates[currentDate] = {
      ...markedDates[currentDate],
      selected: true,
      selectedColor: '#333',
    };
    
    return markedDates;
  };

  // Check if a date is today
  const isToday = (dateString) => {
    const today = new Date();
    const checkDate = new Date(dateString);
    
    return (
      today.getFullYear() === checkDate.getFullYear() &&
      today.getMonth() === checkDate.getMonth() &&
      today.getDate() === checkDate.getDate()
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-gray-900 text-xl font-bold">Select Date</Text>
          <TouchableOpacity 
            onPress={closeModal}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Calendar
          markedDates={getMarkedDates()}
          onDayPress={handleDateSelect}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#666',
            selectedDayBackgroundColor: '#333',
            selectedDayTextColor: '#fff',
            todayTextColor: '#333',
            dayTextColor: '#333',
            textDisabledColor: '#d9e1e8',
            dotColor: '#333',
            selectedDotColor: '#ffffff',
            arrowColor: '#333',
            monthTextColor: '#333',
            indicatorColor: '#333',
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '400',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14
          }}
        />
        
        {!isToday(currentDate) && (
          <View className="flex-row justify-center mt-8">
            <TouchableOpacity 
              className="bg-gray-900 py-3 px-8 rounded-full"
              onPress={goToToday}
            >
              <Text className="text-white font-medium">Today</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 