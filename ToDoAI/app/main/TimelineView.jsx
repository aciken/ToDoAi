import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';

// Sample tasks for the timeline
const SAMPLE_TASKS = [
  { id: 1, text: 'Morning Routine', startTime: '07:00', duration: 60, icon: 'sunny', completed: false, date: '2025-03-25' },
  { id: 2, text: 'Team Meeting', startTime: '09:00', duration: 45, icon: 'people', completed: false, date: '2025-03-25' },
  { id: 3, text: 'Project Work', startTime: '10:00', duration: 120, icon: 'code', completed: false, date: '2025-03-25' },
  { id: 4, text: 'Lunch Break', startTime: '12:00', duration: 60, icon: 'restaurant', completed: false, date: '2025-03-25' },
  { id: 5, text: 'Client Call', startTime: '13:30', duration: 30, icon: 'call', completed: false, date: '2025-03-25' },
  { id: 6, text: 'Code Review', startTime: '14:30', duration: 90, icon: 'git-branch', completed: false, date: '2025-03-25' },
  { id: 7, text: 'Gym', startTime: '16:30', duration: 60, icon: 'fitness', completed: false, date: '2025-03-25' },
  { id: 8, text: 'Dinner', startTime: '18:00', duration: 60, icon: 'restaurant', completed: false, date: '2025-03-25' },
  { id: 9, text: 'Evening Reading', startTime: '19:30', duration: 60, icon: 'book', completed: false, date: '2025-03-25' },
  { id: 10, text: 'Sleep', startTime: '22:00', duration: 480, icon: 'moon', completed: false, date: '2025-03-25' },
];

