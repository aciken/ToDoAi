import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Pressable,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalProvider';


export default function Home() {
  const params = useLocalSearchParams();
  const { user, setUser } = useGlobalContext();
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date())); // Default to today
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Track tasks being swiped
  const swipeableRefs = useRef({});
  const itemBeingSwiped = useRef(null);

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

  // Handle incoming tasks from the modal
  useEffect(() => {
    if (params.newTask) {
      try {
        const newTaskItem = JSON.parse(params.newTask);
        if (newTaskItem && typeof newTaskItem === 'object') {
          const task = {
            id: newTaskItem.id || String(Date.now()),
            text: newTaskItem.text || '',
            completed: newTaskItem.completed || false,
            date: newTaskItem.date || formatDate(new Date()),
            time: newTaskItem.time || '00:00',
            timestamp: newTaskItem.timestamp || new Date(newTaskItem.date || new Date()).getTime(),
            isAIGenerated: newTaskItem.isAIGenerated || false
          };
          
          // Update user's todos
          if (user) {
            const updatedUser = {
              ...user,
              todos: [...(user.todos || []), task]
            };
            AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
          
          setSelectedDate(task.date);
          router.setParams({ newTask: null });
        }
      } catch (error) {
        console.error('Error parsing task data:', error);
      }
    }
    
    // Handle bulk tasks from AI generator
    if (params.newTasks) {
      try {
        const newTaskItems = JSON.parse(params.newTasks);
        const validTasks = newTaskItems
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            id: item.id || String(Date.now()),
            text: item.text || '',
            completed: item.completed || false,
            date: item.date || formatDate(new Date()),
            time: item.time || '00:00',
            timestamp: item.timestamp || new Date(item.date || new Date()).getTime(),
            isAIGenerated: item.isAIGenerated || false
          }));
        
        // Update user's todos
        if (user) {
          const updatedUser = {
            ...user,
            todos: [...(user.todos || []), ...validTasks]
          };
          AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
        
        if (params.targetDate) {
          setSelectedDate(params.targetDate);
        }
        router.setParams({ newTasks: null, targetDate: null });
      } catch (error) {
        console.error('Error parsing bulk tasks data:', error);
      }
    }
  }, [params.newTask, params.newTasks, user]);

  // Effect to handle returned date from calendar modal
  useEffect(() => {
    if (params.selectedDate) {
      try {
        console.log('Received date in Home:', params.selectedDate);
        setSelectedDate(params.selectedDate);
        router.setParams({ selectedDate: null });
      } catch (error) {
        console.error('Error updating date in Home:', error);
      }
    }
  }, [params.selectedDate]);

  // Delete animation values
  const getDeleteAnimatedValue = (id) => {
    if (!swipeableRefs.current[id]) {
      swipeableRefs.current[id] = {
        translateX: new Animated.Value(0),
        opacity: new Animated.Value(1),
      };
    }
    return swipeableRefs.current[id];
  };

  // Reset any opened swipes
  const resetOpenSwipes = (exceptId) => {
    if (itemBeingSwiped.current && itemBeingSwiped.current !== exceptId) {
      const animations = swipeableRefs.current[itemBeingSwiped.current];
      if (animations) {
        Animated.spring(animations.translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      }
    }
  };

  // Handles task swipe for delete
  const onSwipe = (id, event) => {
    const { translationX, state, velocityX } = event.nativeEvent;
    const animations = getDeleteAnimatedValue(id);
    
    // Track which item is being swiped
    if (state === State.BEGAN) {
      resetOpenSwipes(id);
      itemBeingSwiped.current = id;
    }

    // Handle swipe movement
    if (state === State.ACTIVE) {
      let newTranslateX = translationX;
      
      // Restrict to left swipe only
      if (newTranslateX > 0) newTranslateX = 0;
      
      // Add resistance when swiping beyond delete threshold
      const deleteThreshold = -120;
      if (newTranslateX < deleteThreshold) {
        const extra = newTranslateX - deleteThreshold;
        newTranslateX = deleteThreshold + extra / 3; // Resistance factor
      }
      
      animations.translateX.setValue(newTranslateX);
    }

    // Handle swipe end
    if (state === State.END) {
      const deleteThreshold = -120;
      const minSwipeDistance = 40;
      const minSwipeVelocity = -0.5;
      
      if (translationX < deleteThreshold || (Math.abs(translationX) > minSwipeDistance && velocityX < minSwipeVelocity)) {
        // Delete task with animation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // Slide all the way left with spring and delete when finished
        Animated.spring(animations.translateX, {
          toValue: -Dimensions.get('window').width,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }).start(() => {
          // Delete the task immediately after slide animation
          deleteTask(id);
        });
      } else {
        // Reset position if not deleted
        Animated.spring(animations.translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 5,
        }).start();
        
        itemBeingSwiped.current = null;
      }
    }
  };

  // Format date to YYYY-MM-DD format
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    // Start animations when component mounts
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
    ]).start();
  }, []);
  
  const openAddTaskPage = () => {
    router.push('/modal/add-task');
  };
  
  const openAITaskGenerator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/modal/ai-task-generator');
  };

  const toggleTask = async (id) => {
    if (!user) return;
    
    const task = user.todos.find(task => task.id === id);
    
    if (task && !task.completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const updatedTodos = user.todos.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    
    const updatedUser = {
      ...user,
      todos: updatedTodos
    };
    
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const deleteTask = async (id) => {
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const updatedTodos = user.todos.filter(task => task.id !== id);
    const updatedUser = {
      ...user,
      todos: updatedTodos
    };
    
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const clearCompleted = async () => {
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const updatedTodos = user.todos.filter(task => 
      !task.completed || task.date !== selectedDate
    );
    
    const updatedUser = {
      ...user,
      todos: updatedTodos
    };
    
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Go to today
  const goToToday = () => {
    Haptics.selectionAsync();
    setSelectedDate(formatDate(new Date()));
  };

  // Open calendar modal
  const openCalendar = () => {
    Haptics.selectionAsync();
    // Navigate to the calendar modal and pass the current selected date and tasks
    const tasksData = JSON.stringify(user?.todos || []);
    router.push({
      pathname: '/modal/calendar-select',
      params: {
        currentDate: selectedDate,
        tasksData,
        from: 'home'
      }
    });
  };

  // Filter tasks by date and active/completed status with null checks
  const filteredTasks = (user?.todos || []).filter(task => {
    if (!task || !task.date) return false;
    if (task.date !== selectedDate) return false;
    
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true; // 'all'
  });
  
  // Sort tasks by time with null checks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!a || !b) return 0;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  // Count tasks stats with null checks
  const activeCount = (user?.todos || []).filter(task => 
    task && !task.completed && task.date === selectedDate
  ).length;
  const completedCount = (user?.todos || []).filter(task => 
    task && task.completed && task.date === selectedDate
  ).length;
  const totalTasksForSelectedDate = activeCount + completedCount;

  // Format date for display (e.g., "March 22, 2023")
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if a date is today
  const isToday = (dateString) => {
    const today = new Date();
    const taskDate = new Date(dateString);
    
    return (
      today.getFullYear() === taskDate.getFullYear() &&
      today.getMonth() === taskDate.getMonth() &&
      today.getDate() === taskDate.getDate()
    );
  };

  // Check if a date is tomorrow
  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = new Date(dateString);
    
    return (
      tomorrow.getFullYear() === taskDate.getFullYear() &&
      tomorrow.getMonth() === taskDate.getMonth() &&
      tomorrow.getDate() === taskDate.getDate()
    );
  };

  // Get a friendly date description
  const getDateLabel = (dateString) => {
    if (isToday(dateString)) {
      return 'Today';
    } else if (isTomorrow(dateString)) {
      return 'Tomorrow';
    } else {
      return formatDateForDisplay(dateString);
    }
  };

  // Add animation values for the popup
  const popupScale = useRef(new Animated.Value(0.95)).current;
  const popupTranslateY = useRef(new Animated.Value(20)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // Add function to animate popup
  const animatePopup = (show) => {
    Animated.parallel([
      Animated.spring(popupScale, {
        toValue: show ? 1 : 0.95,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.spring(popupTranslateY, {
        toValue: show ? 0 : 20,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(popupOpacity, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Update showTaskMenu to include animation
  const handleShowTaskMenu = (show) => {
    setShowTaskMenu(show);
    animatePopup(show);
  };

  const openSettings = () => {
    Haptics.selectionAsync();
    router.push('/modal/settings');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Animated.View 
          className="flex-1 px-4 pt-4"
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Header - More compact */}
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-900 text-2xl font-bold mb-1">My Tasks</Text>
              <View className="flex-row items-center">
                <View className="flex-row items-center mr-3">
                  <View className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                  <Text className="text-gray-500 text-sm">{activeCount} active</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-gray-300 mr-2" />
                  <Text className="text-gray-500 text-sm">{completedCount} completed</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              className="bg-gray-100 h-9 w-9 rounded-full items-center justify-center"
              onPress={openSettings}
            >
              <Ionicons name="person-outline" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Control row: Date + Add Task + AI Generator - More compact */}
          <View className="flex-row mb-3 items-center">
            {/* Date Selector - More compact */}
            <TouchableOpacity 
              className="flex-1 bg-gray-100 py-2 px-4 rounded-xl flex-row justify-between items-center mr-2"
              onPress={openCalendar}
            >
              <View className="flex-row items-center">
                <Ionicons name="calendar" size={18} color="#666" style={{ marginRight: 8 }} />
                <Text className="text-gray-900 font-semibold">
                  {getDateLabel(selectedDate)}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
            
            {/* Add Task Button */}
            <TouchableOpacity 
              className="bg-gray-100 h-9 w-9 rounded-full items-center justify-center mr-2"
              onPress={openAddTaskPage}
            >
              <Ionicons name="add" size={22} color="#333" />
            </TouchableOpacity>
            
            {/* AI Generator Button */}
            <TouchableOpacity 
              className="bg-black h-9 w-9 rounded-full items-center justify-center"
              onPress={openAITaskGenerator}
            >
              <Ionicons name="flash" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Filter Buttons - More compact */}
          <View className="flex-row mb-4 justify-between">
            <TouchableOpacity
              className={`py-1 px-4 rounded-full ${filter === 'all' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('all')}
            >
              <Text className={`text-xs font-medium ${filter === 'all' ? 'text-gray-800' : 'text-gray-500'}`}>
                All ({totalTasksForSelectedDate})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-1 px-4 rounded-full ${filter === 'active' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('active')}
            >
              <Text className={`text-xs font-medium ${filter === 'active' ? 'text-gray-800' : 'text-gray-500'}`}>
                Active ({activeCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-1 px-4 rounded-full ${filter === 'completed' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('completed')}
            >
              <Text className={`text-xs font-medium ${filter === 'completed' ? 'text-gray-800' : 'text-gray-500'}`}>
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>
            {completedCount > 0 && (
              <TouchableOpacity
                className="py-1 px-4 rounded-full bg-transparent"
                onPress={clearCompleted}
              >
                <Text className="text-xs font-medium text-red-500">Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Task List - Enhanced with null checks */}
          <ScrollView className="flex-1">
            {totalTasksForSelectedDate === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="checkbox" size={48} color="#e5e5e5" />
                <Text className="text-gray-400 text-base mt-3">
                  No tasks for {getDateLabel(selectedDate)}
                </Text>
                <TouchableOpacity
                  className="mt-4 py-2.5 px-6 rounded-lg bg-gray-100"
                  onPress={openAITaskGenerator}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="flash-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                    <Text className="text-gray-700 font-medium">Generate Tasks with AI</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              sortedTasks.map((task) => {
                if (!task) return null;
                
                const { translateX, opacity } = getDeleteAnimatedValue(task.id);
                
                return (
                  <PanGestureHandler
                    key={task.id}
                    onHandlerStateChange={(e) => onSwipe(task.id, e)}
                    onGestureEvent={(e) => onSwipe(task.id, e)}
                    activeOffsetX={[-10, 10]}
                  >
                    <Animated.View
                      style={{
                        opacity,
                        transform: [{ translateX }],
                        marginBottom: 10,
                        borderRadius: 12,
                        backgroundColor: 'transparent',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Red delete background */}
                      <View 
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          right: 0,
                          left: 0,
                          backgroundColor: '#ef4444',
                          borderRadius: 12,
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          paddingRight: 24,
                        }}
                      >
                        <Ionicons name="trash" size={22} color="#fff" />
                      </View>
                      
                      {/* Task content */}
                      <Animated.View 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: '#f3f4f6',
                          minHeight: 62,
                          transform: [{ translateX }],
                        }}
                      >
                        <Pressable
                          onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setSelectedTask(task);
                            handleShowTaskMenu(true);
                          }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        >
                          <TouchableOpacity
                            onPress={() => toggleTask(task.id)}
                            style={{ marginRight: 14 }}
                          >
                            <View style={{ 
                              height: 22, 
                              width: 22, 
                              borderRadius: 11, 
                              borderWidth: 1.5, 
                              borderColor: '#d1d5db', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: task.completed ? '#d1d5db' : 'transparent' 
                            }}>
                              {task.completed && (
                                <Ionicons name="checkmark" size={12} color="#fff" />
                              )}
                            </View>
                          </TouchableOpacity>
                          
                          <View style={{ flex: 1 }}>
                            <Text style={{ 
                              color: task.completed ? '#9ca3af' : '#1f2937',
                              textDecorationLine: task.completed ? 'line-through' : 'none',
                              fontSize: 15,
                              marginBottom: 2,
                            }}>
                              {task.text}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: '#9ca3af', fontSize: 13, marginRight: 8 }}>
                                {task.time}
                              </Text>
                              {task.isAIGenerated && (
                                <View style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center',
                                  backgroundColor: '#f3f4f6',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}>
                                  <Ionicons name="flash" size={10} color="#000" style={{ marginRight: 2 }} />
                                  <Text style={{ color: '#4b5563', fontSize: 12 }}>AI</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    </Animated.View>
                  </PanGestureHandler>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Task Options Menu */}
      <Modal
        visible={showTaskMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleShowTaskMenu(false)}
      >
        <BlurView 
          intensity={20} 
          tint="dark"
          style={{ 
            flex: 1, 
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Pressable 
            style={{ 
              flex: 1, 
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onPress={() => handleShowTaskMenu(false)}
          >
            <Animated.View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 16,
              padding: 20,
              width: '80%',
              maxWidth: 300,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              transform: [
                { scale: popupScale },
                { translateY: popupTranslateY }
              ],
              opacity: popupOpacity,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 16,
                color: '#1f2937'
              }}>
                Task Options
              </Text>
              
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6'
                }}
                onPress={() => {
                  Haptics.selectionAsync();
                  handleShowTaskMenu(false);
                  Alert.alert('Edit Task', 'Edit functionality coming soon!');
                }}
              >
                <Ionicons name="pencil" size={20} color="#4b5563" style={{ marginRight: 12 }} />
                <Text style={{ color: '#4b5563', fontSize: 16 }}>Edit Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6'
                }}
                onPress={() => {
                  Haptics.selectionAsync();
                  handleShowTaskMenu(false);
                  toggleTask(selectedTask?.id);
                }}
              >
                <Ionicons 
                  name={selectedTask?.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={20} 
                  color="#4b5563" 
                  style={{ marginRight: 12 }} 
                />
                <Text style={{ color: '#4b5563', fontSize: 16 }}>
                  {selectedTask?.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                }}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  handleShowTaskMenu(false);
                  deleteTask(selectedTask?.id);
                }}
              >
                <Ionicons name="trash" size={20} color="#ef4444" style={{ marginRight: 12 }} />
                <Text style={{ color: '#ef4444', fontSize: 16 }}>Delete Task</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}
