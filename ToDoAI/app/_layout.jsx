import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalProvider } from './context/GlobalProvider';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GlobalProvider>
                <Stack>
                    <Stack.Screen
                        name="index"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="modal"
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        animationDuration: 800,
                    }}
                />
                <Stack.Screen
                    name="main"
                    options={{
                        headerShown: false,
                        gestureEnabled: false,
                    }}
                />
                          <Stack.Screen
                    name="main/TimelineView"
                    options={{
                        headerShown: false,
                        gestureEnabled: false,
                        gestureDirection: 'horizontal',
                        animation: 'slide_from_right',
                        animationEnabled: true,
                        navigationBarHidden: true,
                        gestureResponseDistance: 0, // Prevents back gesture
                        headerBackVisible: false,
                        headerLeft: () => null, // Removes back button
                    }}
                />
            </Stack>

            </GlobalProvider>
        </GestureHandlerRootView>
    )
}
