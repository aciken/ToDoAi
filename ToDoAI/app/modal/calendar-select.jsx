import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CalendarSelect() {
  const params = useLocalSearchParams();
  const currentDate = params.currentDate || formatDate(new Date());
  const previousScreen = params.from || 'unknown';
  const tasksParam = params.tasksData ? JSON.parse(params.tasksData) : [];
  
  // Format date to YYYY-MM-DD format
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle date selection
  const handleDateSelect = async (date) => {
    try {
      Haptics.selectionAsync();
      const selectedDate = date.dateString;
      
      // Store the selected date in AsyncStorage for persistence
      await AsyncStorage.setItem('lastSelectedDate', selectedDate);
      
      // Go back to previous screen with the selected date
      if (previousScreen === 'add-task') {
        router.back({
        });

        router.replace({
          pathname: '/modal/add-task',
          params: { selectedDate: selectedDate }
        });
        
      } else {
        router.replace({
          pathname: '/main/Home',
          params: { selectedDate: selectedDate }
        });
      }
    } catch (error) {
      console.error("Error selecting date:", error);
      Alert.alert("Error", "Failed to select date. Please try again.");
    }
  };
  
  // Go to today
  const goToToday = async () => {
    try {
      Haptics.selectionAsync();
      const today = formatDate(new Date());
      
      // Store the selected date in AsyncStorage for persistence
      await AsyncStorage.setItem('lastSelectedDate', today);
      
      // Go back to previous screen with today's date
      if (previousScreen === 'add-task') {
        router.back({
          params: { selectedDate: today }
        });
      } else {
        router.replace({
          pathname: '/main/home',
          params: { selectedDate: today }
        });
      }
    } catch (error) {
      console.error("Error selecting today:", error);
      Alert.alert("Error", "Failed to select today's date. Please try again.");
    }
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
      if (task && task.date && !markedDates[task.date]) {
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
          current={currentDate}
          minDate={'2023-01-01'}
          maxDate={'2030-12-31'}
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