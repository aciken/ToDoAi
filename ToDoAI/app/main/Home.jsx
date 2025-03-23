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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function Home() {
  const params = useLocalSearchParams();
  
  const [tasks, setTasks] = useState([
    { id: '1', text: 'Plan weekend trip', completed: false, date: '2023-03-22', time: '09:00', timestamp: new Date('2023-03-22T09:00:00').getTime() },
    { id: '2', text: 'Complete project proposal', completed: true, date: '2023-03-22', time: '14:30', timestamp: new Date('2023-03-22T14:30:00').getTime() },
    { id: '3', text: 'Schedule doctor appointment', completed: false, date: '2023-03-23', time: '16:00', timestamp: new Date('2023-03-23T16:00:00').getTime() },
  ]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date())); // Default to today
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
  
  // Handle incoming tasks from the modal
  useEffect(() => {
    if (params.newTask) {
      try {
        const newTaskItem = JSON.parse(params.newTask);
        // Add task to the list - will be sorted by timestamp/date below
        const updatedTasks = [...tasks, newTaskItem];
        setTasks(updatedTasks);
        
        // Select the date of the new task
        setSelectedDate(newTaskItem.date);
        
        // Clear the params to prevent duplicates on re-render
        router.setParams({ newTask: null });
      } catch (error) {
        console.error('Error parsing task data:', error);
      }
    }
    
    // Handle bulk tasks from AI generator
    if (params.newTasks) {
      try {
        const newTaskItems = JSON.parse(params.newTasks);
        // Add tasks to the list
        const updatedTasks = [...tasks, ...newTaskItems];
        setTasks(updatedTasks);
        
        // Select the target date if provided
        if (params.targetDate) {
          setSelectedDate(params.targetDate);
        }
        
        // Clear the params to prevent duplicates on re-render
        router.setParams({ newTasks: null, targetDate: null });
      } catch (error) {
        console.error('Error parsing bulk tasks data:', error);
      }
    }
    
    // Handle date selection from calendar modal
    if (params.selectedDate) {
      setSelectedDate(params.selectedDate);
      router.setParams({ selectedDate: null });
    }
  }, [params.newTask, params.newTasks, params.selectedDate, params.targetDate]);

  const openAddTaskPage = () => {
    router.push('/modal/add-task');
  };
  
  const openAITaskGenerator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/modal/ai-task-generator');
  };

  const toggleTask = (id) => {
    // Find the task to determine if it's being completed or uncompleted
    const task = tasks.find(task => task.id === id);
    
    // Different haptic feedback based on completion
    if (task && !task.completed) {
      // Success feedback when completing a task
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Light impact feedback when uncompleting a task
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setTasks(
      tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id) => {
    // Medium impact feedback when deleting a task
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTasks(tasks.filter(task => task.id !== id));
  };

  const clearCompleted = () => {
    // Heavy impact feedback when clearing all completed tasks
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTasks(tasks.filter(task => !task.completed || task.date !== selectedDate));
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
    const tasksData = JSON.stringify(tasks);
    router.push({
      pathname: '/modal/calendar-select',
      params: {
        currentDate: selectedDate,
        tasksData
      }
    });
  };

  // Filter tasks by date and active/completed status
  const filteredTasks = tasks.filter(task => {
    // First filter by selected date
    if (task.date !== selectedDate) return false;
    
    // Then filter by completion status
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true; // 'all'
  });
  
  // Sort tasks by time
  const sortedTasks = [...filteredTasks].sort((a, b) => a.timestamp - b.timestamp);

  // Count tasks stats
  const activeCount = tasks.filter(task => !task.completed && task.date === selectedDate).length;
  const completedCount = tasks.filter(task => task.completed && task.date === selectedDate).length;
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Animated.View 
          className="flex-1 px-4 pt-10"
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Header - Slightly more compact */}
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-900 text-2xl font-bold">My Tasks</Text>
              <Text className="text-gray-500 text-sm">
                {activeCount} active, {completedCount} completed
              </Text>
            </View>
            <TouchableOpacity 
              className="bg-gray-100 h-9 w-9 rounded-full items-center justify-center"
              onPress={() => Alert.alert('Profile', 'Profile settings would open here')}
            >
              <Ionicons name="person-outline" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Control row: Date + Add Task + AI Generator */}
          <View className="flex-row mb-3 items-center">
            {/* Date Selector */}
            <TouchableOpacity 
              className="flex-1 bg-gray-100 py-2 px-3 rounded-xl flex-row justify-between items-center mr-2"
              onPress={openCalendar}
            >
              <View className="flex-row items-center">
                <Ionicons name="calendar" size={18} color="#666" style={{ marginRight: 6 }} />
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

          {/* Filter Buttons - smaller and more compact */}
          <View className="flex-row mb-4 justify-between">
            <TouchableOpacity
              className={`py-1 px-3 rounded-full ${filter === 'all' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('all')}
            >
              <Text className={`text-xs font-medium ${filter === 'all' ? 'text-gray-800' : 'text-gray-500'}`}>
                All ({totalTasksForSelectedDate})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-1 px-3 rounded-full ${filter === 'active' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('active')}
            >
              <Text className={`text-xs font-medium ${filter === 'active' ? 'text-gray-800' : 'text-gray-500'}`}>
                Active ({activeCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-1 px-3 rounded-full ${filter === 'completed' ? 'bg-gray-200' : 'bg-transparent'}`}
              onPress={() => setFilter('completed')}
            >
              <Text className={`text-xs font-medium ${filter === 'completed' ? 'text-gray-800' : 'text-gray-500'}`}>
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>
            {completedCount > 0 && (
              <TouchableOpacity
                className="py-1 px-3 rounded-full bg-transparent"
                onPress={clearCompleted}
              >
                <Text className="text-xs font-medium text-red-500">Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Task List with date groupings */}
          <ScrollView className="flex-1">
            {totalTasksForSelectedDate === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="checkbox" size={48} color="#e5e5e5" />
                <Text className="text-gray-400 text-base mt-2">
                  No tasks for {getDateLabel(selectedDate)}
                </Text>
                <TouchableOpacity
                  className="mt-3 py-2 px-4 rounded-lg bg-gray-100"
                  onPress={openAITaskGenerator}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="flash-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text className="text-gray-700">Generate Tasks with AI</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              sortedTasks.map((task) => (
                <View 
                  key={task.id}
                  className="flex-row items-center bg-white rounded-xl mb-2 py-2 px-3 border border-gray-100"
                >
                  <TouchableOpacity
                    onPress={() => toggleTask(task.id)}
                    className="mr-3"
                  >
                    <View className={`h-5 w-5 rounded-full border items-center justify-center ${
                      task.completed ? 'border-gray-300 bg-gray-300' : 'border-gray-300 bg-transparent'
                    }`}>
                      {task.completed && (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  <View className="flex-1">
                    <Text className={`${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {task.text}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-400 text-xs mr-2">
                        {task.time}
                      </Text>
                      {task.isAIGenerated && (
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={10} color="#000" style={{ marginRight: 2 }} />
                          <Text className="text-gray-800 text-xs">AI</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => deleteTask(task.id)}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={16} color="#999" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          
          {/* Floating Action Button for AI generator */}
          <TouchableOpacity
            className="absolute bottom-6 right-6 bg-black rounded-full w-14 h-14 items-center justify-center shadow-lg elevation-5"
            style={{ 
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
            onPress={openAITaskGenerator}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="flash" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
