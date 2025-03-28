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
  PanResponder,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlobalContext } from '../context/GlobalProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Sample tasks as fallback
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

const HOUR_HEIGHT = 120; // Increased height for more accurate positioning
const TIMELINE_WIDTH = Dimensions.get('window').width - 48;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HEADER_HEIGHT = 135;

export default function TimelineView() {
  const { user, setUser } = useGlobalContext();
  const params = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(params.selectedDate ? new Date(params.selectedDate) : new Date());
  const [tasks, setTasks] = useState([]);
  const scrollViewRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentTimeRef = useRef(null);
  
  // Overlay state
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const taskAnims = useRef(SAMPLE_TASKS.map(() => new Animated.Value(0))).current;
  const pageAnim = useRef(new Animated.Value(0)).current;
  const emptyAnim = useRef(new Animated.Value(0)).current;
  
  // Header animation values
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');
  const isScrolling = useRef(false);
  
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
    
    if (!user) {
      loadUser();
    } else {
      setTasks(user.tasks || []);
    }
  }, [user]);
  
  // Sync tasks when user changes
  useEffect(() => {
    if (user && user.tasks) {
      setTasks(user.tasks);
    }
  }, [user]);
  
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
    
    // Reset task animations first
    taskAnims.forEach(anim => anim.setValue(0));
    emptyAnim.setValue(0);
    
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
      
      const tasksForNewDate = getTasksForDate(newDate);
      
      if (tasksForNewDate.length === 0) {
        // Animate empty state if no tasks
        Animated.spring(emptyAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }).start();
      } else {
        // Start task animations with staggered delay
        Animated.stagger(50, 
          taskAnims.map(anim => 
            Animated.spring(anim, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            })
          )
        ).start();
      }
      
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
    const top = ((startMinutes) * HOUR_HEIGHT) / 60; // Keep precise calculation
    
    // Get animation safely
    const animation = taskAnims[index] || new Animated.Value(1);
  
    // Return the simplified style object (assuming no overlaps for clarity)
    return {
      position: 'absolute',
      top,
      left: 48,
      width: SCREEN_WIDTH - 96,
      height: (task.duration * HOUR_HEIGHT) / 60,
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
        {
          scale: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
      ],
      opacity: animation,
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

  // Update task completion status
  const toggleTaskCompletion = (taskId) => {
    Haptics.selectionAsync();
    
    // Update local state first for immediate feedback
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    );
    
    setTasks(updatedTasks);
    
    // Find the updated task
    const updatedTask = updatedTasks.find(task => task.id === taskId);
    
    // Update in backend
    if (user && user._id) {
      axios.put('https://a1e4-109-245-199-118.ngrok-free.app/updatetask', {
        taskId: taskId,
        completed: updatedTask.completed,
        userID: user._id
      })
      .then(response => {
        if (response.status === 200) {
          // Update user in context and localStorage
          AsyncStorage.setItem('user', JSON.stringify(response.data));
          setUser(response.data);
        }
      })
      .catch(error => {
        console.error('Error updating task:', error);
        // Revert change if there was an error
        setTasks(tasks);
      });
    }
  };

  // Handle date change
  const onDateChange = (event, date) => {
    if (date) {
      Haptics.selectionAsync();
      setSelectedDate(date);
    }
  };

  // Handle long press on task
  const handleLongPress = (task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTask(task);
    setOverlayVisible(true);
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Close overlay
  const closeOverlay = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setOverlayVisible(false);
      setSelectedTask(null);
    });
  };
  
  // Task actions
  const completeTask = () => {
    toggleTaskCompletion(selectedTask.id);
    closeOverlay();
  };
  
  const editTask = () => {
    closeOverlay();
    // Navigate to edit screen with the task
    router.push({
      pathname: "/modal/edit-task",
      params: { taskId: selectedTask.id }
    });
  };
  
  const deleteTask = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    if (!selectedTask) return;
    
    // Update local state first
    const updatedTasks = tasks.filter(task => task.id !== selectedTask.id);
    setTasks(updatedTasks);
    
    // Update in backend
    if (user && user._id) {
      axios.delete('https://a1e4-109-245-199-118.ngrok-free.app/deletetask', {
        data: {
          taskId: selectedTask.id,
          userID: user._id
        }
      })
      .then(response => {
        if (response.status === 200) {
          // Update user in context and localStorage
          AsyncStorage.setItem('user', JSON.stringify(response.data));
          setUser(response.data);
        }
      })
      .catch(error => {
        console.error('Error deleting task:', error);
        // Revert change if there was an error
        setTasks(tasks);
      });
    }
    
    closeOverlay();
  };

  // Update current time every minute
  useEffect(() => {
    // Set initial time
    setCurrentTime(new Date());
    
    // Scroll to current time when component mounts if today is selected
    if (isToday(selectedDate)) {
      const timeoutId = setTimeout(() => {
        scrollToCurrentTime();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);
  
  // Set up timer to update current time every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Scroll to current time when date changes to today
  useEffect(() => {
    if (isToday(selectedDate)) {
      scrollToCurrentTime();
    }
  }, [selectedDate]);
  
  // Scroll to current time position
  const scrollToCurrentTime = () => {
    if (scrollViewRef.current) {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      
      // Calculate scroll position (subtract some space to show upcoming events)
      const scrollPosition = ((totalMinutes / 60) * HOUR_HEIGHT) - 150;
      
      scrollViewRef.current.scrollTo({ 
        y: Math.max(0, scrollPosition), 
        animated: true 
      });
    }
  };
  
  // Check if selected date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };
  
  // Get current time position in timeline
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours * HOUR_HEIGHT) + ((minutes / 60) * HOUR_HEIGHT);
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
                  onPress={() => router.push("/modal/settings")}
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
                      alignItems: 'flex-start',
                      height: HOUR_HEIGHT,
                    }}
                  >
                    <Text className="text-gray-400 text-xs w-12" style={{ marginTop: 8 }}>
                      {i.toString().padStart(2, '0')}:00
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        height: 1,
                        backgroundColor: '#E5E7EB',
                        marginLeft: 8,
                        marginTop: 8,
                      }}
                    />
                  </View>
                ))}

                {/* Current time indicator - only visible when today is selected */}
                {isToday(selectedDate) && (
                  <View 
                    ref={currentTimeRef}
                    style={{
                      position: 'absolute',
                      top: getCurrentTimePosition(),
                      left: 0,
                      right: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      zIndex: 5,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View className="w-4 h-4 rounded-full bg-red-500 ml-4" />
                      <Text className="text-red-500 text-xs font-medium ml-2">
                        {currentTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        backgroundColor: '#EF4444', // Red color
                        marginLeft: 8,
                      }}
                    />
                  </View>
                )}

                {/* Tasks */}
                {getTasksForDate(selectedDate).map((task, index) => (
                  <TouchableOpacity
                    key={task.id}
                    style={getTaskStyle(task, index)}
                    onPress={() => toggleTaskCompletion(task.id)}
                    onLongPress={() => handleLongPress(task)}
                    delayLongPress={300}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                        task.completed ? 'bg-gray-200' : 'bg-gray-100'
                      }`}>
                        <Ionicons 
                          name={task.completed ? 'checkmark' : (task.icon || 'time-outline')} 
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
          
          {/* Empty state - fixed position outside of ScrollView */}
          {getTasksForDate(selectedDate).length === 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: '40%',
                left: 0,
                right: 0,
                padding: 20,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: emptyAnim,
                transform: [
                  { scale: emptyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })},
                  { translateY: emptyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })}
                ]
              }}
            >
              <View className="w-16 h-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Ionicons name="calendar-outline" size={28} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-800 mb-2">No Tasks</Text>
              <Text className="text-gray-500 text-center mb-6">
                Nothing scheduled for this day.{'\n'}Tap + to add a new task.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/modal/add-task")}
                className="bg-black px-5 py-3 rounded-full"
              >
                <Text className="text-white font-medium">Add Task</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
        
        {/* Task Options Overlay */}
        <Modal
          visible={overlayVisible}
          transparent={true}
          animationType="none"
          onRequestClose={closeOverlay}
        >
          <Animated.View 
            style={{
              flex: 1, 
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: overlayAnim,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <BlurView intensity={30} tint="dark" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
            }} />
            
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
              }}
              onPress={closeOverlay}
              activeOpacity={1}
            />
            
            <Animated.View 
              className="bg-white rounded-xl p-4 w-5/6 shadow-xl"
              style={{
                transform: [{
                  scale: overlayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1]
                  })
                }]
              }}
            >
              {selectedTask && (
                <>
                  <View className="border-b border-gray-200 pb-3 mb-3">
                    <View className="flex-row items-center mb-2">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                        selectedTask.completed ? 'bg-gray-200' : 'bg-gray-100'
                      }`}>
                        <Ionicons 
                          name={selectedTask.completed ? 'checkmark' : selectedTask.icon} 
                          size={18} 
                          color={selectedTask.completed ? '#9CA3AF' : '#4B5563'} 
                        />
                      </View>
                      <Text className="text-lg font-semibold text-gray-900">
                        {selectedTask.text}
                      </Text>
                    </View>
                    <Text className="text-gray-500 ml-11">
                      {selectedTask.startTime} • {formatDuration(selectedTask.duration)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    className="flex-row items-center py-3"
                    onPress={completeTask}
                  >
                    <View className="w-10 items-center">
                      <Ionicons name={selectedTask.completed ? "remove-circle" : "checkmark-circle"} size={22} color={selectedTask.completed ? "#EF4444" : "#10B981"} />
                    </View>
                    <Text className="text-base ml-2">
                      {selectedTask.completed ? "Mark as Incomplete" : "Mark as Complete"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    className="flex-row items-center py-3"
                    onPress={editTask}
                  >
                    <View className="w-10 items-center">
                      <Ionicons name="pencil" size={22} color="#4B5563" />
                    </View>
                    <Text className="text-base ml-2">Edit Task</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    className="flex-row items-center py-3"
                    onPress={deleteTask}
                  >
                    <View className="w-10 items-center">
                      <Ionicons name="trash" size={22} color="#EF4444" />
                    </View>
                    <Text className="text-base text-red-500 ml-2">Delete Task</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </Animated.View>
        </Modal>
      </View>
    </View>
  );
} 