const HOUR_HEIGHT = 80; // Increased height for better visibility
const TIMELINE_WIDTH = Dimensions.get('window').width - 48; // Adjusted width
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TimelineView() {
  const params = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(params.selectedDate ? new Date(params.selectedDate) : new Date());
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const scrollViewRef = useRef(null);
  const lastScrollX = useRef(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const taskAnims = useRef(SAMPLE_TASKS.map(() => new Animated.Value(0))).current;

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get tasks for selected date
  const getTasksForDate = (date) => {
    const dateString = formatDate(date);
    return tasks.filter(task => task.date === dateString);
  };

  // Convert time string to minutes since midnight
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Format duration in hours and minutes
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Calculate task position and height
  const getTaskStyle = (task, index) => {
    const startMinutes = timeToMinutes(task.startTime);
    const top = ((startMinutes + 30) / 60) * HOUR_HEIGHT; // Added 30-minute offset forward
    const height = Math.max((task.duration / 60) * HOUR_HEIGHT, 60);
    
    return {
      position: 'absolute',
      top,
      left: 48,
      width: SCREEN_WIDTH - 96,
      height,
      backgroundColor: task.completed ? '#F3F4F6' : '#FFFFFF',
      borderRadius: 12,
      padding: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: task.completed ? '#E5E7EB' : '#F3F4F6',
      transform: [
        { scale: taskAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1]
        })},
        { translateY: taskAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0]
        })}
      ],
      opacity: taskAnims[index],
    };
  };

  // Start animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      ...taskAnims.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          useNativeDriver: true,
        })
      )
    ]).start();
  }, []);

  const toggleTaskCompletion = (taskId) => {
    Haptics.selectionAsync();
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  // Handle date change
  const onDateChange = (event, date) => {
    if (date) {
      Haptics.selectionAsync();
      setSelectedDate(date);
    }
  };

  // Handle scroll
  const handleScroll = (event) => {
    const currentScrollX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const scrollDiff = currentScrollX - lastScrollX.current;
    
    // Only update if we've scrolled at least half the screen width
    if (Math.abs(scrollDiff) > screenWidth / 2) {
      const newDate = new Date(selectedDate);
      if (scrollDiff > 0) {
        // Scrolled right - go to previous day
        newDate.setDate(newDate.getDate() - 1);
      } else {
        // Scrolled left - go to next day
        newDate.setDate(newDate.getDate() + 1);
      }
      setSelectedDate(newDate);
      lastScrollX.current = currentScrollX;
      
      // Reset scroll position
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View className="flex-1">
        {/* Header with blur effect */}
        <BlurView intensity={80} tint="light" className="absolute top-0 left-0 right-0 z-10">
          <View className="flex-row justify-between items-center px-6 py-3 mt-12">
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity 
                onPress={() => router.push("/modal/ai-task-generator")}
                className="h-9 w-9 rounded-full items-center justify-center bg-white/80"
              >
                <Ionicons name="sparkles" size={20} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push("/modal/add-task")}
                className="h-9 w-9 rounded-full items-center justify-center bg-white/80"
              >
                <Ionicons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/modal/calendar-select")}
              className="flex-row items-center bg-white/80 px-4 py-2 rounded-full"
            >
              <Ionicons name="calendar" size={16} color="#333" />
              <Text className="text-gray-900 font-medium ml-2">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push("/modal/profile")}
              className="h-9 w-9 rounded-full items-center justify-center bg-white/80"
            >
              <Ionicons name="person" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Timeline Content */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 pt-20"
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          directionalLockEnabled={true}
          snapToInterval={SCREEN_WIDTH}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={{
            width: SCREEN_WIDTH * 3, // Show 3 days worth of content
            height: 24 * HOUR_HEIGHT,
          }}
        >
          {/* Previous Day */}
          <Animated.View 
            className="p-6"
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: SCREEN_WIDTH
            }}
          >
            {/* Timeline Container */}
            <View style={{ height: 24 * HOUR_HEIGHT, position: 'relative' }}>
              {/* Hour Markers with Labels */}
              {Array.from({ length: 24 }, (_, i) => (
                <View 
                  key={i} 
                  style={{
                    position: 'absolute',
                    top: i * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: HOUR_HEIGHT,
                  }}
                >
                  <Text className="text-gray-400 text-xs w-12">
                    {i.toString().padStart(2, '0')}:00
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: '#E5E7EB',
                      marginLeft: 8,
                    }}
                  />
                </View>
              ))}

              {/* Tasks */}
              {getTasksForDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000)).map((task, index) => (
                <TouchableOpacity
                  key={task.id}
                  style={getTaskStyle(task, index)}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  <View className="flex-row items-center">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                      task.completed ? 'bg-gray-200' : 'bg-gray-100'
                    }`}>
                      <Ionicons 
                        name={task.completed ? 'checkmark' : task.icon} 
                        size={14} 
                        color={task.completed ? '#9CA3AF' : '#4B5563'} 
                      />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text 
                        className={`font-medium text-sm ${
                          task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                        numberOfLines={1}
                      >
                        {task.text}
                      </Text>
                      <Text className={`text-xs ${
                        task.completed ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {task.startTime} • {formatDuration(task.duration)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Current Day */}
          <Animated.View 
            className="p-6"
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: SCREEN_WIDTH
            }}
          >
            {/* Timeline Container */}
            <View style={{ height: 24 * HOUR_HEIGHT, position: 'relative' }}>
              {/* Hour Markers with Labels */}
              {Array.from({ length: 24 }, (_, i) => (
                <View 
                  key={i} 
                  style={{
                    position: 'absolute',
                    top: i * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: HOUR_HEIGHT,
                  }}
                >
                  <Text className="text-gray-400 text-xs w-12">
                    {i.toString().padStart(2, '0')}:00
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: '#E5E7EB',
                      marginLeft: 8,
                    }}
                  />
                </View>
              ))}

              {/* Tasks */}
              {getTasksForDate(selectedDate).map((task, index) => (
                <TouchableOpacity
                  key={task.id}
                  style={getTaskStyle(task, index)}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  <View className="flex-row items-center">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                      task.completed ? 'bg-gray-200' : 'bg-gray-100'
                    }`}>
                      <Ionicons 
                        name={task.completed ? 'checkmark' : task.icon} 
                        size={14} 
                        color={task.completed ? '#9CA3AF' : '#4B5563'} 
                      />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text 
                        className={`font-medium text-sm ${
                          task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                        numberOfLines={1}
                      >
                        {task.text}
                      </Text>
                      <Text className={`text-xs ${
                        task.completed ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {task.startTime} • {formatDuration(task.duration)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Next Day */}
          <Animated.View 
            className="p-6"
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: SCREEN_WIDTH
            }}
          >
            {/* Timeline Container */}
            <View style={{ height: 24 * HOUR_HEIGHT, position: 'relative' }}>
              {/* Hour Markers with Labels */}
              {Array.from({ length: 24 }, (_, i) => (
                <View 
                  key={i} 
                  style={{
                    position: 'absolute',
                    top: i * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: HOUR_HEIGHT,
                  }}
                >
                  <Text className="text-gray-400 text-xs w-12">
                    {i.toString().padStart(2, '0')}:00
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: '#E5E7EB',
                      marginLeft: 8,
                    }}
                  />
                </View>
              ))}

              {/* Tasks */}
              {getTasksForDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)).map((task, index) => (
                <TouchableOpacity
                  key={task.id}
                  style={getTaskStyle(task, index)}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  <View className="flex-row items-center">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                      task.completed ? 'bg-gray-200' : 'bg-gray-100'
                    }`}>
                      <Ionicons 
                        name={task.completed ? 'checkmark' : task.icon} 
                        size={14} 
                        color={task.completed ? '#9CA3AF' : '#4B5563'} 
                      />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text 
                        className={`font-medium text-sm ${
                          task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                        numberOfLines={1}
                      >
                        {task.text}
                      </Text>
                      <Text className={`text-xs ${
                        task.completed ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {task.startTime} • {formatDuration(task.duration)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
} 