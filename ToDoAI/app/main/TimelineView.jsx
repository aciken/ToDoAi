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
  Platform,
  PanResponder
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
const HEADER_HEIGHT = 135; // Approximate header height with padding

export default function TimelineView() {
  const params = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(params.selectedDate ? new Date(params.selectedDate) : new Date());
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const scrollViewRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const taskAnims = useRef(SAMPLE_TASKS.map(() => new Animated.Value(0))).current;
  const pageAnim = useRef(new Animated.Value(0)).current;
  
  // Header animation values
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');
  const isScrolling = useRef(false);
  
  // Handle scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        
        // Always show header when at the top
        if (currentScrollY <= 10) {
          if (headerTranslateY._value !== 0) {
            Animated.parallel([
              Animated.spring(headerTranslateY, {
                toValue: 0,
                friction: 6,
                tension: 50,
                useNativeDriver: true,
              }),
              Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              })
            ]).start();
          }
          lastScrollY.current = currentScrollY;
          return;
        }
        
        // Determine scroll direction
        if (currentScrollY > lastScrollY.current + 2) {
          if (scrollDirection.current !== 'down') {
            scrollDirection.current = 'down';
            // Start hide animation when scroll direction changes to down
            Animated.parallel([
              Animated.timing(headerTranslateY, {
                toValue: -HEADER_HEIGHT,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(headerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              })
            ]).start();
          }
        } else if (currentScrollY < lastScrollY.current - 2) {
          if (scrollDirection.current !== 'up') {
            scrollDirection.current = 'up';
            // Start show animation when scroll direction changes to up
            Animated.parallel([
              Animated.spring(headerTranslateY, {
                toValue: 0,
                friction: 6,
                tension: 50,
                useNativeDriver: true,
              }),
              Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              })
            ]).start();
          }
        }
        
        lastScrollY.current = currentScrollY;
      }
    }
  );

  // Handle date navigation
  const navigateDate = (direction) => {
    Haptics.selectionAsync();
    const newDate = new Date(selectedDate);
    
    // Animate out current content
    Animated.timing(pageAnim, {
      toValue: direction === 'prev' ? 1 : -1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Update date
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      setSelectedDate(newDate);
      
      // Reset animation and animate in new content
      pageAnim.setValue(0);
      Animated.timing(pageAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

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

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View className="flex-1">
        {/* Header with blur effect */}
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity
          }}
        >
          <BlurView intensity={80} tint="light">
            <View className="px-4 py-3 mt-12">
              {/* Top row with action buttons */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center space-x-3 flex-1">
                  <TouchableOpacity 
                    onPress={() => router.push("/modal/ai-task-generator")}
                    className="flex-1 h-12 rounded-full items-center justify-center bg-black shadow-sm"
                  >
                    <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => router.push("/modal/add-task")}
                    className="flex-1 h-12 rounded-full items-center justify-center bg-white/90 shadow-sm"
                  >
                    <Ionicons name="add" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>
                <View className="w-3" />
                <TouchableOpacity 
                  onPress={() => router.push("/modal/profile")}
                  className="h-10 w-10 rounded-full items-center justify-center bg-white/90 shadow-sm"
                >
                  <Ionicons name="person" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>
              
              {/* Bottom row with date navigation */}
              <View className="flex-row items-center justify-between">
                <TouchableOpacity 
                  onPress={() => navigateDate('prev')}
                  className="h-10 w-10 rounded-full items-center justify-center bg-white/80"
                >
                  <Ionicons name="chevron-back" size={20} color="#333" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => router.push("/modal/calendar-select")}
                  className="flex-1 mx-4 flex-row items-center justify-center bg-white/80 px-4 py-2 rounded-full"
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
                  onPress={() => navigateDate('next')}
                  className="h-10 w-10 rounded-full items-center justify-center bg-white/80"
                >
                  <Ionicons name="chevron-forward" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Timeline Content */}
        <Animated.View 
          style={{
            flex: 1,
            transform: [{
              translateX: pageAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH]
              })
            }]
          }}
        >
          <ScrollView 
            ref={scrollViewRef}
            className="flex-1 pt-20"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => { isScrolling.current = true; }}
            onScrollEndDrag={() => { isScrolling.current = false; }}
            onMomentumScrollBegin={() => { isScrolling.current = true; }}
            onMomentumScrollEnd={() => { isScrolling.current = false; }}
          >
            <Animated.View 
              className="p-6"
              style={{ 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
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
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
} 